"""
Quotes routes — Déco Touché.

Admin:
  POST /api/v1/admin/quotes
  GET  /api/v1/admin/quotes
  GET  /api/v1/admin/quotes/{quote_id}
  POST /api/v1/admin/quotes/{quote_id}/signature
  GET  /api/v1/admin/quotes/{quote_id}/pdf
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from models import Quote, QuoteCreate, QuoteLine, SignatureData
from services.pdf import generate_quote_pdf


def build_quotes_router(
    *,
    db,
    get_current_user,
    create_audit_log,
    pricing_config: dict,
) -> APIRouter:
    router = APIRouter(tags=["Quotes"])

    @router.post("/admin/quotes", response_model=Quote)
    async def create_quote(
        quote_data: QuoteCreate,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        """Generate a quote for a lead with automatic calculations"""
        lead = await db.leads.find_one({"id": quote_data.lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        contingency = max(10.0, min(20.0, quote_data.contingency_percent))

        lines = []
        subtotal_material = 0
        subtotal_labor = 0
        market_price_total = 0
        total_cost = 0

        for line_data in quote_data.lines:
            line = QuoteLine(**line_data.model_dump())
            line.line_total = line.quantity * line.unit_price

            cost = line.cost_price or (line.unit_price * 0.4)
            line.margin_amount = line.line_total - (line.quantity * cost)
            total_cost += line.quantity * cost
            lines.append(line)

            if line.line_type == "material":
                subtotal_material += line.line_total
                if line.market_price:
                    market_price_total += line.quantity * line.market_price
            elif line.line_type == "labor":
                subtotal_labor += line.line_total

        subtotal_before_contingency = (
            subtotal_material + subtotal_labor + quote_data.delivery_fee + quote_data.urgency_fee
        )
        contingency_amount = subtotal_before_contingency * (contingency / 100)
        subtotal_before_tax = subtotal_before_contingency + contingency_amount

        tps_amount = subtotal_before_tax * pricing_config["taxes"]["tps_rate"]
        tvq_amount = subtotal_before_tax * pricing_config["taxes"]["tvq_rate"]
        total_with_tax = subtotal_before_tax + tps_amount + tvq_amount

        cmgeorges_savings = (
            market_price_total - subtotal_material
            if market_price_total > subtotal_material
            else 0
        )

        gross_margin = subtotal_before_tax - total_cost
        margin_percent = (
            (gross_margin / subtotal_before_tax * 100) if subtotal_before_tax > 0 else 0
        )

        deposit_amount = subtotal_before_tax * pricing_config["payment_terms"]["deposit"]
        milestone_amount = subtotal_before_tax * pricing_config["payment_terms"]["milestone"]
        final_amount = subtotal_before_tax * pricing_config["payment_terms"]["final"]

        quote = Quote(
            lead_id=quote_data.lead_id,
            client_id=lead.get("client_id"),
            valid_until=datetime.now(timezone.utc) + timedelta(days=quote_data.validity_days),
            lines=[l.model_dump() for l in lines],
            subtotal_material=round(subtotal_material, 2),
            subtotal_labor=round(subtotal_labor, 2),
            delivery_fee=round(quote_data.delivery_fee, 2),
            urgency_fee=round(quote_data.urgency_fee, 2),
            subtotal_before_contingency=round(subtotal_before_contingency, 2),
            contingency_percent=contingency,
            contingency_amount=round(contingency_amount, 2),
            subtotal_before_tax=round(subtotal_before_tax, 2),
            tps_amount=round(tps_amount, 2),
            tvq_amount=round(tvq_amount, 2),
            total_with_tax=round(total_with_tax, 2),
            market_price_total=round(market_price_total, 2),
            cmgeorges_savings=round(cmgeorges_savings, 2),
            total_cost=round(total_cost, 2),
            gross_margin=round(gross_margin, 2),
            margin_percent=round(margin_percent, 1),
            deposit_amount=round(deposit_amount, 2),
            milestone_amount=round(milestone_amount, 2),
            final_amount=round(final_amount, 2),
            notes=quote_data.notes,
        )

        doc = quote.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["valid_until"] = doc["valid_until"].isoformat()

        await db.quotes.insert_one(doc)
        await db.leads.update_one({"id": quote_data.lead_id}, {"$set": {"status": "quoted"}})
        await create_audit_log(
            "quote_created",
            "quote",
            quote.id,
            user=user,
            details={"lead_id": quote_data.lead_id, "total": quote.total_with_tax},
            request=request,
        )
        return quote

    @router.get("/admin/quotes", response_model=List[Quote])
    async def get_quotes(
        lead_id: Optional[str] = None,
        client_id: Optional[str] = None,
        user: dict = Depends(get_current_user),
    ):
        query = {}
        if lead_id:
            query["lead_id"] = lead_id
        if client_id:
            query["client_id"] = client_id
        quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
        for q in quotes:
            if isinstance(q.get("created_at"), str):
                q["created_at"] = datetime.fromisoformat(q["created_at"])
            if isinstance(q.get("valid_until"), str):
                q["valid_until"] = datetime.fromisoformat(q["valid_until"])
        return quotes

    @router.get("/admin/quotes/{quote_id}", response_model=Quote)
    async def get_quote(quote_id: str, user: dict = Depends(get_current_user)):
        quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        if isinstance(quote.get("created_at"), str):
            quote["created_at"] = datetime.fromisoformat(quote["created_at"])
        if isinstance(quote.get("valid_until"), str):
            quote["valid_until"] = datetime.fromisoformat(quote["valid_until"])
        return quote

    @router.post("/admin/quotes/{quote_id}/signature")
    async def add_quote_signature(
        quote_id: str,
        sig_data: SignatureData,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        signature_doc = {
            "signature_base64": sig_data.signature_base64,
            "signer_name": sig_data.signer_name,
            "signer_email": sig_data.signer_email,
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "ip_address": request.client.host if request.client else None,
            "signed_by_user_id": user["id"],
        }
        await db.quotes.update_one(
            {"id": quote_id},
            {
                "$set": {
                    "signature": signature_doc,
                    "signed_at": signature_doc["signed_at"],
                    "status": "accepted",
                }
            },
        )
        await create_audit_log(
            "quote_signed",
            "quote",
            quote_id,
            user=user,
            details={"signer_name": sig_data.signer_name},
            request=request,
        )
        return {"message": "Devis signé et accepté", "signed_at": signature_doc["signed_at"]}

    @router.get("/admin/quotes/{quote_id}/pdf")
    async def get_quote_pdf(quote_id: str, user: dict = Depends(get_current_user)):
        quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
        if not quote:
            raise HTTPException(status_code=404, detail="Soumission non trouvée")
        lead = await db.leads.find_one({"id": quote.get("lead_id")}, {"_id": 0})
        client = None
        if quote.get("client_id"):
            client = await db.clients.find_one({"id": quote["client_id"]}, {"_id": 0})
        pdf_buffer = generate_quote_pdf(quote, lead or {}, client)
        filename = f"soumission-cmgeorges-{quote_id[:8]}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    return router

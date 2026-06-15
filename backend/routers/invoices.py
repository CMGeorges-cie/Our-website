"""
Invoices routes — Déco Touché.

Admin CRUD + payments + signature + PDF.
Note: send-email / send-signature-link / deposit-checkout endpoints remain in
server.py for now (they have heavy dependencies on Stripe, signature tokens,
and brand-customized emails).

Admin:
  POST   /api/v1/admin/invoices
  GET    /api/v1/admin/invoices
  GET    /api/v1/admin/invoices/{invoice_id}
  PATCH  /api/v1/admin/invoices/{invoice_id}
  POST   /api/v1/admin/invoices/{invoice_id}/payments
  POST   /api/v1/admin/invoices/{invoice_id}/signature
  DELETE /api/v1/admin/invoices/{invoice_id}/signature
  GET    /api/v1/admin/invoices/{invoice_id}/pdf
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from models import (
    Invoice,
    InvoiceCreate,
    InvoiceLine,
    InvoiceStatus,
    InvoiceUpdate,
    PaymentCreate,
    SignatureData,
)
from services.pdf import generate_invoice_pdf


def build_invoices_router(
    *,
    db,
    get_current_user,
    create_audit_log,
    pricing_config: dict,
    get_next_invoice_number,
    notify_invoice_created,
    notify_payment_received,
) -> APIRouter:
    router = APIRouter(tags=["Invoices"])

    @router.post("/admin/invoices", response_model=Invoice)
    async def create_invoice(
        invoice_data: InvoiceCreate,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        client = await db.clients.find_one({"id": invoice_data.client_id}, {"_id": 0})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        invoice_number = await get_next_invoice_number()

        lines = []
        subtotal = 0
        for line_data in invoice_data.lines:
            line = InvoiceLine(**line_data.model_dump())
            line.line_total = line.quantity * line.unit_price
            subtotal += line.line_total
            lines.append(line)

        tps_amount = subtotal * pricing_config["taxes"]["tps_rate"]
        tvq_amount = subtotal * pricing_config["taxes"]["tvq_rate"]
        total = subtotal + tps_amount + tvq_amount

        if invoice_data.due_date:
            due_date = datetime.fromisoformat(invoice_data.due_date)
        else:
            due_date = datetime.now(timezone.utc) + timedelta(days=30)

        invoice = Invoice(
            invoice_number=invoice_number,
            client_id=invoice_data.client_id,
            quote_id=invoice_data.quote_id,
            project_id=invoice_data.project_id,
            due_date=due_date,
            lines=[l.model_dump() for l in lines],
            subtotal=round(subtotal, 2),
            tps_amount=round(tps_amount, 2),
            tvq_amount=round(tvq_amount, 2),
            total=round(total, 2),
            balance_due=round(total, 2),
            payment_terms=invoice_data.payment_terms,
            notes=invoice_data.notes,
        )

        doc = invoice.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        if doc.get("due_date"):
            doc["due_date"] = doc["due_date"].isoformat()

        await db.invoices.insert_one(doc)
        await create_audit_log(
            "invoice_created",
            "invoice",
            invoice.id,
            user=user,
            details={"client_id": invoice_data.client_id, "total": invoice.total},
            request=request,
        )

        # Background email + notif
        background_tasks = BackgroundTasks()
        invoice_dict = {**doc, "id": invoice.id}
        await notify_invoice_created(invoice_dict, client, background_tasks)
        for task in background_tasks.tasks:
            asyncio.create_task(task.func(*task.args, **task.kwargs))
        return invoice

    @router.get("/admin/invoices", response_model=List[Invoice])
    async def get_invoices(
        client_id: Optional[str] = None,
        status: Optional[InvoiceStatus] = None,
        user: dict = Depends(get_current_user),
    ):
        query = {}
        if client_id:
            query["client_id"] = client_id
        if status:
            query["status"] = status
        invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
        for invoice in invoices:
            if isinstance(invoice.get("created_at"), str):
                invoice["created_at"] = datetime.fromisoformat(invoice["created_at"])
            if isinstance(invoice.get("due_date"), str):
                invoice["due_date"] = datetime.fromisoformat(invoice["due_date"])
        return invoices

    @router.get("/admin/invoices/{invoice_id}", response_model=Invoice)
    async def get_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
        invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if isinstance(invoice.get("created_at"), str):
            invoice["created_at"] = datetime.fromisoformat(invoice["created_at"])
        if isinstance(invoice.get("due_date"), str):
            invoice["due_date"] = datetime.fromisoformat(invoice["due_date"])
        return invoice

    @router.patch("/admin/invoices/{invoice_id}", response_model=Invoice)
    async def update_invoice(
        invoice_id: str,
        update: InvoiceUpdate,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        if update_data.get("due_date"):
            update_data["due_date"] = datetime.fromisoformat(update_data["due_date"]).isoformat()

        result = await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
        await create_audit_log(
            "invoice_updated",
            "invoice",
            invoice_id,
            user=user,
            details=update_data,
            request=request,
        )
        invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if isinstance(invoice.get("created_at"), str):
            invoice["created_at"] = datetime.fromisoformat(invoice["created_at"])
        if isinstance(invoice.get("due_date"), str):
            invoice["due_date"] = datetime.fromisoformat(invoice["due_date"])
        return invoice

    @router.post("/admin/invoices/{invoice_id}/payments", response_model=Invoice)
    async def add_payment(
        invoice_id: str,
        payment: PaymentCreate,
        request: Request,
        background_tasks: BackgroundTasks,
        user: dict = Depends(get_current_user),
    ):
        invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        payment_doc = {
            "id": str(uuid.uuid4()),
            "amount": payment.amount,
            "method": payment.method,
            "notes": payment.notes,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user["id"],
        }

        new_amount_paid = invoice.get("amount_paid", 0) + payment.amount
        new_balance = invoice["total"] - new_amount_paid

        new_status = invoice["status"]
        if new_balance <= 0:
            new_status = "paid"
        elif new_amount_paid > 0:
            new_status = "partial"

        await db.invoices.update_one(
            {"id": invoice_id},
            {
                "$push": {"payments": payment_doc},
                "$set": {
                    "amount_paid": round(new_amount_paid, 2),
                    "balance_due": round(max(0, new_balance), 2),
                    "status": new_status,
                },
            },
        )

        client = None
        if invoice.get("client_id"):
            await db.clients.update_one(
                {"id": invoice["client_id"]}, {"$inc": {"total_revenue": payment.amount}}
            )
            client = await db.clients.find_one({"id": invoice["client_id"]}, {"_id": 0})

        await create_audit_log(
            "payment_added",
            "invoice",
            invoice_id,
            user=user,
            details={"amount": payment.amount, "method": payment.method},
            request=request,
        )

        updated_invoice = {
            **invoice,
            "id": invoice_id,
            "balance_due": round(max(0, new_balance), 2),
            "status": new_status,
        }
        await notify_payment_received(updated_invoice, client, payment.amount, background_tasks)
        return await get_invoice(invoice_id, user)

    @router.post("/admin/invoices/{invoice_id}/signature")
    async def add_invoice_signature(
        invoice_id: str,
        sig_data: SignatureData,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        signature_doc = {
            "signature_base64": sig_data.signature_base64,
            "signer_name": sig_data.signer_name,
            "signer_email": sig_data.signer_email,
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "ip_address": request.client.host if request.client else None,
            "signed_by_user_id": user["id"],
        }
        await db.invoices.update_one(
            {"id": invoice_id},
            {"$set": {"signature": signature_doc, "signed_at": signature_doc["signed_at"]}},
        )
        await create_audit_log(
            "invoice_signed",
            "invoice",
            invoice_id,
            user=user,
            details={"signer_name": sig_data.signer_name},
            request=request,
        )
        return {"message": "Signature enregistrée", "signed_at": signature_doc["signed_at"]}

    @router.delete("/admin/invoices/{invoice_id}/signature")
    async def remove_invoice_signature(
        invoice_id: str,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        await db.invoices.update_one(
            {"id": invoice_id}, {"$unset": {"signature": "", "signed_at": ""}}
        )
        await create_audit_log(
            "invoice_signature_removed", "invoice", invoice_id, user=user, request=request
        )
        return {"message": "Signature supprimée"}

    @router.get("/admin/invoices/{invoice_id}/pdf")
    async def get_invoice_pdf(invoice_id: str, user: dict = Depends(get_current_user)):
        invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Facture non trouvée")
        client = await db.clients.find_one({"id": invoice.get("client_id")}, {"_id": 0})
        if not client:
            client = {"full_name": "Client inconnu", "email": "", "phone": "", "address": ""}
        pdf_buffer = generate_invoice_pdf(invoice, client)
        filename = f"facture-{invoice.get('invoice_number', invoice_id[:8])}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    return router

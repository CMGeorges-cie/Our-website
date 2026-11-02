"""
Public invoice payment router — Déco Touché.

Provides tokenized, no-login payment access for clients. The admin generates a
payment link (POST /api/v1/admin/invoices/{id}/payment-link) which returns a
unique token stored on the invoice. Clients open /facture/payer/{token} in the
frontend, see the invoice, and pay via Stripe Checkout (card, Apple Pay,
Google Pay). Alternate methods (Interac e-Transfer, Wise) are shown as manual
instructions — the admin marks them paid manually once the transfer lands.

Public routes:
  GET  /api/v1/public/invoice/{token}                  # fetch invoice by token
  POST /api/v1/public/invoice/{token}/stripe-checkout  # create Stripe session
  GET  /api/v1/public/invoice/{token}/status/{session} # polling after redirect

Admin routes:
  POST /api/v1/admin/invoices/{invoice_id}/payment-link
  DELETE /api/v1/admin/invoices/{invoice_id}/payment-link
"""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from config.brand import Brand


class StripeCheckoutRequest(BaseModel):
    origin_url: str  # e.g. https://cmgeorges.ca — used to build success/cancel URLs


def build_public_payment_router(
    *,
    db,
    get_current_user,
    create_audit_log,
    stripe_api_key: str,
) -> APIRouter:
    router = APIRouter(tags=["Public Payment"])

    # ============ PUBLIC (no auth, token-based) ============
    @router.get("/public/invoice/{token}")
    async def get_public_invoice(token: str):
        """Fetch invoice + client info by payment token. No login required."""
        invoice = await db.invoices.find_one({"payment_link_token": token}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Lien de paiement invalide ou expiré")
        client = await db.clients.find_one({"id": invoice.get("client_id")}, {"_id": 0})
        if not client:
            client = {"full_name": "Client", "email": "", "phone": ""}
        return {
            "invoice": {
                "id": invoice["id"],
                "invoice_number": invoice.get("invoice_number", ""),
                "created_at": invoice.get("created_at"),
                "due_date": invoice.get("due_date"),
                "lines": invoice.get("lines", []),
                "subtotal": invoice.get("subtotal", 0),
                "tps_amount": invoice.get("tps_amount", 0),
                "tvq_amount": invoice.get("tvq_amount", 0),
                "total": invoice.get("total", 0),
                "amount_paid": invoice.get("amount_paid", 0),
                "balance_due": invoice.get("balance_due", invoice.get("total", 0)),
                "status": invoice.get("status", "draft"),
                "notes": invoice.get("notes", ""),
            },
            "client": {
                "full_name": client.get("full_name"),
                "email": client.get("email"),
                "phone": client.get("phone"),
                "address": client.get("address", ""),
            },
            "company": {
                "name": Brand.NAME,
                "email": Brand.EMAIL,
                "phone": Brand.PHONE_DISPLAY,
                "address": Brand.ADDRESS,
                "tax_gst": Brand.TAX_GST,
                "tax_qst": Brand.TAX_QST,
            },
        }

    @router.post("/public/invoice/{token}/stripe-checkout")
    async def create_public_stripe_checkout(
        token: str, body: StripeCheckoutRequest, request: Request
    ):
        """Create a Stripe checkout session for the invoice's remaining balance."""
        from services.stripe_checkout import (
            CheckoutSessionRequest,
            StripeCheckout,
        )

        invoice = await db.invoices.find_one({"payment_link_token": token}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Lien de paiement invalide")
        balance = float(invoice.get("balance_due", invoice.get("total", 0)) or 0)
        if balance <= 0:
            raise HTTPException(status_code=400, detail="Cette facture est déjà réglée")

        origin = body.origin_url.rstrip("/")
        success_url = f"{origin}/facture/payer/{token}?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin}/facture/payer/{token}?cancelled=1"

        stripe_checkout = StripeCheckout(
            api_key=stripe_api_key,
            webhook_url=f"{str(request.base_url).rstrip('/')}/api/webhook/stripe",
        )
        checkout_req = CheckoutSessionRequest(
            amount=round(balance, 2),
            currency="cad",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "type": "public_invoice_payment",
                "invoice_id": invoice["id"],
                "payment_link_token": token,
            },
        )
        session = await stripe_checkout.create_checkout_session(checkout_req)

        await db.payment_transactions.insert_one(
            {
                "id": str(uuid.uuid4()),
                "session_id": session.session_id,
                "type": "public_invoice_payment",
                "invoice_id": invoice["id"],
                "amount": round(balance, 2),
                "currency": "cad",
                "payment_status": "pending",
                "status": "initiated",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        return {"url": session.url, "session_id": session.session_id, "amount": balance}

    @router.get("/public/invoice/{token}/status/{session_id}")
    async def check_public_payment_status(token: str, session_id: str, request: Request):
        """Poll after Stripe redirect. Records the payment on first 'paid' detection."""
        from services.stripe_checkout import StripeCheckout

        invoice = await db.invoices.find_one({"payment_link_token": token}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Lien invalide")

        stripe_checkout = StripeCheckout(
            api_key=stripe_api_key,
            webhook_url=f"{str(request.base_url).rstrip('/')}/api/webhook/stripe",
        )
        try:
            checkout_status = await stripe_checkout.get_checkout_status(session_id)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Erreur Stripe: {e}")

        tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if (
            tx
            and tx.get("payment_status") != "paid"
            and checkout_status.payment_status == "paid"
        ):
            amount = tx.get("amount", 0)
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "status": "completed"}},
            )
            new_amount_paid = invoice.get("amount_paid", 0) + amount
            new_balance = invoice.get("total", 0) - new_amount_paid
            new_status = "paid" if new_balance <= 0 else "partial"
            payment_doc = {
                "id": str(uuid.uuid4()),
                "amount": amount,
                "method": "stripe",
                "notes": "Paiement Stripe via lien public",
                "stripe_session_id": session_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "public_link",
            }
            await db.invoices.update_one(
                {"id": invoice["id"]},
                {
                    "$push": {"payments": payment_doc},
                    "$set": {
                        "amount_paid": round(new_amount_paid, 2),
                        "balance_due": round(max(0, new_balance), 2),
                        "status": new_status,
                    },
                },
            )
            if invoice.get("client_id"):
                await db.clients.update_one(
                    {"id": invoice["client_id"]}, {"$inc": {"total_revenue": amount}}
                )

        return {
            "payment_status": checkout_status.payment_status,
            "status": checkout_status.status,
        }

    # ============ ADMIN ============
    @router.post("/admin/invoices/{invoice_id}/payment-link")
    async def generate_payment_link(
        invoice_id: str,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        """Generate (or return existing) tokenized payment link. Idempotent."""
        invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Facture non trouvée")

        token = invoice.get("payment_link_token")
        if not token:
            token = secrets.token_urlsafe(24)
            await db.invoices.update_one(
                {"id": invoice_id},
                {
                    "$set": {
                        "payment_link_token": token,
                        "payment_link_created_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )
            await create_audit_log(
                "payment_link_generated",
                "invoice",
                invoice_id,
                user=user,
                request=request,
            )

        # Frontend URL — respect env override for prod vs preview
        return {
            "token": token,
            "url": f"{Brand.SITE_URL.rstrip('/')}/facture/payer/{token}",
            "invoice_number": invoice.get("invoice_number", ""),
            "balance_due": invoice.get("balance_due", invoice.get("total", 0)),
        }

    @router.delete("/admin/invoices/{invoice_id}/payment-link")
    async def revoke_payment_link(
        invoice_id: str,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        result = await db.invoices.update_one(
            {"id": invoice_id},
            {"$unset": {"payment_link_token": "", "payment_link_created_at": ""}},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Facture non trouvée")
        await create_audit_log(
            "payment_link_revoked", "invoice", invoice_id, user=user, request=request
        )
        return {"message": "Lien de paiement révoqué"}

    return router

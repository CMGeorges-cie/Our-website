"""
Public Signature Router for ServiceFlow
Allows clients to sign documents via secure token link (DocuSign style)
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import uuid
import hashlib
import os

router = APIRouter(prefix="/sign", tags=["Public Signature"])

# Get database from main app
def get_db():
    from server import db
    return db

# Secret for token generation
SIGNATURE_SECRET = os.environ.get('JWT_SECRET', 'cmgeorges-secret-key-change-in-production')


def generate_signature_token(document_id: str, document_type: str, expires_hours: int = 72) -> str:
    """Generate a secure token for document signing"""
    timestamp = datetime.now(timezone.utc).isoformat()
    raw = f"{document_id}:{document_type}:{timestamp}:{SIGNATURE_SECRET}"
    token = hashlib.sha256(raw.encode()).hexdigest()[:32]
    return token


def verify_signature_token(token: str, stored_token: str, expires_at: str) -> bool:
    """Verify the signature token is valid and not expired"""
    if token != stored_token:
        return False
    
    if expires_at:
        expires = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires:
            return False
    
    return True


class PublicSignatureData(BaseModel):
    signature_base64: str
    signer_name: str
    signer_email: str = ""


# ==================== PUBLIC ENDPOINTS (No Auth Required) ====================

@router.get("/invoice/{token}")
async def get_invoice_for_signing(token: str, request: Request):
    """Get invoice details for public signing page"""
    db = get_db()
    
    # Find invoice with this token
    invoice = await db.invoices.find_one(
        {"signature_token": token},
        {"_id": 0, "signature_token": 0}  # Don't expose token
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Document non trouvé ou lien expiré")
    
    # Check if already signed
    if invoice.get("signature"):
        raise HTTPException(status_code=400, detail="Ce document a déjà été signé")
    
    # Check expiration
    if invoice.get("signature_token_expires"):
        expires = datetime.fromisoformat(invoice["signature_token_expires"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="Le lien de signature a expiré")
    
    # Get client info
    client = None
    if invoice.get("client_id"):
        client = await db.clients.find_one(
            {"id": invoice["client_id"]},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "phone": 1, "address": 1}
        )
    
    # Get company info
    company = {
        "name": "CMGeorges",
        "tagline": "Services de rénovation & design",
        "address": "Montréal, QC",
        "phone": "(514) 555-0123",
        "email": "info@cmgeorges.com",
        "logo": "https://customer-assets.emergentagent.com/job_57c7ca12-f939-4f77-840a-6e3a2010ce9e/artifacts/xu0d6vd3_ChatGPT%20Image%20Mar%2011%2C%202026%2C%2011_52_31%20PM.png"
    }
    
    return {
        "document_type": "invoice",
        "document": invoice,
        "client": client,
        "company": company
    }


@router.post("/invoice/{token}")
async def sign_invoice_public(token: str, sig_data: PublicSignatureData, request: Request):
    """Sign invoice via public link (no auth required)"""
    db = get_db()
    
    # Find and verify invoice
    invoice = await db.invoices.find_one({"signature_token": token}, {"_id": 0})
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Document non trouvé ou lien expiré")
    
    if invoice.get("signature"):
        raise HTTPException(status_code=400, detail="Ce document a déjà été signé")
    
    # Check expiration
    if invoice.get("signature_token_expires"):
        expires = datetime.fromisoformat(invoice["signature_token_expires"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="Le lien de signature a expiré")
    
    # Save signature
    signature_doc = {
        "signature_base64": sig_data.signature_base64,
        "signer_name": sig_data.signer_name,
        "signer_email": sig_data.signer_email,
        "signed_at": datetime.now(timezone.utc).isoformat(),
        "ip_address": request.client.host if request.client else None,
        "signed_via": "public_link"
    }
    
    await db.invoices.update_one(
        {"id": invoice["id"]},
        {
            "$set": {
                "signature": signature_doc,
                "signed_at": signature_doc["signed_at"],
                "status": "sent" if invoice.get("status") == "draft" else invoice.get("status")
            },
            "$unset": {"signature_token": "", "signature_token_expires": ""}
        }
    )
    
    return {"message": "Signature enregistrée avec succès", "signed_at": signature_doc["signed_at"]}


@router.get("/quote/{token}")
async def get_quote_for_signing(token: str, request: Request):
    """Get quote details for public signing page"""
    db = get_db()
    
    quote = await db.quotes.find_one(
        {"signature_token": token},
        {"_id": 0, "signature_token": 0}
    )
    
    if not quote:
        raise HTTPException(status_code=404, detail="Document non trouvé ou lien expiré")
    
    if quote.get("signature"):
        raise HTTPException(status_code=400, detail="Ce devis a déjà été signé")
    
    if quote.get("signature_token_expires"):
        expires = datetime.fromisoformat(quote["signature_token_expires"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="Le lien de signature a expiré")
    
    client = None
    if quote.get("client_id"):
        client = await db.clients.find_one(
            {"id": quote["client_id"]},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "phone": 1, "address": 1}
        )
    
    company = {
        "name": "CMGeorges",
        "tagline": "Services de rénovation & design",
        "address": "Montréal, QC",
        "phone": "(514) 555-0123",
        "email": "info@cmgeorges.com",
        "logo": "https://customer-assets.emergentagent.com/job_57c7ca12-f939-4f77-840a-6e3a2010ce9e/artifacts/xu0d6vd3_ChatGPT%20Image%20Mar%2011%2C%202026%2C%2011_52_31%20PM.png"
    }
    
    return {
        "document_type": "quote",
        "document": quote,
        "client": client,
        "company": company
    }


@router.post("/quote/{token}")
async def sign_quote_public(token: str, sig_data: PublicSignatureData, request: Request):
    """Sign quote via public link - marks quote as accepted"""
    db = get_db()
    
    quote = await db.quotes.find_one({"signature_token": token}, {"_id": 0})
    
    if not quote:
        raise HTTPException(status_code=404, detail="Document non trouvé ou lien expiré")
    
    if quote.get("signature"):
        raise HTTPException(status_code=400, detail="Ce devis a déjà été signé")
    
    if quote.get("signature_token_expires"):
        expires = datetime.fromisoformat(quote["signature_token_expires"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="Le lien de signature a expiré")
    
    signature_doc = {
        "signature_base64": sig_data.signature_base64,
        "signer_name": sig_data.signer_name,
        "signer_email": sig_data.signer_email,
        "signed_at": datetime.now(timezone.utc).isoformat(),
        "ip_address": request.client.host if request.client else None,
        "signed_via": "public_link"
    }
    
    await db.quotes.update_one(
        {"id": quote["id"]},
        {
            "$set": {
                "signature": signature_doc,
                "signed_at": signature_doc["signed_at"],
                "status": "accepted"
            },
            "$unset": {"signature_token": "", "signature_token_expires": ""}
        }
    )
    
    return {"message": "Devis signé et accepté!", "signed_at": signature_doc["signed_at"]}

"""
Contact form route — Déco Touché.

Public:
  POST /api/v1/contact
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from models import ContactForm

logger = logging.getLogger(__name__)


def build_contact_router(
    *,
    db,
    verify_recaptcha,
    recaptcha_secret_key: str,
    send_email,
    admin_email: str,
) -> APIRouter:
    router = APIRouter(tags=["Contact"])

    @router.post("/contact")
    async def submit_contact(
        form: ContactForm,
        background_tasks: BackgroundTasks,
        request: Request,
    ):
        if recaptcha_secret_key:
            if not form.recaptcha_token:
                raise HTTPException(
                    status_code=400,
                    detail="reCAPTCHA requis. Veuillez cocher la case « Je ne suis pas un robot ».",
                )
            is_valid = await verify_recaptcha(form.recaptcha_token)
            if not is_valid:
                raise HTTPException(
                    status_code=400,
                    detail="Échec de la vérification reCAPTCHA. Veuillez réessayer.",
                )

        contact_doc = {
            "id": str(uuid.uuid4()),
            "name": form.name,
            "email": form.email,
            "phone": form.phone,
            "subject": form.subject,
            "message": form.message,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "new",
        }
        # Sauvegarde « au mieux » : si la base de données est injoignable,
        # le message ne doit jamais être perdu — le courriel ci-dessous
        # devient la trace, et le visiteur reçoit quand même son succès.
        try:
            await asyncio.wait_for(db.contact_messages.insert_one(contact_doc), timeout=6)
        except Exception as exc:
            logger.warning("Contact: sauvegarde BD échouée (%s) — courriel seul", exc)

        html_content = f"""
        <h2>Nouveau message de contact</h2>
        <p><strong>De:</strong> {form.name} ({form.email})</p>
        <p><strong>Téléphone:</strong> {form.phone or 'Non fourni'}</p>
        <p><strong>Sujet:</strong> {form.subject}</p>
        <p><strong>Message:</strong></p>
        <p>{form.message}</p>
        """
        background_tasks.add_task(
            send_email,
            admin_email,
            f"Contact Déco Touché: {form.subject}",
            html_content,
        )
        return {"message": "Message envoyé avec succès"}

    return router

"""Site settings (single document): payment terms, reviews, trust badges — editable from admin."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

SETTINGS_ID = "main"


class PaymentStep(BaseModel):
    percent: float = Field(ge=0, le=100)
    label: str


class PaymentTerms(BaseModel):
    steps: List[PaymentStep]
    small_projects_note: str = ""


class Review(BaseModel):
    name: str
    city: str = ""
    text: str
    rating: int = Field(default=5, ge=1, le=5)


class ReviewsSettings(BaseModel):
    enabled: bool = True
    google_url: str = ""
    google_rating: Optional[float] = None
    google_count: Optional[int] = None
    items: List[Review] = []


class TrustSettings(BaseModel):
    insured: bool = True
    insurance_text: str = "Assurance responsabilité civile active"
    clients_count: str = ""


class SiteSettings(BaseModel):
    payment_terms: Dict[str, PaymentTerms]
    reviews: ReviewsSettings
    trust: TrustSettings


DEFAULTS = SiteSettings(
    payment_terms={
        "default": PaymentTerms(
            steps=[
                PaymentStep(percent=30, label="à la signature du contrat"),
                PaymentStep(percent=30, label="à mi-projet"),
                PaymentStep(percent=40, label="à la fin des travaux"),
            ],
            small_projects_note="Projets de moins de 500 $ : paiement complet à la fin des travaux.",
        ),
        "accent_walls": PaymentTerms(
            steps=[
                PaymentStep(percent=50, label="à la commande"),
                PaymentStep(percent=50, label="à la livraison"),
            ],
        ),
    },
    reviews=ReviewsSettings(
        items=[
            Review(name="Marie-Josée L.", city="Longueuil", text="Excellent travail de peinture dans notre salon et cuisine. L'équipe est ponctuelle, propre et très professionnelle. Le résultat est magnifique!"),
            Review(name="Jean-Pierre B.", city="Montréal", text="Rénovation complète de notre sous-sol. Travail impeccable, respect du budget et des délais. Je recommande sans hésitation."),
            Review(name="Sophie D.", city="Brossard", text="L'assemblage de nos meubles IKEA a été fait en un temps record. Très satisfaite du service, tout est parfaitement monté!"),
        ]
    ),
    trust=TrustSettings(),
)


def build_site_settings_router(db, require_admin) -> APIRouter:
    router = APIRouter()

    async def _get() -> dict:
        doc = await db.site_settings.find_one({"id": SETTINGS_ID}, {"_id": 0, "id": 0, "updated_at": 0, "updated_by": 0})
        merged = DEFAULTS.model_dump()
        if doc:
            merged.update(doc)
        return SiteSettings(**merged).model_dump()

    @router.get("/site-settings")
    async def get_public_settings():
        return await _get()

    @router.get("/admin/site-settings")
    async def get_admin_settings(user: dict = Depends(require_admin)):
        return await _get()

    @router.put("/admin/site-settings")
    async def update_settings(body: SiteSettings, user: dict = Depends(require_admin)):
        if "default" not in body.payment_terms:
            raise HTTPException(status_code=400, detail="La règle de paiement par défaut est requise")
        for key, terms in body.payment_terms.items():
            if terms.steps and round(sum(s.percent for s in terms.steps), 2) != 100:
                raise HTTPException(status_code=400, detail=f"Les étapes « {key} » doivent totaliser 100 %")
        await db.site_settings.update_one(
            {"id": SETTINGS_ID},
            {"$set": {**body.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user["id"]}},
            upsert=True,
        )
        return await _get()

    return router

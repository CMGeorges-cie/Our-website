"""
Idempotent portfolio migration.

Goal: ensure the production database has the curated Déco Touché portfolio
projects with Cloudflare R2 CDN URLs (persistent, fast, free egress).

This runs once on backend startup. If the canonical project IDs already exist
with the expected images, this is a no-op.
"""

import os
import logging
from typing import List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# R2 CDN base — same URL as in /app/backend/.env (R2_PUBLIC_BASE_URL).
# Photos live at <CDN>/portfolio/<filename>.jpg
_R2_CDN = (os.environ.get("R2_PUBLIC_BASE_URL")
           or "https://pub-40063a7125904273b06a01082b683917.r2.dev").rstrip("/")


def _r2(name: str) -> str:
    """Build a CDN URL for a portfolio photo filename."""
    return f"{_R2_CDN}/portfolio/{name}"


# Canonical portfolio state — the only source of truth.
# Each item has a stable id so we can upsert idempotently.
CANONICAL_PORTFOLIO = [
    {
        "id": "porte-moulures-2026",
        "title": "Porte intérieure — Réparation de moulure",
        "description": "Réparation complète des moulures et plinthes autour d'une porte intérieure. La moulure d'origine était abîmée; refaite à neuf et peinte pour un fini propre.",
        "service_type": "manual",
        "category": "portfolio",
        "images": [
            _r2("projet_porte_moulures_pendant.jpg"),
            _r2("projet_porte_moulures_avant.jpg"),
            _r2("projet_porte_moulures_apres.jpg"),
        ],
        "image_url": _r2("projet_porte_moulures_apres.jpg"),
        "before_image_url": _r2("projet_porte_moulures_avant.jpg"),
    },
    {
        "id": "peinture-mur-jaune-blanc-2026",
        "title": "Peinture intérieure — Mur jaune transformé en blanc",
        "description": "Transformation complète d'une pièce : mur jaune et sombre repeint en blanc propre et lumineux. Préparation, deux couches, finition impeccable.",
        "service_type": "manual",
        "category": "portfolio",
        "images": [
            _r2("projet_peinture_chantier_1.jpg"),
            _r2("projet_peinture_chantier_2.jpg"),
            _r2("projet_peinture_avant_jaune.jpg"),
            _r2("projet_peinture_apres_blanc.jpg"),
        ],
        "image_url": _r2("projet_peinture_apres_blanc.jpg"),
        "before_image_url": _r2("projet_peinture_avant_jaune.jpg"),
    },
    {
        "id": "gypse-peinture-mur-2026",
        "title": "Réparation de gypse + peinture — Mur intérieur",
        "description": "Réparation complète d'un mur endommagé : ouverture du gyproc abîmé, vérification de l'isolation, pose d'un nouveau panneau, joints, sablage, puis peinture finale pour un fini propre et lumineux.",
        "service_type": "manual",
        "category": "portfolio",
        "images": [
            _r2("projet_gypse_avant.jpg"),
            _r2("projet_gypse_apres.jpg"),
            _r2("project_peinture_placard.jpg"),
        ],
        "image_url": _r2("project_peinture_placard.jpg"),
        "before_image_url": _r2("projet_gypse_avant.jpg"),
    },
    {
        "id": "robinet-cuisine-2026",
        "title": "Remplacement de robinet de cuisine",
        "description": "Robinet de cuisine sans eau chaude ni pression — état trop dégradé pour réparation. Remplacement complet par un robinet chrome moderne avec pulvérisateur extractible.",
        "service_type": "manual",
        "category": "portfolio",
        "images": [
            _r2("projet_robinet_vue.jpg"),
            _r2("projet_robinet_avant.jpg"),
            _r2("projet_robinet_apres.jpg"),
        ],
        "image_url": _r2("projet_robinet_apres.jpg"),
        "before_image_url": _r2("projet_robinet_avant.jpg"),
    },
    {
        "id": "renovation-chambre-lit-2026",
        "title": "Rénovation chambre - Installation lit et plancher",
        "description": "Installation complète d'un lit et pose d'un nouveau plancher dans une chambre rénovée.",
        "service_type": "manual",
        "category": "portfolio",
        "images": [
            _r2("project_chambre_lit.jpg"),
        ],
        "image_url": _r2("project_chambre_lit.jpg"),
        "before_image_url": None,
    },
    {
        "id": "comptoir-cuisine-2026",
        "title": "Changement de comptoir de cuisine",
        "description": "Remplacement complet d'un comptoir de cuisine : démontage de l'ancien comptoir, préparation des armoires, pose du nouveau comptoir laminé avec finition impeccable, installation de l'évier en stainless et raccordement du robinet. Résultat propre, moderne et durable.",
        "service_type": "manual",
        "category": "portfolio",
        "images": [
            _r2("projet_comptoir_cuisine_img_5247.jpg"),
            _r2("projet_comptoir_cuisine_img_5243.jpg"),
            _r2("projet_comptoir_cuisine_img_5239.jpg"),
            _r2("projet_comptoir_cuisine_img_5240.jpg"),
            _r2("projet_comptoir_cuisine_img_5249.jpg"),
        ],
        "image_url": _r2("projet_comptoir_cuisine_img_5249.jpg"),
        "before_image_url": _r2("projet_comptoir_cuisine_img_5240.jpg"),
    },
    {
        "id": "tv-murale-2026",
        "title": "Installation TV murale",
        "description": "Installation d'un téléviseur Samsung sur un mur de salon : repérage des montants, fixation du support, pose sécuritaire et nivelée du téléviseur, raccordement et configuration. Résultat propre, alignement parfait, câblage soigné.",
        "service_type": "manual",
        "category": "portfolio",
        "images": [
            _r2("projet_tv_murale_img_5520.jpg"),
            _r2("projet_tv_murale_img_5518.jpg"),
            _r2("projet_tv_murale_img_5525.jpg"),
        ],
        "image_url": _r2("projet_tv_murale_img_5525.jpg"),
        "before_image_url": _r2("projet_tv_murale_img_5518.jpg"),
    },
]


def _has_broken_or_missing_data(items: List[dict]) -> bool:
    """Detect if the current DB state is broken (preview URLs, local paths) or outdated."""
    if not items:
        return True
    canonical_ids = {p["id"] for p in CANONICAL_PORTFOLIO}
    canonical_titles = {p["title"] for p in CANONICAL_PORTFOLIO}
    by_id = {p["id"]: p for p in CANONICAL_PORTFOLIO}

    existing_ids = set()
    for it in items:
        existing_ids.add(it.get("id"))
        url = (it.get("image_url") or "")
        # Broken: legacy preview URLs
        if "serviceflow-preview" in url or "preview.emergentagent.com" in url:
            return True
        # Broken: still pointing to local /portfolio/ instead of R2 CDN
        if url.startswith("/portfolio/"):
            return True
        # Outdated: count of images mismatches canonical (e.g., new photo added)
        canon = by_id.get(it.get("id"))
        if canon and len(it.get("images") or []) != len(canon["images"]):
            return True
        # Legacy items not in canonical list
        title = it.get("title", "")
        if title and title not in canonical_titles and it.get("id") not in canonical_ids:
            return True
    # Missing canonical items
    if canonical_ids - existing_ids:
        return True
    return False


async def run_portfolio_migration(db) -> Optional[dict]:
    """
    Reconcile portfolio_media collection with CANONICAL_PORTFOLIO.

    Safe to run on every startup. If state is already correct, this is a no-op.
    """
    try:
        existing = await db.portfolio_media.find({}, {"_id": 0}).to_list(length=1000)
    except Exception as e:
        logger.warning(f"portfolio migration: could not read collection: {e}")
        return None

    if not _has_broken_or_missing_data(existing):
        logger.info(f"portfolio migration: collection is healthy ({len(existing)} items), skipping")
        return {"status": "skipped", "reason": "healthy", "items": len(existing)}

    logger.warning(
        f"portfolio migration: detected broken/outdated state with {len(existing)} items, "
        f"reconciling with canonical {len(CANONICAL_PORTFOLIO)} items"
    )

    # Wipe & rebuild — safe because portfolio is curated content owned by us
    await db.portfolio_media.delete_many({})

    now = datetime.now(timezone.utc)
    docs = []
    for p in CANONICAL_PORTFOLIO:
        doc = {**p, "created_at": now}
        docs.append(doc)

    if docs:
        await db.portfolio_media.insert_many(docs)

    logger.info(f"portfolio migration: rebuilt collection with {len(docs)} items")
    return {"status": "rebuilt", "items": len(docs)}

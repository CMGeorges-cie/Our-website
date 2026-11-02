"""
AI-assisted drafting for Quotes and Invoices — Déco Touché.

Uses Claude Sonnet 4.5 via a configurable LLM key (LLM_API_KEY). Fonction
OPTIONNELLE : sans clé configurée, les brouillons IA se désactivent proprement
(HTTP 503 sur ces deux routes seulement) et le reste du CRM n'est pas affecté.
Returns JSON-parseable, structured drafts that the admin can review, edit, and persist.

Endpoints (registered under /api/v1):
  POST /ai/draft-quote     { lead_id?, prompt?, extra_context? }
  POST /ai/draft-invoice   { client_id?, quote_id?, prompt?, extra_context? }
"""

from __future__ import annotations

import json
import logging
import os
import re
import uuid
from typing import Optional, List, Literal

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Clé LLM optionnelle : LLM_API_KEY est la variable canonique depuis la
# migration; EMERGENT_LLM_KEY reste lue en repli (ancien environnement Emergent).
LLM_API_KEY = os.environ.get("LLM_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5-20250929")

SYSTEM_PROMPT_QUOTE = """Tu es un assistant expert pour Déco Touché, entreprise québécoise de rénovation, peinture, entretien général, installation de mobilier et démolition légère (région de Montréal et Rive-Sud).

Ton rôle : générer un brouillon de devis professionnel et réaliste, en français du Québec, prêt à être édité par l'administrateur.

Règles strictes :
1. Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans préambule.
2. Schéma JSON exact :
{
  "summary": "Résumé client professionnel en 2-3 phrases courtes décrivant le projet et le résultat attendu.",
  "lines": [
    {
      "description": "Description claire de l'item ou prestation",
      "quantity": 1,
      "unit_price": 250.00,
      "line_type": "labor"
    }
  ],
  "contingency_percent": 15,
  "notes": "Notes internes ou conditions particulières (transport, accès, matériaux, garantie). Court."
}
3. line_type doit être l'une des valeurs : "labor", "material", "delivery", "other".
4. Les prix sont en CAD, TPS et TVQ NON incluses (elles sont ajoutées automatiquement).
5. Utilise des tarifs réalistes selon le marché québécois 2026 :
   - Peinture intérieure : 2.50-4$/pi² (main-d'œuvre seulement)
   - Plancher flottant pose : 3.80-5$/pi²
   - Moulures : 5-8$/pi linéaire
   - Réparation gyproc : 150-300$ par ouverture
   - Visite d'entretien minimum : 140$ (2h)
   - Assemblage mobilier IKEA/PAX : 75-250$ selon complexité
   - Installation TV murale : 120-220$
   - Démolition légère : 4-9$/pi²
6. Si l'information manque, fais une estimation prudente et mentionne-le dans "notes".
7. Maximum 8 lignes. Sois concis et professionnel.
8. La provision (contingency) est typiquement 10-15% pour projets simples, 15-20% si incertitudes."""

SYSTEM_PROMPT_INVOICE = """Tu es un assistant expert pour Déco Touché, entreprise québécoise de rénovation, peinture et entretien.

Ton rôle : générer un brouillon de facture professionnel en français du Québec.

Règles strictes :
1. Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans préambule.
2. Schéma JSON exact :
{
  "lines": [
    {
      "description": "Description claire de la prestation",
      "quantity": 1,
      "unit_price": 250.00,
      "line_type": "service"
    }
  ],
  "notes": "Mention de remerciement, modalités de paiement, ou détails du chantier. Court.",
  "payment_terms": "Net 30"
}
3. line_type doit être l'une des valeurs : "service", "material", "delivery", "other".
4. Les prix sont en CAD, TPS et TVQ NON incluses.
5. Si une référence de devis ou de projet est fournie, reprends ses lignes fidèlement avec une formulation plus orientée "facturation" (passé / réalisé).
6. Maximum 10 lignes. Sois précis et professionnel."""


# ---- Pydantic models --------------------------------------------------------

class QuoteDraftRequest(BaseModel):
    lead_id: Optional[str] = None
    prompt: Optional[str] = Field(default=None, max_length=4000)
    extra_context: Optional[str] = Field(default=None, max_length=2000)


class InvoiceDraftRequest(BaseModel):
    client_id: Optional[str] = None
    quote_id: Optional[str] = None
    project_id: Optional[str] = None
    prompt: Optional[str] = Field(default=None, max_length=4000)
    extra_context: Optional[str] = Field(default=None, max_length=2000)


class AIQuoteLine(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float
    line_type: Literal["labor", "material", "delivery", "other"] = "labor"


class AIQuoteDraft(BaseModel):
    summary: str
    lines: List[AIQuoteLine]
    contingency_percent: float = 15.0
    notes: str = ""


class AIInvoiceLine(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float
    line_type: Literal["service", "material", "delivery", "other"] = "service"


class AIInvoiceDraft(BaseModel):
    lines: List[AIInvoiceLine]
    notes: str = ""
    payment_terms: str = "Net 30"


# ---- Helpers ----------------------------------------------------------------

def _extract_json(text: str) -> dict:
    """Strip markdown fencing and return the first JSON object found."""
    text = text.strip()
    # Strip ```json ... ``` fencing if present
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    # Fallback: extract first top-level {...}
    if not text.startswith("{"):
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            text = m.group(0)
    return json.loads(text)


async def _call_claude(system_prompt: str, user_text: str) -> dict:
    """Call the configured LLM and parse the JSON response.

    Le transport précédent passait par le package privé Emergent
    (``emergentintegrations``), retiré lors de la migration hors Emergent.
    Aucun fournisseur LLM n'est branché dans la version migrée pour l'instant :
    la fonction se désactive proprement (HTTP 503) — avec ou sans clé — et le
    reste du CRM fonctionne normalement. Le point de branchement futur est ici :
    configurer ``LLM_API_KEY`` puis implémenter l'appel fournisseur choisi.
    """
    if not LLM_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Brouillons IA désactivés (aucune clé LLM configurée : LLM_API_KEY)",
        )
    raise HTTPException(
        status_code=503,
        detail="Brouillons IA non branchés dans la version migrée (fournisseur LLM à configurer)",
    )


def _format_lead_context(lead: dict) -> str:
    """Format a lead document into a short context block for the prompt."""
    if not lead:
        return ""
    parts = [
        f"Nom: {lead.get('full_name') or lead.get('name', '')}",
        f"Email: {lead.get('email', '')}",
        f"Téléphone: {lead.get('phone', '')}",
        f"Service demandé: {lead.get('service_type') or lead.get('service', '')}",
        f"Description du projet: {lead.get('description') or lead.get('message', '')}",
    ]
    if lead.get("city") or lead.get("address"):
        parts.append(f"Adresse: {lead.get('address', '')} {lead.get('city', '')}".strip())
    if lead.get("budget"):
        parts.append(f"Budget indicatif: {lead.get('budget')}")
    if lead.get("photos"):
        parts.append(f"Photos jointes: {len(lead.get('photos', []))} (URLs disponibles côté admin)")
    return "\n".join([p for p in parts if p and not p.endswith(": ")])


def _format_quote_context(quote: dict) -> str:
    if not quote:
        return ""
    out = [f"Devis #{quote.get('id', '')[:8]} créé le {quote.get('created_at', '')}"]
    for ln in quote.get("lines", []) or []:
        out.append(f"- {ln.get('description', '')} | qte: {ln.get('quantity', 1)} | prix: {ln.get('unit_price', 0)}")
    out.append(f"Total avant taxes: {quote.get('subtotal_before_tax', 0)} CAD")
    if quote.get("notes"):
        out.append(f"Notes devis: {quote.get('notes')}")
    return "\n".join(out)


# ---- Router factory ---------------------------------------------------------

AI_HOURLY_LIMIT = 40


def build_ai_drafts_router(db, get_current_user) -> APIRouter:
    router = APIRouter(prefix="/ai", tags=["AI Drafts"])

    async def _check_quota(user: dict):
        now = datetime.now(timezone.utc)
        used = await db.ai_usage.count_documents(
            {"user_id": user["id"], "at": {"$gte": (now - timedelta(hours=1)).isoformat()}}
        )
        if used >= AI_HOURLY_LIMIT:
            raise HTTPException(status_code=429, detail="Limite de brouillons IA atteinte (40/heure). Réessayez plus tard.")
        await db.ai_usage.insert_one({"user_id": user["id"], "at": now.isoformat()})

    @router.post("/draft-quote", response_model=AIQuoteDraft)
    async def draft_quote(body: QuoteDraftRequest, user: dict = Depends(get_current_user)):
        await _check_quota(user)
        # Build context from lead if provided
        context_block = ""
        if body.lead_id:
            lead = await db.leads.find_one({"id": body.lead_id}, {"_id": 0})
            if lead:
                context_block += "CONTEXTE LEAD :\n" + _format_lead_context(lead) + "\n\n"

        if body.extra_context:
            context_block += f"CONTEXTE ADDITIONNEL :\n{body.extra_context}\n\n"

        if body.prompt:
            context_block += f"INSTRUCTIONS ADMIN :\n{body.prompt}\n"

        if not context_block.strip():
            raise HTTPException(status_code=400, detail="Fournissez au minimum un lead_id, un prompt ou un extra_context")

        user_text = context_block + "\nGénère le brouillon de devis maintenant (JSON uniquement)."

        data = await _call_claude(SYSTEM_PROMPT_QUOTE, user_text)
        try:
            return AIQuoteDraft(**data)
        except Exception as e:
            logger.error(f"AIQuoteDraft validation failed: {e} | data={data}")
            raise HTTPException(status_code=502, detail="Le LLM a renvoyé un format inattendu")

    @router.post("/draft-invoice", response_model=AIInvoiceDraft)
    async def draft_invoice(body: InvoiceDraftRequest, user: dict = Depends(get_current_user)):
        await _check_quota(user)
        context_block = ""
        if body.quote_id:
            quote = await db.quotes.find_one({"id": body.quote_id}, {"_id": 0})
            if quote:
                context_block += "CONTEXTE DEVIS DE RÉFÉRENCE :\n" + _format_quote_context(quote) + "\n\n"

        if body.client_id:
            client = await db.clients.find_one({"id": body.client_id}, {"_id": 0})
            if client:
                context_block += f"CLIENT : {client.get('full_name', '')} ({client.get('email', '')})\n\n"

        if body.project_id:
            project = await db.projects.find_one({"id": body.project_id}, {"_id": 0})
            if project:
                context_block += f"PROJET : {project.get('title', '')} — {project.get('description', '')}\n\n"

        if body.extra_context:
            context_block += f"CONTEXTE ADDITIONNEL :\n{body.extra_context}\n\n"

        if body.prompt:
            context_block += f"INSTRUCTIONS ADMIN :\n{body.prompt}\n"

        if not context_block.strip():
            raise HTTPException(status_code=400, detail="Fournissez un quote_id, client_id, project_id, prompt ou extra_context")

        user_text = context_block + "\nGénère le brouillon de facture maintenant (JSON uniquement)."

        data = await _call_claude(SYSTEM_PROMPT_INVOICE, user_text)
        try:
            return AIInvoiceDraft(**data)
        except Exception as e:
            logger.error(f"AIInvoiceDraft validation failed: {e} | data={data}")
            raise HTTPException(status_code=502, detail="Le LLM a renvoyé un format inattendu")

    return router

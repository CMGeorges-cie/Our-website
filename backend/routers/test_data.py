"""Admin test-data cleanup: preview then purge test/demo records."""
from __future__ import annotations

from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from services.test_data import LABELS, TEST_FIELDS, test_client_ids, test_lead_ids, test_match

DISPLAY = {
    "service_catalog": "name", "pricing_items": "name", "blog_posts": "title", "policies": "title",
    "social_posts": "title", "clients": "full_name", "leads": "full_name", "projects": "title",
    "discount_codes": "code", "invoices": "invoice_number", "quotes": "id",
}


class MarkRealRequest(BaseModel):
    collection: str
    id: str


class PurgeRequest(BaseModel):
    ids: Dict[str, List[str]]


def build_test_data_router(db, require_admin, create_audit_log) -> APIRouter:
    router = APIRouter()

    async def _candidates() -> Dict[str, list]:
        out: Dict[str, list] = {}
        cids, lids = await test_client_ids(db), await test_lead_ids(db)
        for coll in TEST_FIELDS:
            q = test_match(coll)
            if coll == "clients":
                q = {"id": {"$in": cids}}
            elif coll == "leads":
                q = {"id": {"$in": lids}}
            out[coll] = await db[coll].find(q, {"_id": 0}).to_list(1000)
        out["invoices"] = await db.invoices.find({"client_id": {"$in": cids}}, {"_id": 0}).to_list(1000)
        out["quotes"] = await db.quotes.find({"lead_id": {"$in": lids}}, {"_id": 0}).to_list(1000)
        return out

    @router.get("/admin/test-data")
    async def preview_test_data(user: dict = Depends(require_admin)):
        found = await _candidates()
        return [
            {
                "collection": coll,
                "label": LABELS[coll],
                "items": [{"id": d.get("id"), "label": str(d.get(DISPLAY[coll]) or d.get("id"))} for d in docs],
            }
            for coll, docs in found.items() if docs
        ]

    @router.post("/admin/test-data/mark-real")
    async def mark_real(body: MarkRealRequest, user: dict = Depends(require_admin)):
        if body.collection not in TEST_FIELDS:
            raise HTTPException(status_code=400, detail="Collection non protégeable")
        r = await db[body.collection].update_one({"id": body.id}, {"$set": {"is_real": True}})
        if r.matched_count == 0:
            raise HTTPException(status_code=404, detail="Élément introuvable")
        await create_audit_log("marked_real", body.collection, body.id, user=user)
        return {"success": True}

    @router.post("/admin/test-data/purge")
    async def purge_test_data(body: PurgeRequest, user: dict = Depends(require_admin)):
        found = await _candidates()
        deleted = {}
        for coll, docs in found.items():
            allowed = {d.get("id") for d in docs}
            ids = allowed & set((body.ids or {}).get(coll, []))
            if ids:
                r = await db[coll].delete_many({"id": {"$in": list(ids)}})
                deleted[coll] = r.deleted_count
        await create_audit_log("test_data_purged", "system", "test-data", user=user, details=deleted)
        return {"deleted": deleted, "total": sum(deleted.values())}

    return router

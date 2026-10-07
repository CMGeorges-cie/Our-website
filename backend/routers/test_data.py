"""Admin test-data cleanup: preview then purge test/demo records."""
from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from services.test_data import LABELS, TEST_FIELDS, test_client_ids, test_lead_ids, test_match

DISPLAY = {
    "service_catalog": "name", "pricing_items": "name", "blog_posts": "title", "policies": "title",
    "social_posts": "title", "clients": "full_name", "leads": "full_name", "projects": "title",
    "discount_codes": "code", "invoices": "invoice_number", "quotes": "id",
}


class PurgeRequest(BaseModel):
    ids: Optional[Dict[str, List[str]]] = None  # None = everything detected


def build_test_data_router(db, require_admin, create_audit_log) -> APIRouter:
    router = APIRouter()

    async def _candidates() -> Dict[str, list]:
        out: Dict[str, list] = {}
        for coll in TEST_FIELDS:
            out[coll] = await db[coll].find(test_match(coll), {"_id": 0}).to_list(1000)
        cids, lids = await test_client_ids(db), await test_lead_ids(db)
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

    @router.post("/admin/test-data/purge")
    async def purge_test_data(body: PurgeRequest, user: dict = Depends(require_admin)):
        found = await _candidates()
        deleted = {}
        for coll, docs in found.items():
            allowed = {d.get("id") for d in docs}
            ids = allowed if body.ids is None else allowed & set(body.ids.get(coll, []))
            if ids:
                r = await db[coll].delete_many({"id": {"$in": list(ids)}})
                deleted[coll] = r.deleted_count
        await create_audit_log("test_data_purged", "system", "test-data", user=user, details=deleted)
        return {"deleted": deleted, "total": sum(deleted.values())}

    return router

"""Detection of test / demo records so they can be hidden and purged."""
from __future__ import annotations

TEST_PATTERN = r"(^\s*test[_\s-])|(^\s*test$)|playwright|(^\s*updated title\s*$)|@example\.(com|org|net)|/example(\b|/|$)"

# collection -> fields inspected
TEST_FIELDS: dict[str, list[str]] = {
    "service_catalog": ["name"],
    "pricing_items": ["name"],
    "blog_posts": ["title"],
    "policies": ["title"],
    "social_posts": ["title", "post_url"],
    "clients": ["full_name"],
    "leads": ["full_name"],
    "projects": ["title"],
    "discount_codes": ["code"],
}

LABELS = {
    "service_catalog": "Catalogue de services",
    "pricing_items": "Grille de prix",
    "blog_posts": "Articles de blog",
    "policies": "Politiques",
    "social_posts": "Publications sociales",
    "clients": "Clients",
    "leads": "Leads",
    "projects": "Projets",
    "discount_codes": "Codes rabais",
    "invoices": "Factures (clients de test)",
    "quotes": "Soumissions (leads de test)",
}


def _conds(collection: str) -> list:
    return [{f: {"$regex": TEST_PATTERN, "$options": "i"}} for f in TEST_FIELDS[collection]]


def test_match(collection: str) -> dict:
    """Records that look like tests and were not marked as real."""
    return {"$and": [{"$or": _conds(collection)}, {"is_real": {"$ne": True}}]}


def exclude_test(collection: str) -> dict:
    return {"$and": [{"$or": [{"is_real": True}, {"$nor": _conds(collection)}]}]}


async def test_client_ids(db) -> list[str]:
    """Test-looking clients with no real activity (projects, invoices, quotes, photos)."""
    ids = [c["id"] async for c in db.clients.find(test_match("clients"), {"_id": 0, "id": 1})]
    if not ids:
        return []
    active = set(await db.projects.distinct("client_id", {"client_id": {"$in": ids}}))
    active |= set(await db.invoices.distinct("client_id", {"client_id": {"$in": ids}}))
    active |= set(await db.quotes.distinct("client_id", {"client_id": {"$in": ids}}))
    active |= set(await db.leads.distinct("client_id", {"client_id": {"$in": ids}, "photos.0": {"$exists": True}}))
    return [i for i in ids if i not in active]


async def test_lead_ids(db) -> list[str]:
    """Test-looking leads with no quote, photo or linked client."""
    leads = await db.leads.find(test_match("leads"), {"_id": 0, "id": 1, "photos": 1, "client_id": 1}).to_list(5000)
    ids = [x["id"] for x in leads if not x.get("photos") and not x.get("client_id")]
    if not ids:
        return []
    quoted = set(await db.quotes.distinct("lead_id", {"lead_id": {"$in": ids}}))
    return [i for i in ids if i not in quoted]

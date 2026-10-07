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
    "clients": ["full_name", "email"],
    "leads": ["full_name", "email"],
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


def test_match(collection: str) -> dict:
    return {"$or": [{f: {"$regex": TEST_PATTERN, "$options": "i"}} for f in TEST_FIELDS[collection]]}


def exclude_test(collection: str) -> dict:
    return {"$nor": test_match(collection)["$or"]}


async def test_client_ids(db) -> list[str]:
    return [c["id"] async for c in db.clients.find(test_match("clients"), {"_id": 0, "id": 1})]


async def test_lead_ids(db) -> list[str]:
    return [lead["id"] async for lead in db.leads.find(test_match("leads"), {"_id": 0, "id": 1})]

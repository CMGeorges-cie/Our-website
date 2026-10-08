"""Idempotent data fixes run at startup."""
from __future__ import annotations

CATEGORY_RULES = [
    (r"mur(s)?\s+(d['’]\s*)?accent", "accent_walls"),
    (r"climatiseur|thermopompe|climatisation", "hvac"),
    (r"d[ée]molition", "demolition"),
]


async def run_data_fixes(db) -> dict:
    done = {}
    await db.cron_runs.create_index("created", expireAfterSeconds=7 * 24 * 3600)
    r = await db.projects.update_many(
        {"status": "completed", "progress": {"$ne": 100}}, {"$set": {"progress": 100}}
    )
    done["completed_projects_progress"] = r.modified_count
    for pattern, category in CATEGORY_RULES:
        r = await db.service_catalog.update_many(
            {"name": {"$regex": pattern, "$options": "i"}, "category": {"$in": ["renovation", "maintenance", "other"]}},
            {"$set": {"category": category}},
        )
        done[f"catalog_{category}"] = r.modified_count
    return done

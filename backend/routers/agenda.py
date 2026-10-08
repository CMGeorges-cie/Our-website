"""Agenda: scheduled projects + client next-actions, with cron-driven reminders."""
from __future__ import annotations

import hmac
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel

ActionKind = Literal["call", "sms", "email", "message", "visit", "followup", "other"]


class ActionCreate(BaseModel):
    title: str
    due_at: str
    kind: ActionKind = "followup"
    client_id: Optional[str] = None
    lead_id: Optional[str] = None
    project_id: Optional[str] = None
    notes: str = ""


class ActionUpdate(BaseModel):
    title: Optional[str] = None
    due_at: Optional[str] = None
    kind: Optional[ActionKind] = None
    notes: Optional[str] = None
    done: Optional[bool] = None


def _iso(value: str) -> str:
    try:
        d = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Date invalide")
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.astimezone(timezone.utc).isoformat()


def build_agenda_router(db, get_current_user, create_notification) -> APIRouter:
    router = APIRouter()

    async def _names(ids: set, coll: str) -> dict:
        ids.discard(None)
        if not ids:
            return {}
        return {d["id"]: d["full_name"] async for d in db[coll].find({"id": {"$in": list(ids)}}, {"_id": 0, "id": 1, "full_name": 1})}

    async def _enrich(actions: list) -> list:
        clients = await _names({a.get("client_id") for a in actions}, "clients")
        leads = await _names({a.get("lead_id") for a in actions}, "leads")
        for a in actions:
            a["contact_name"] = clients.get(a.get("client_id")) or leads.get(a.get("lead_id")) or ""
        return actions

    @router.get("/admin/agenda")
    async def get_agenda(start: str, end: str, user: dict = Depends(get_current_user)):
        s, e = _iso(start), _iso(end)
        projects = await db.projects.find(
            {"scheduled_date": {"$gte": s, "$lt": e}, "status": {"$ne": "cancelled"}},
            {"_id": 0, "id": 1, "title": 1, "status": 1, "scheduled_date": 1, "client_id": 1, "estimated_hours": 1},
        ).sort("scheduled_date", 1).to_list(500)
        names = await _names({p.get("client_id") for p in projects}, "clients")
        for p in projects:
            p["client_name"] = names.get(p.get("client_id"), "")
        actions = await db.client_actions.find({"due_at": {"$gte": s, "$lt": e}}, {"_id": 0}).sort("due_at", 1).to_list(500)
        return {"projects": projects, "actions": await _enrich(actions)}

    @router.get("/admin/actions")
    async def list_actions(
        open_only: bool = True,
        client_id: Optional[str] = None,
        lead_id: Optional[str] = None,
        project_id: Optional[str] = None,
        limit: int = 100,
        user: dict = Depends(get_current_user),
    ):
        q: dict = {}
        if open_only:
            q["done"] = False
        for k, v in (("client_id", client_id), ("lead_id", lead_id), ("project_id", project_id)):
            if v:
                q[k] = v
        actions = await db.client_actions.find(q, {"_id": 0}).sort("due_at", 1).to_list(min(limit, 500))
        return await _enrich(actions)

    @router.post("/admin/actions")
    async def create_action(body: ActionCreate, user: dict = Depends(get_current_user)):
        if not (body.client_id or body.lead_id or body.project_id):
            raise HTTPException(status_code=400, detail="Associez l'action à un client, un lead ou un projet")
        doc = {
            **body.model_dump(),
            "id": str(uuid.uuid4()),
            "due_at": _iso(body.due_at),
            "done": False,
            "done_at": None,
            "reminded": False,
            "created_by": user.get("full_name", user.get("email")),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.client_actions.insert_one(doc)
        doc.pop("_id", None)
        return (await _enrich([doc]))[0]

    @router.patch("/admin/actions/{action_id}")
    async def update_action(action_id: str, body: ActionUpdate, user: dict = Depends(get_current_user)):
        patch = body.model_dump(exclude_none=True)
        if "due_at" in patch:
            patch["due_at"] = _iso(patch["due_at"])
            patch["reminded"] = False
        if "done" in patch:
            patch["done_at"] = datetime.now(timezone.utc).isoformat() if patch["done"] else None
        r = await db.client_actions.update_one({"id": action_id}, {"$set": patch})
        if r.matched_count == 0:
            raise HTTPException(status_code=404, detail="Action introuvable")
        doc = await db.client_actions.find_one({"id": action_id}, {"_id": 0})
        return (await _enrich([doc]))[0]

    @router.delete("/admin/actions/{action_id}")
    async def delete_action(action_id: str, user: dict = Depends(get_current_user)):
        r = await db.client_actions.delete_one({"id": action_id})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Action introuvable")
        return {"success": True}

    async def run_reminders() -> dict:
        now = datetime.now(timezone.utc)
        sent = {"actions": 0, "projects": 0}
        soon = (now + timedelta(minutes=60)).isoformat()
        async for a in db.client_actions.find({"done": False, "reminded": False, "due_at": {"$lte": soon}}, {"_id": 0}):
            enriched = (await _enrich([a]))[0]
            who = f" — {enriched['contact_name']}" if enriched["contact_name"] else ""
            entity = ("client", a["client_id"]) if a.get("client_id") else ("lead", a["lead_id"]) if a.get("lead_id") else ("project", a.get("project_id"))
            await create_notification(f"Rappel : {a['title']}{who}", "Action prévue à faire maintenant.", "reminder", entity[0], entity[1])
            await db.client_actions.update_one({"id": a["id"]}, {"$set": {"reminded": True}})
            sent["actions"] += 1
        tomorrow = (now + timedelta(hours=24)).isoformat()
        async for p in db.projects.find(
            {"scheduled_date": {"$gte": now.isoformat(), "$lte": tomorrow}, "status": {"$in": ["pending", "in_progress"]}},
            {"_id": 0, "id": 1, "title": 1, "scheduled_date": 1, "reminder_sent_for": 1},
        ):
            if p.get("reminder_sent_for") == p["scheduled_date"]:
                continue
            await create_notification(f"Chantier demain : {p['title']}", "Chantier prévu dans les prochaines 24 h.", "reminder", "project", p["id"])
            await db.projects.update_one({"id": p["id"]}, {"$set": {"reminder_sent_for": p["scheduled_date"]}})
            sent["projects"] += 1
        return sent

    @router.post("/cron/agenda-reminders")
    async def cron_agenda_reminders(request: Request, background_tasks: BackgroundTasks):
        # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
        secret = os.environ["WEBHOOK_CRON_SECRET"]
        auth = request.headers.get("authorization", "")
        if not auth.startswith("Bearer ") or not hmac.compare_digest(auth[7:], secret):
            raise HTTPException(status_code=401, detail="Unauthorized")
        try:
            envelope = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid body")
        run_id = request.headers.get("x-webhook-id") or (envelope or {}).get("run_id")
        if run_id:
            if await db.cron_runs.find_one({"run_id": run_id}):
                return {"status": "duplicate"}
            await db.cron_runs.insert_one({"run_id": run_id, "at": datetime.now(timezone.utc).isoformat()})
        background_tasks.add_task(run_reminders)
        return {"status": "accepted"}

    return router

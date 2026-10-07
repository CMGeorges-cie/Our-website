"""
Admin Projects router — Déco Touché.

Named `admin_projects` to avoid collision with the pre-existing
`routers/projects.py` used by the mobile / ServiceFlow app.

Admin routes:
  POST   /api/v1/admin/projects
  GET    /api/v1/admin/projects
  GET    /api/v1/admin/projects/{id}
  PATCH  /api/v1/admin/projects/{id}
  DELETE /api/v1/admin/projects/{id}
  POST   /api/v1/admin/projects/{id}/tasks
  PATCH  /api/v1/admin/projects/{id}/tasks/{task_id}
  DELETE /api/v1/admin/projects/{id}/tasks/{task_id}
  POST   /api/v1/admin/projects/{id}/timeline
  GET    /api/v1/admin/projects/{id}/report          (PDF)
  GET    /api/v1/admin/projects/{id}/messages
  POST   /api/v1/admin/projects/{id}/messages
  PATCH  /api/v1/admin/projects/{id}/messages/mark-read
  GET    /api/v1/admin/messages/unread-count
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from io import BytesIO
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response

from config.brand import Brand
from storage import r2 as r2_storage
from models import (
    Project,
    ProjectCreate,
    ProjectMessage,
    ProjectMessageCreate,
    ProjectStatus,
    ProjectTaskCreate,
    ProjectUpdate,
)


def _hydrate_dates(project: dict) -> dict:
    for k in ("created_at", "scheduled_date", "completed_date"):
        if isinstance(project.get(k), str):
            try:
                project[k] = datetime.fromisoformat(project[k])
            except ValueError:
                pass
    return project


def build_admin_projects_router(
    *,
    db,
    get_current_user,
    require_admin,
    create_audit_log,
    notify_project_status,
    send_email,
) -> APIRouter:
    router = APIRouter(tags=["Admin Projects"])

    # ---------- CRUD ----------
    @router.post("/admin/projects", response_model=Project)
    async def create_project(
        project_data: ProjectCreate,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        client = await db.clients.find_one({"id": project_data.client_id}, {"_id": 0})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        scheduled_date = None
        if project_data.scheduled_date:
            scheduled_date = datetime.fromisoformat(project_data.scheduled_date)

        project = Project(
            client_id=project_data.client_id,
            quote_id=project_data.quote_id,
            title=project_data.title,
            description=project_data.description,
            service_type=project_data.service_type,
            scheduled_date=scheduled_date,
            estimated_hours=project_data.estimated_hours,
        )
        doc = project.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        if doc.get("scheduled_date"):
            doc["scheduled_date"] = doc["scheduled_date"].isoformat()
        if doc.get("completed_date"):
            doc["completed_date"] = doc["completed_date"].isoformat()

        await db.projects.insert_one(doc)
        await db.clients.update_one(
            {"id": project_data.client_id}, {"$inc": {"total_projects": 1}}
        )
        await create_audit_log(
            "project_created",
            "project",
            project.id,
            user=user,
            details={"client_id": project_data.client_id},
            request=request,
        )
        return project

    @router.get("/admin/projects", response_model=List[Project])
    async def get_projects(
        client_id: Optional[str] = None,
        status: Optional[ProjectStatus] = None,
        user: dict = Depends(get_current_user),
    ):
        query = {}
        if client_id:
            query["client_id"] = client_id
        if status:
            query["status"] = status
        projects = (
            await db.projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
        )
        return [_hydrate_dates(p) for p in projects]

    @router.get("/admin/projects/{project_id}", response_model=Project)
    async def get_project(project_id: str, user: dict = Depends(get_current_user)):
        project = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return _hydrate_dates(project)

    @router.patch("/admin/projects/{project_id}", response_model=Project)
    async def update_project(
        project_id: str,
        update: ProjectUpdate,
        request: Request,
        background_tasks: BackgroundTasks,
        user: dict = Depends(get_current_user),
    ):
        current = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if not current:
            raise HTTPException(status_code=404, detail="Project not found")

        old_status = current.get("status")
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")

        if update_data.get("scheduled_date"):
            update_data["scheduled_date"] = datetime.fromisoformat(
                update_data["scheduled_date"]
            ).isoformat()
        if update_data.get("completed_date"):
            update_data["completed_date"] = datetime.fromisoformat(
                update_data["completed_date"]
            ).isoformat()

        if update_data.get("status") == "completed":
            update_data["progress"] = 100
            update_data.setdefault("completed_date", current.get("completed_date") or datetime.now(timezone.utc).isoformat())

        result = await db.projects.update_one({"id": project_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Project not found")

        await create_audit_log(
            "project_updated",
            "project",
            project_id,
            user=user,
            details=update_data,
            request=request,
        )
        new_status = update_data.get("status")
        if new_status and new_status != old_status:
            updated = {**current, **update_data, "id": project_id}
            client = None
            if current.get("client_id"):
                client = await db.clients.find_one({"id": current["client_id"]}, {"_id": 0})
            await notify_project_status(
                updated, old_status, new_status, client, background_tasks
            )
        return await get_project(project_id, user)

    @router.delete("/admin/projects/{project_id}")
    async def delete_project(
        project_id: str, request: Request, user: dict = Depends(require_admin)
    ):
        result = await db.projects.delete_one({"id": project_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Projet non trouvé")
        await create_audit_log(
            "project_deleted", "project", project_id, user=user, request=request
        )
        return {"message": "Projet supprimé"}

    # ---------- Photos (R2) ----------
    @router.post("/admin/projects/{project_id}/photos")
    async def upload_project_photos(
        project_id: str,
        files: List[UploadFile] = File(...),
        caption: str = Form(""),
        user: dict = Depends(get_current_user),
    ):
        if not await db.projects.find_one({"id": project_id}, {"_id": 1}):
            raise HTTPException(status_code=404, detail="Projet non trouvé")
        if len(files) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 photos à la fois")
        if not r2_storage.is_configured():
            raise HTTPException(status_code=503, detail="Stockage R2 non configuré")

        added = []
        for f in files:
            content = await f.read()
            if len(content) > 15 * 1024 * 1024:
                raise HTTPException(status_code=400, detail=f"{f.filename} trop volumineux (max 15MB)")
            ctype = f.content_type or "image/jpeg"
            if not ctype.startswith("image/"):
                raise HTTPException(status_code=400, detail=f"Type non supporté: {ctype}")
            ext = (f.filename.rsplit(".", 1)[-1] if f.filename and "." in f.filename else "jpg").lower()
            if ext in ("heic", "heif"):
                import pillow_heif
                from PIL import Image
                pillow_heif.register_heif_opener()
                buf = BytesIO()
                Image.open(BytesIO(content)).convert("RGB").save(buf, "JPEG", quality=85)
                content, ext, ctype = buf.getvalue(), "jpg", "image/jpeg"
            url = r2_storage.upload_bytes(
                content, r2_storage.make_key(f"projects/{project_id}", f"x.{ext}"), content_type=ctype
            )
            added.append({
                "id": str(uuid.uuid4()),
                "url": url,
                "caption": caption,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "uploaded_by": user.get("full_name", user.get("email")),
            })

        await db.projects.update_one(
            {"id": project_id},
            {
                "$push": {
                    "photos": {"$each": added},
                    "timeline": {
                        "id": str(uuid.uuid4()),
                        "event_type": "photo",
                        "description": f"{len(added)} photo(s) ajoutée(s)",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "created_by": user.get("full_name", user.get("email")),
                        "metadata": {},
                    },
                }
            },
        )
        return {"photos": added}

    @router.delete("/admin/projects/{project_id}/photos/{photo_id}")
    async def delete_project_photo(
        project_id: str, photo_id: str, user: dict = Depends(get_current_user)
    ):
        result = await db.projects.update_one(
            {"id": project_id}, {"$pull": {"photos": {"id": photo_id}}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Photo non trouvée")
        return {"success": True}

    # ---------- Tasks ----------
    @router.post("/admin/projects/{project_id}/tasks")
    async def create_project_task(
        project_id: str,
        task: ProjectTaskCreate,
        user: dict = Depends(get_current_user),
    ):
        project = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        tasks = project.get("tasks", [])
        new_task = {
            "id": str(uuid.uuid4()),
            "title": task.title,
            "description": task.description,
            "status": "pending",
            "assigned_to": task.assigned_to,
            "due_date": task.due_date,
            "completed_at": None,
            "order": len(tasks),
        }
        tasks.append(new_task)
        completed = sum(1 for t in tasks if t.get("status") == "completed")
        progress = int((completed / len(tasks)) * 100) if tasks else 0

        timeline = project.get("timeline", [])
        timeline.append({
            "id": str(uuid.uuid4()),
            "event_type": "task_added",
            "description": f"Tâche ajoutée: {task.title}",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.get("full_name", user.get("email")),
            "metadata": {"task_id": new_task["id"]},
        })
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"tasks": tasks, "progress": progress, "timeline": timeline}},
        )
        return {"task": new_task, "progress": progress}

    @router.patch("/admin/projects/{project_id}/tasks/{task_id}")
    async def update_project_task(
        project_id: str,
        task_id: str,
        status: str,
        user: dict = Depends(get_current_user),
    ):
        project = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        tasks = project.get("tasks", [])
        task_found = False
        task_title = ""
        for t in tasks:
            if t.get("id") == task_id:
                t["status"] = status
                task_title = t.get("title", "")
                if status == "completed":
                    t["completed_at"] = datetime.now(timezone.utc).isoformat()
                task_found = True
                break
        if not task_found:
            raise HTTPException(status_code=404, detail="Task not found")

        completed = sum(1 for t in tasks if t.get("status") == "completed")
        progress = int((completed / len(tasks)) * 100) if tasks else 0

        timeline = project.get("timeline", [])
        if status == "completed":
            timeline.append({
                "id": str(uuid.uuid4()),
                "event_type": "task_completed",
                "description": f"Tâche complétée: {task_title}",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": user.get("full_name", user.get("email")),
                "metadata": {"task_id": task_id},
            })

        new_project_status = project.get("status")
        if progress == 100:
            new_project_status = "completed"
        elif progress > 0 and project.get("status") == "pending":
            new_project_status = "in_progress"

        await db.projects.update_one(
            {"id": project_id},
            {
                "$set": {
                    "tasks": tasks,
                    "progress": progress,
                    "timeline": timeline,
                    "status": new_project_status,
                }
            },
        )
        return {"progress": progress, "status": new_project_status}

    @router.delete("/admin/projects/{project_id}/tasks/{task_id}")
    async def delete_project_task(
        project_id: str, task_id: str, user: dict = Depends(get_current_user)
    ):
        project = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        tasks = [t for t in project.get("tasks", []) if t.get("id") != task_id]
        completed = sum(1 for t in tasks if t.get("status") == "completed")
        progress = int((completed / len(tasks)) * 100) if tasks else 0
        await db.projects.update_one(
            {"id": project_id}, {"$set": {"tasks": tasks, "progress": progress}}
        )
        return {"success": True, "progress": progress}

    # ---------- Timeline ----------
    @router.post("/admin/projects/{project_id}/timeline")
    async def add_timeline_event(
        project_id: str,
        event_type: str,
        description: str,
        user: dict = Depends(get_current_user),
    ):
        project = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        timeline = project.get("timeline", [])
        new_event = {
            "id": str(uuid.uuid4()),
            "event_type": event_type,
            "description": description,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.get("full_name", user.get("email")),
            "metadata": {},
        }
        timeline.append(new_event)
        await db.projects.update_one(
            {"id": project_id}, {"$set": {"timeline": timeline}}
        )
        return new_event

    # ---------- Report (PDF) ----------
    @router.get("/admin/projects/{project_id}/report")
    async def generate_project_report(
        project_id: str, user: dict = Depends(get_current_user)
    ):
        from fpdf import FPDF

        project = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        client = None
        if project.get("client_id"):
            client = await db.clients.find_one({"id": project["client_id"]}, {"_id": 0})

        pdf = FPDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)

        pdf.set_font("Helvetica", "B", 20)
        pdf.cell(0, 15, "Rapport d'intervention", ln=True, align="C")
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(
            0, 8, f"Genere le {datetime.now().strftime('%d/%m/%Y a %H:%M')}", ln=True, align="C"
        )
        pdf.ln(10)

        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 10, project.get("title", "Sans titre"), ln=True)
        pdf.set_font("Helvetica", "", 11)
        service_labels = {"manual": "Deco Touche", "furniture": "Mobilier", "tech": "Tech"}
        pdf.cell(
            0,
            7,
            f"Service: {service_labels.get(project.get('service_type', ''), project.get('service_type', ''))}",
            ln=True,
        )
        status_labels = {
            "pending": "En attente",
            "in_progress": "En cours",
            "completed": "Termine",
            "on_hold": "En pause",
        }
        pdf.cell(
            0,
            7,
            f"Statut: {status_labels.get(project.get('status', ''), project.get('status', ''))}",
            ln=True,
        )
        pdf.cell(0, 7, f"Progression: {project.get('progress', 0)}%", ln=True)
        pdf.ln(5)

        if client:
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, "Client", ln=True)
            pdf.set_font("Helvetica", "", 11)
            pdf.cell(0, 7, f"Nom: {client.get('full_name', 'N/A')}", ln=True)
            pdf.cell(0, 7, f"Email: {client.get('email', 'N/A')}", ln=True)
            pdf.cell(0, 7, f"Telephone: {client.get('phone', 'N/A')}", ln=True)
            if client.get("address"):
                pdf.cell(
                    0,
                    7,
                    f"Adresse: {client.get('address', '')}, {client.get('city', '')}",
                    ln=True,
                )
            pdf.ln(5)

        if project.get("description"):
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, "Description", ln=True)
            pdf.set_font("Helvetica", "", 11)
            pdf.multi_cell(0, 7, project.get("description", ""))
            pdf.ln(5)

        tasks = project.get("tasks", [])
        if tasks:
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, f"Taches ({len(tasks)})", ln=True)
            pdf.set_font("Helvetica", "", 10)
            for task in tasks:
                icon = "[X]" if task.get("status") == "completed" else "[ ]"
                pdf.cell(0, 6, f"  {icon} {task.get('title', '')}", ln=True)
            pdf.ln(5)

        timeline = project.get("timeline", [])
        if timeline:
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, "Historique", ln=True)
            pdf.set_font("Helvetica", "", 9)
            for event in sorted(timeline, key=lambda x: x.get("created_at", ""), reverse=True)[:10]:
                date_str = event.get("created_at", "")[:10]
                pdf.cell(0, 5, f"  - [{date_str}] {event.get('description', '')}", ln=True)

        if project.get("notes"):
            pdf.ln(5)
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, "Notes", ln=True)
            pdf.set_font("Helvetica", "", 11)
            pdf.multi_cell(0, 7, project.get("notes", ""))

        pdf.ln(10)
        pdf.set_font("Helvetica", "I", 9)
        pdf.cell(0, 5, f"{Brand.NAME} - {Brand.ADDRESS}", ln=True, align="C")

        pdf_bytes = BytesIO()
        pdf.output(pdf_bytes)
        pdf_bytes.seek(0)

        timeline.append({
            "id": str(uuid.uuid4()),
            "event_type": "report_generated",
            "description": "Rapport d'intervention genere",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.get("full_name", user.get("email")),
            "metadata": {},
        })
        await db.projects.update_one(
            {"id": project_id}, {"$set": {"timeline": timeline}}
        )
        return Response(
            content=pdf_bytes.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=rapport_{project_id[:8]}.pdf"},
        )

    # ---------- Messages ----------
    @router.get("/admin/projects/{project_id}/messages")
    async def get_project_messages(
        project_id: str, user: dict = Depends(get_current_user)
    ):
        project = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return (
            await db.project_messages.find({"project_id": project_id}, {"_id": 0})
            .sort("created_at", 1)
            .to_list(500)
        )

    @router.post("/admin/projects/{project_id}/messages")
    async def send_project_message(
        project_id: str,
        message: ProjectMessageCreate,
        background_tasks: BackgroundTasks,
        user: dict = Depends(get_current_user),
    ):
        project = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        msg = ProjectMessage(
            project_id=project_id,
            sender_type="admin",
            sender_id=user.get("id", ""),
            sender_name=user.get("full_name", user.get("email", "Admin")),
            content=message.content,
            attachments=message.attachments,
        )
        await db.project_messages.insert_one(msg.model_dump())

        timeline = project.get("timeline", [])
        timeline.append({
            "id": str(uuid.uuid4()),
            "event_type": "message_sent",
            "description": f"Message envoyé par {msg.sender_name}",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": msg.sender_name,
            "metadata": {"message_id": msg.id},
        })
        await db.projects.update_one({"id": project_id}, {"$set": {"timeline": timeline}})

        if project.get("client_id"):
            client = await db.clients.find_one({"id": project["client_id"]}, {"_id": 0})
            if client and client.get("email"):
                html = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1a365d;">Nouveau message - {project.get('title', 'Projet')}</h2>
                    <p>Bonjour {client.get('full_name', '')},</p>
                    <p>Vous avez reçu un nouveau message concernant votre projet:</p>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p style="margin: 0; white-space: pre-wrap;">{message.content}</p>
                    </div>
                    <p>Connectez-vous au portail client pour répondre.</p>
                    <p style="color: #666;">L'équipe {Brand.NAME}</p>
                </div>
                """
                background_tasks.add_task(
                    send_email,
                    client["email"],
                    f"{Brand.NAME} - Nouveau message: {project.get('title', 'Projet')}",
                    html,
                )
        return {"id": msg.id, "message": "Message sent successfully"}

    @router.patch("/admin/projects/{project_id}/messages/mark-read")
    async def mark_project_messages_read(
        project_id: str, user: dict = Depends(get_current_user)
    ):
        result = await db.project_messages.update_many(
            {"project_id": project_id, "sender_type": "client", "is_read": False},
            {"$set": {"is_read": True}},
        )
        return {"marked_read": result.modified_count}

    @router.get("/admin/messages/unread-count")
    async def get_unread_messages_count(user: dict = Depends(get_current_user)):
        count = await db.project_messages.count_documents(
            {"sender_type": "client", "is_read": False}
        )
        return {"count": count}

    return router

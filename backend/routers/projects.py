"""
Projects Router for ServiceFlow
Full CRUD operations with multi-tenant isolation
Optimized for both web and mobile clients
"""

from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

from services.database import get_database, TenantRepository
from middleware.tenant import TenantContext, get_tenant_context, require_role
from routers.auth import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])


# ==================== SCHEMAS ====================
class ProjectStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"


class ServiceType(str, Enum):
    MANUAL = "manual"
    FURNITURE = "furniture"
    TECH = "tech"


class ProjectCreate(BaseModel):
    client_id: str
    quote_id: Optional[str] = None
    title: str
    description: str = ""
    service_type: ServiceType
    scheduled_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    address: Optional[str] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    scheduled_date: Optional[str] = None
    completed_date: Optional[str] = None
    actual_hours: Optional[float] = None
    notes: Optional[str] = None
    address: Optional[str] = None
    assigned_technician_id: Optional[str] = None


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None


class MessageCreate(BaseModel):
    content: str
    attachments: List[str] = []


class NoteCreate(BaseModel):
    content: str


# ==================== HELPER FUNCTIONS ====================
def calculate_progress(tasks: List[dict]) -> int:
    """Calculate project progress based on completed tasks"""
    if not tasks:
        return 0
    completed = sum(1 for t in tasks if t.get("status") == "completed")
    return int((completed / len(tasks)) * 100)


def add_timeline_event(project: dict, event_type: str, description: str, user_name: str = None, metadata: dict = None):
    """Add event to project timeline"""
    event = {
        "id": str(uuid.uuid4()),
        "event_type": event_type,
        "description": description,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user_name,
        "metadata": metadata or {}
    }
    if "timeline" not in project:
        project["timeline"] = []
    project["timeline"].append(event)
    return project


# ==================== ENDPOINTS ====================
@router.get("")
async def list_projects(
    status: Optional[ProjectStatus] = None,
    client_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    limit: int = 100,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """List all projects for the current tenant"""
    repo = TenantRepository("projects", tenant_ctx.tenant_id)
    
    query = {}
    if status:
        query["status"] = status.value
    if client_id:
        query["client_id"] = client_id
    if assigned_to:
        query["assigned_technician_id"] = assigned_to
    
    projects = await repo.find_many(
        query=query,
        sort=[("created_at", -1)],
        limit=limit
    )
    
    return projects


@router.get("/my-assignments")
async def get_my_assignments(
    status: Optional[ProjectStatus] = None,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Get projects assigned to the current technician (mobile-optimized)"""
    repo = TenantRepository("projects", tenant_ctx.tenant_id)
    
    query = {"assigned_technician_id": user["id"]}
    if status:
        query["status"] = status.value
    
    projects = await repo.find_many(
        query=query,
        sort=[("scheduled_date", 1)]  # Sort by upcoming date
    )
    
    # Enrich with client info for mobile display
    db = get_database()
    client_ids = list(set(p.get("client_id") for p in projects if p.get("client_id")))
    
    if client_ids:
        clients = await db.clients.find(
            {"id": {"$in": client_ids}, "tenant_id": tenant_ctx.tenant_id},
            {"_id": 0, "id": 1, "full_name": 1, "phone": 1, "address": 1}
        ).to_list(len(client_ids))
        
        client_map = {c["id"]: c for c in clients}
        
        for project in projects:
            client = client_map.get(project.get("client_id"))
            if client:
                project["client_name"] = client.get("full_name")
                project["client_phone"] = client.get("phone")
                project["client_address"] = client.get("address") or project.get("address")
    
    return projects


@router.post("")
async def create_project(
    data: ProjectCreate,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Create a new project"""
    repo = TenantRepository("projects", tenant_ctx.tenant_id)
    db = get_database()
    
    # Verify client exists in same tenant
    client = await db.clients.find_one(
        {"id": data.client_id, "tenant_id": tenant_ctx.tenant_id},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    project = {
        "id": str(uuid.uuid4()),
        "client_id": data.client_id,
        "quote_id": data.quote_id,
        "title": data.title,
        "description": data.description,
        "service_type": data.service_type.value,
        "status": ProjectStatus.PENDING.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "scheduled_date": data.scheduled_date,
        "estimated_hours": data.estimated_hours,
        "address": data.address or client.get("address", ""),
        "tasks": [],
        "photos": [],
        "timeline": [],
        "progress": 0,
        "notes": "",
        "created_by": user["id"]
    }
    
    # Add creation event to timeline
    add_timeline_event(
        project, 
        "project_created", 
        f"Projet créé par {user.get('full_name', 'Admin')}",
        user.get("full_name")
    )
    
    await repo.insert_one(project)
    
    # Update client stats
    await db.clients.update_one(
        {"id": data.client_id, "tenant_id": tenant_ctx.tenant_id},
        {"$inc": {"total_projects": 1}}
    )
    
    project.pop("_id", None)
    return project


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Get a specific project with full details"""
    repo = TenantRepository("projects", tenant_ctx.tenant_id)
    
    project = await repo.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.pop("_id", None)
    
    # Enrich with client info
    db = get_database()
    if project.get("client_id"):
        client = await db.clients.find_one(
            {"id": project["client_id"], "tenant_id": tenant_ctx.tenant_id},
            {"_id": 0}
        )
        if client:
            project["client"] = client
    
    return project


@router.patch("/{project_id}")
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Update project details"""
    repo = TenantRepository("projects", tenant_ctx.tenant_id)
    db = get_database()
    
    project = await repo.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    # Track status change for notifications
    old_status = project.get("status")
    new_status = update_data.get("status")
    
    # Add timeline event for status change
    if new_status and new_status != old_status:
        status_labels = {
            "pending": "En attente",
            "in_progress": "En cours",
            "completed": "Terminé",
            "on_hold": "En pause",
            "cancelled": "Annulé"
        }
        add_timeline_event(
            project,
            "status_change",
            f"Statut changé: {status_labels.get(old_status, old_status)} → {status_labels.get(new_status, new_status)}",
            user.get("full_name"),
            {"old_status": old_status, "new_status": new_status}
        )
        update_data["timeline"] = project["timeline"]
    
    await repo.update_one({"id": project_id}, {"$set": update_data})
    
    # Get updated project
    updated_project = await repo.find_one({"id": project_id})
    if updated_project:
        updated_project.pop("_id", None)
    
    return updated_project


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    user: dict = Depends(require_role("admin")),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Delete a project (admin only)"""
    repo = TenantRepository("projects", tenant_ctx.tenant_id)
    
    project = await repo.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    deleted = await repo.delete_one({"id": project_id})
    
    if deleted:
        # Update client stats
        db = get_database()
        if project.get("client_id"):
            await db.clients.update_one(
                {"id": project["client_id"], "tenant_id": tenant_ctx.tenant_id},
                {"$inc": {"total_projects": -1}}
            )
    
    return {"message": "Project deleted successfully"}


# ==================== TASKS ====================
@router.get("/{project_id}/tasks")
async def get_project_tasks(
    project_id: str,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Get all tasks for a project"""
    repo = TenantRepository("projects", tenant_ctx.tenant_id)
    
    project = await repo.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project.get("tasks", [])


@router.post("/{project_id}/tasks")
async def create_task(
    project_id: str,
    data: TaskCreate,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Add a task to a project"""
    repo = TenantRepository("projects", tenant_ctx.tenant_id)
    db = get_database()
    
    project = await repo.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    task = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "description": data.description,
        "status": "pending",
        "assigned_to": data.assigned_to,
        "due_date": data.due_date,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "order": len(project.get("tasks", []))
    }
    
    tasks = project.get("tasks", [])
    tasks.append(task)
    
    # Recalculate progress
    progress = calculate_progress(tasks)
    
    # Add timeline event
    add_timeline_event(
        project,
        "task_added",
        f"Tâche ajoutée: {data.title}",
        user.get("full_name")
    )
    
    await db.projects.update_one(
        {"id": project_id, "tenant_id": tenant_ctx.tenant_id},
        {
            "$set": {
                "tasks": tasks,
                "progress": progress,
                "timeline": project["timeline"]
            }
        }
    )
    
    return task


@router.patch("/{project_id}/tasks/{task_id}")
async def update_task(
    project_id: str,
    task_id: str,
    data: TaskUpdate,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Update a task (including toggling status)"""
    repo = TenantRepository("projects", tenant_ctx.tenant_id)
    db = get_database()
    
    project = await repo.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = project.get("tasks", [])
    task_index = next((i for i, t in enumerate(tasks) if t["id"] == task_id), None)
    
    if task_index is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = tasks[task_index]
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Track completion
    old_status = task.get("status")
    new_status = update_data.get("status")
    
    task.update(update_data)
    
    if new_status == "completed" and old_status != "completed":
        task["completed_at"] = datetime.now(timezone.utc).isoformat()
        add_timeline_event(
            project,
            "task_completed",
            f"Tâche complétée: {task['title']}",
            user.get("full_name")
        )
    
    tasks[task_index] = task
    
    # Recalculate progress
    progress = calculate_progress(tasks)
    
    # Auto-update project status based on progress
    project_status = project.get("status")
    if progress == 100 and project_status != "completed":
        project_status = "completed"
        add_timeline_event(
            project,
            "status_change",
            "Projet automatiquement marqué comme terminé (100% des tâches complétées)",
            "Système"
        )
    elif progress > 0 and project_status == "pending":
        project_status = "in_progress"
    
    await db.projects.update_one(
        {"id": project_id, "tenant_id": tenant_ctx.tenant_id},
        {
            "$set": {
                "tasks": tasks,
                "progress": progress,
                "status": project_status,
                "timeline": project["timeline"]
            }
        }
    )
    
    return {"task": task, "progress": progress, "project_status": project_status}


@router.delete("/{project_id}/tasks/{task_id}")
async def delete_task(
    project_id: str,
    task_id: str,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Delete a task from a project"""
    repo = TenantRepository("projects", tenant_ctx.tenant_id)
    db = get_database()
    
    project = await repo.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = project.get("tasks", [])
    task = next((t for t in tasks if t["id"] == task_id), None)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    tasks = [t for t in tasks if t["id"] != task_id]
    progress = calculate_progress(tasks)
    
    await db.projects.update_one(
        {"id": project_id, "tenant_id": tenant_ctx.tenant_id},
        {"$set": {"tasks": tasks, "progress": progress}}
    )
    
    return {"message": "Task deleted", "progress": progress}


# ==================== MESSAGES ====================
@router.get("/{project_id}/messages")
async def get_project_messages(
    project_id: str,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Get all messages for a project"""
    db = get_database()
    
    # Verify project exists and belongs to tenant
    project = await db.projects.find_one(
        {"id": project_id, "tenant_id": tenant_ctx.tenant_id},
        {"_id": 0, "id": 1}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    messages = await db.project_messages.find(
        {"project_id": project_id, "tenant_id": tenant_ctx.tenant_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    return messages


@router.post("/{project_id}/messages")
async def send_message(
    project_id: str,
    data: MessageCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Send a message on a project"""
    db = get_database()
    
    # Verify project exists
    project = await db.projects.find_one(
        {"id": project_id, "tenant_id": tenant_ctx.tenant_id},
        {"_id": 0}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    message = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "tenant_id": tenant_ctx.tenant_id,
        "sender_type": "admin" if user.get("role") in ["admin", "staff"] else "client",
        "sender_id": user["id"],
        "sender_name": user.get("full_name", user.get("email", "Unknown")),
        "content": data.content,
        "attachments": data.attachments,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.project_messages.insert_one(message)
    
    # Add timeline event
    await db.projects.update_one(
        {"id": project_id, "tenant_id": tenant_ctx.tenant_id},
        {
            "$push": {
                "timeline": {
                    "id": str(uuid.uuid4()),
                    "event_type": "message_sent",
                    "description": f"Message envoyé par {message['sender_name']}",
                    "created_at": message["created_at"],
                    "created_by": message["sender_name"]
                }
            }
        }
    )
    
    # TODO: Add email notification in background_tasks
    message.pop("_id", None)
    return message


@router.patch("/{project_id}/messages/mark-read")
async def mark_messages_read(
    project_id: str,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Mark all messages as read for current user"""
    db = get_database()
    
    # Mark messages from other sender types as read
    sender_type = "admin" if user.get("role") in ["admin", "staff"] else "client"
    opposite_type = "client" if sender_type == "admin" else "admin"
    
    result = await db.project_messages.update_many(
        {
            "project_id": project_id,
            "tenant_id": tenant_ctx.tenant_id,
            "sender_type": opposite_type,
            "is_read": False
        },
        {"$set": {"is_read": True}}
    )
    
    return {"marked_read": result.modified_count}


# ==================== NOTES ====================
@router.post("/{project_id}/notes")
async def add_note(
    project_id: str,
    data: NoteCreate,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Add a note to project timeline"""
    db = get_database()
    
    project = await db.projects.find_one(
        {"id": project_id, "tenant_id": tenant_ctx.tenant_id},
        {"_id": 0}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    event = {
        "id": str(uuid.uuid4()),
        "event_type": "note_added",
        "description": data.content,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("full_name", user.get("email"))
    }
    
    await db.projects.update_one(
        {"id": project_id, "tenant_id": tenant_ctx.tenant_id},
        {"$push": {"timeline": event}}
    )
    
    return event

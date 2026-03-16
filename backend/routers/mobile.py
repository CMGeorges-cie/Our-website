"""
Mobile API v2 Router for ServiceFlow
Optimized endpoints for React Native mobile app
Focuses on technician workflow and offline-first patterns
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, date
from enum import Enum
import uuid
import base64

from services.database import get_database, TenantRepository
from middleware.tenant import TenantContext, get_tenant_context
from routers.auth import get_current_user

router = APIRouter(prefix="/mobile", tags=["Mobile API"])


# ==================== SCHEMAS ====================
class CheckInData(BaseModel):
    project_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None


class CheckOutData(BaseModel):
    project_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None
    signature_base64: Optional[str] = None


class PhotoUpload(BaseModel):
    project_id: str
    photo_base64: str
    caption: str = ""
    photo_type: str = "progress"  # before, during, after, issue


class QuickStatusUpdate(BaseModel):
    status: str  # pending, in_progress, completed, on_hold


class MaterialUsage(BaseModel):
    project_id: str
    material_name: str
    quantity: float
    unit: str = "unité"
    notes: str = ""


class TimeEntry(BaseModel):
    project_id: str
    start_time: str
    end_time: str
    break_minutes: int = 0
    notes: str = ""


# ==================== SYNC ENDPOINTS ====================
@router.get("/sync/projects")
async def sync_projects(
    since: Optional[str] = None,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """
    Get all projects assigned to technician for offline sync.
    If 'since' is provided, only return projects modified after that timestamp.
    """
    db = get_database()
    
    query = {
        "tenant_id": tenant_ctx.tenant_id,
        "$or": [
            {"assigned_technician_id": user["id"]},
            {"created_by": user["id"]}
        ]
    }
    
    if since:
        query["updated_at"] = {"$gt": since}
    
    projects = await db.projects.find(
        query,
        {"_id": 0}
    ).sort("scheduled_date", 1).to_list(500)
    
    # Enrich with client info
    client_ids = list(set(p.get("client_id") for p in projects if p.get("client_id")))
    
    if client_ids:
        clients = await db.clients.find(
            {"id": {"$in": client_ids}, "tenant_id": tenant_ctx.tenant_id},
            {"_id": 0, "id": 1, "full_name": 1, "phone": 1, "email": 1, "address": 1, "city": 1}
        ).to_list(len(client_ids))
        
        client_map = {c["id"]: c for c in clients}
        
        for project in projects:
            client = client_map.get(project.get("client_id"))
            if client:
                project["client"] = client
    
    return {
        "projects": projects,
        "sync_timestamp": datetime.now(timezone.utc).isoformat(),
        "total": len(projects)
    }


@router.get("/sync/today")
async def get_today_schedule(
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Get today's scheduled projects for the technician"""
    db = get_database()
    
    today = date.today().isoformat()
    
    projects = await db.projects.find(
        {
            "tenant_id": tenant_ctx.tenant_id,
            "assigned_technician_id": user["id"],
            "scheduled_date": {"$regex": f"^{today}"},
            "status": {"$nin": ["completed", "cancelled"]}
        },
        {"_id": 0}
    ).sort("scheduled_date", 1).to_list(50)
    
    # Enrich with client contact info for quick calling
    for project in projects:
        if project.get("client_id"):
            client = await db.clients.find_one(
                {"id": project["client_id"], "tenant_id": tenant_ctx.tenant_id},
                {"_id": 0, "full_name": 1, "phone": 1, "address": 1, "city": 1}
            )
            if client:
                project["client"] = client
    
    return {
        "date": today,
        "projects": projects,
        "total": len(projects)
    }


# ==================== CHECK-IN / CHECK-OUT ====================
@router.post("/checkin")
async def check_in(
    data: CheckInData,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Technician check-in at job site"""
    db = get_database()
    
    # Verify project
    project = await db.projects.find_one(
        {"id": data.project_id, "tenant_id": tenant_ctx.tenant_id},
        {"_id": 0}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    checkin_record = {
        "id": str(uuid.uuid4()),
        "project_id": data.project_id,
        "tenant_id": tenant_ctx.tenant_id,
        "user_id": user["id"],
        "user_name": user.get("full_name", user.get("email")),
        "type": "checkin",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": data.latitude,
        "longitude": data.longitude,
        "notes": data.notes
    }
    
    await db.time_records.insert_one(checkin_record)
    
    # Update project status if pending
    if project.get("status") == "pending":
        await db.projects.update_one(
            {"id": data.project_id, "tenant_id": tenant_ctx.tenant_id},
            {
                "$set": {
                    "status": "in_progress",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {
                    "timeline": {
                        "id": str(uuid.uuid4()),
                        "event_type": "checkin",
                        "description": f"Arrivée sur site: {user.get('full_name', 'Technicien')}",
                        "created_at": checkin_record["timestamp"],
                        "created_by": user.get("full_name"),
                        "metadata": {
                            "latitude": data.latitude,
                            "longitude": data.longitude
                        }
                    }
                }
            }
        )
    
    return {"message": "Check-in recorded", "record": checkin_record}


@router.post("/checkout")
async def check_out(
    data: CheckOutData,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Technician check-out from job site with optional signature"""
    db = get_database()
    
    # Verify project
    project = await db.projects.find_one(
        {"id": data.project_id, "tenant_id": tenant_ctx.tenant_id},
        {"_id": 0}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    checkout_record = {
        "id": str(uuid.uuid4()),
        "project_id": data.project_id,
        "tenant_id": tenant_ctx.tenant_id,
        "user_id": user["id"],
        "user_name": user.get("full_name", user.get("email")),
        "type": "checkout",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": data.latitude,
        "longitude": data.longitude,
        "notes": data.notes,
        "signature_base64": data.signature_base64
    }
    
    await db.time_records.insert_one(checkout_record)
    
    # Calculate time worked today
    today_start = date.today().isoformat()
    checkin = await db.time_records.find_one(
        {
            "project_id": data.project_id,
            "user_id": user["id"],
            "type": "checkin",
            "timestamp": {"$gte": today_start}
        },
        sort=[("timestamp", -1)]
    )
    
    hours_worked = None
    if checkin:
        checkin_time = datetime.fromisoformat(checkin["timestamp"].replace("Z", "+00:00"))
        checkout_time = datetime.fromisoformat(checkout_record["timestamp"].replace("Z", "+00:00"))
        hours_worked = (checkout_time - checkin_time).total_seconds() / 3600
    
    # Add timeline event
    await db.projects.update_one(
        {"id": data.project_id, "tenant_id": tenant_ctx.tenant_id},
        {
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            "$push": {
                "timeline": {
                    "id": str(uuid.uuid4()),
                    "event_type": "checkout",
                    "description": f"Départ du site: {user.get('full_name', 'Technicien')}" + (f" ({hours_worked:.1f}h)" if hours_worked else ""),
                    "created_at": checkout_record["timestamp"],
                    "created_by": user.get("full_name"),
                    "metadata": {
                        "hours_worked": hours_worked,
                        "has_signature": bool(data.signature_base64)
                    }
                }
            }
        }
    )
    
    return {
        "message": "Check-out recorded",
        "record": checkout_record,
        "hours_worked": hours_worked
    }


# ==================== PHOTO UPLOAD ====================
@router.post("/photos")
async def upload_photo(
    data: PhotoUpload,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Upload a photo for a project (base64 for mobile compatibility)"""
    db = get_database()
    
    # Verify project
    project = await db.projects.find_one(
        {"id": data.project_id, "tenant_id": tenant_ctx.tenant_id},
        {"_id": 0, "id": 1}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # For now, store base64 directly. In production, upload to S3/cloud storage
    photo = {
        "id": str(uuid.uuid4()),
        "project_id": data.project_id,
        "tenant_id": tenant_ctx.tenant_id,
        "photo_base64": data.photo_base64,
        "caption": data.caption,
        "photo_type": data.photo_type,
        "uploaded_by": user["id"],
        "uploaded_by_name": user.get("full_name", user.get("email")),
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.project_photos.insert_one(photo)
    
    # Add to project photos array (without base64 for efficiency)
    photo_ref = {
        "id": photo["id"],
        "caption": photo["caption"],
        "photo_type": photo["photo_type"],
        "uploaded_at": photo["uploaded_at"],
        "uploaded_by": user.get("full_name")
    }
    
    await db.projects.update_one(
        {"id": data.project_id, "tenant_id": tenant_ctx.tenant_id},
        {
            "$push": {"photos": photo_ref},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": "Photo uploaded", "photo_id": photo["id"]}


@router.get("/photos/{project_id}")
async def get_project_photos(
    project_id: str,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Get all photos for a project"""
    db = get_database()
    
    photos = await db.project_photos.find(
        {"project_id": project_id, "tenant_id": tenant_ctx.tenant_id},
        {"_id": 0}
    ).sort("uploaded_at", -1).to_list(100)
    
    return photos


# ==================== QUICK STATUS ====================
@router.patch("/projects/{project_id}/status")
async def quick_status_update(
    project_id: str,
    data: QuickStatusUpdate,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Quick status update from mobile"""
    db = get_database()
    
    project = await db.projects.find_one(
        {"id": project_id, "tenant_id": tenant_ctx.tenant_id},
        {"_id": 0}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    old_status = project.get("status")
    
    status_labels = {
        "pending": "En attente",
        "in_progress": "En cours",
        "completed": "Terminé",
        "on_hold": "En pause"
    }
    
    update_data = {
        "status": data.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if data.status == "completed":
        update_data["completed_date"] = datetime.now(timezone.utc).isoformat()
        update_data["progress"] = 100
    
    await db.projects.update_one(
        {"id": project_id, "tenant_id": tenant_ctx.tenant_id},
        {
            "$set": update_data,
            "$push": {
                "timeline": {
                    "id": str(uuid.uuid4()),
                    "event_type": "status_change",
                    "description": f"Statut: {status_labels.get(old_status, old_status)} → {status_labels.get(data.status, data.status)}",
                    "created_at": update_data["updated_at"],
                    "created_by": user.get("full_name"),
                    "metadata": {"source": "mobile"}
                }
            }
        }
    )
    
    return {"message": "Status updated", "new_status": data.status}


# ==================== MATERIALS ====================
@router.post("/materials")
async def log_material_usage(
    data: MaterialUsage,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Log material usage on a project"""
    db = get_database()
    
    material = {
        "id": str(uuid.uuid4()),
        "project_id": data.project_id,
        "tenant_id": tenant_ctx.tenant_id,
        "material_name": data.material_name,
        "quantity": data.quantity,
        "unit": data.unit,
        "notes": data.notes,
        "logged_by": user["id"],
        "logged_by_name": user.get("full_name"),
        "logged_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.material_usage.insert_one(material)
    
    return {"message": "Material logged", "id": material["id"]}


@router.get("/materials/{project_id}")
async def get_project_materials(
    project_id: str,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Get all materials used on a project"""
    db = get_database()
    
    materials = await db.material_usage.find(
        {"project_id": project_id, "tenant_id": tenant_ctx.tenant_id},
        {"_id": 0}
    ).sort("logged_at", -1).to_list(500)
    
    return materials


# ==================== TIME TRACKING ====================
@router.post("/time")
async def log_time_entry(
    data: TimeEntry,
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Log manual time entry for a project"""
    db = get_database()
    
    # Calculate hours
    start = datetime.fromisoformat(data.start_time.replace("Z", "+00:00"))
    end = datetime.fromisoformat(data.end_time.replace("Z", "+00:00"))
    total_minutes = (end - start).total_seconds() / 60
    work_minutes = total_minutes - data.break_minutes
    hours = work_minutes / 60
    
    entry = {
        "id": str(uuid.uuid4()),
        "project_id": data.project_id,
        "tenant_id": tenant_ctx.tenant_id,
        "user_id": user["id"],
        "user_name": user.get("full_name"),
        "start_time": data.start_time,
        "end_time": data.end_time,
        "break_minutes": data.break_minutes,
        "hours": round(hours, 2),
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.time_entries.insert_one(entry)
    
    # Update project actual_hours
    total_hours = await db.time_entries.aggregate([
        {"$match": {"project_id": data.project_id, "tenant_id": tenant_ctx.tenant_id}},
        {"$group": {"_id": None, "total": {"$sum": "$hours"}}}
    ]).to_list(1)
    
    if total_hours:
        await db.projects.update_one(
            {"id": data.project_id, "tenant_id": tenant_ctx.tenant_id},
            {"$set": {"actual_hours": total_hours[0]["total"]}}
        )
    
    return {"message": "Time logged", "entry": entry}


# ==================== DASHBOARD ====================
@router.get("/dashboard")
async def get_mobile_dashboard(
    user: dict = Depends(get_current_user),
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Get dashboard stats for mobile home screen"""
    db = get_database()
    
    today = date.today().isoformat()
    
    # Today's projects
    todays_projects = await db.projects.count_documents({
        "tenant_id": tenant_ctx.tenant_id,
        "assigned_technician_id": user["id"],
        "scheduled_date": {"$regex": f"^{today}"}
    })
    
    # Active projects (in_progress)
    active_projects = await db.projects.count_documents({
        "tenant_id": tenant_ctx.tenant_id,
        "assigned_technician_id": user["id"],
        "status": "in_progress"
    })
    
    # Completed this week
    week_start = (date.today() - timedelta(days=date.today().weekday())).isoformat()
    completed_this_week = await db.projects.count_documents({
        "tenant_id": tenant_ctx.tenant_id,
        "assigned_technician_id": user["id"],
        "status": "completed",
        "completed_date": {"$gte": week_start}
    })
    
    # Hours this week
    time_entries = await db.time_entries.aggregate([
        {
            "$match": {
                "tenant_id": tenant_ctx.tenant_id,
                "user_id": user["id"],
                "created_at": {"$gte": week_start}
            }
        },
        {"$group": {"_id": None, "total": {"$sum": "$hours"}}}
    ]).to_list(1)
    
    hours_this_week = time_entries[0]["total"] if time_entries else 0
    
    # Unread messages count
    unread_messages = await db.project_messages.count_documents({
        "tenant_id": tenant_ctx.tenant_id,
        "sender_type": {"$ne": "admin" if user.get("role") in ["admin", "staff"] else "client"},
        "is_read": False
    })
    
    return {
        "todays_projects": todays_projects,
        "active_projects": active_projects,
        "completed_this_week": completed_this_week,
        "hours_this_week": round(hours_this_week, 1),
        "unread_messages": unread_messages,
        "user_name": user.get("full_name", user.get("email"))
    }


# Need to import timedelta
from datetime import timedelta

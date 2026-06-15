"""
Blog routes — Déco Touché.

Public:
  GET  /api/v1/blog                    (list published)
  GET  /api/v1/blog/{slug}             (single, increments view_count)
  GET  /api/v1/blog-categories         (categories with counts)

Admin:
  GET    /api/v1/admin/blog
  POST   /api/v1/admin/blog
  PATCH  /api/v1/admin/blog/{post_id}
  DELETE /api/v1/admin/blog/{post_id}
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field


# ============ Models ============
class BlogPostStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class BlogPostBase(BaseModel):
    title: str
    slug: str
    excerpt: str = ""
    content: str
    featured_image: Optional[str] = None
    category: str = "general"
    tags: List[str] = []
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None


class BlogPostCreate(BlogPostBase):
    pass


class BlogPost(BlogPostBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: BlogPostStatus = BlogPostStatus.DRAFT
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    published_at: Optional[datetime] = None
    view_count: int = 0


class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[BlogPostStatus] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None


def _hydrate_dates(post: dict) -> dict:
    for k in ("created_at", "updated_at", "published_at"):
        if isinstance(post.get(k), str):
            post[k] = datetime.fromisoformat(post[k])
    return post


# ============ Router factory ============
def build_blog_router(db, get_current_user, require_admin, create_audit_log) -> APIRouter:
    router = APIRouter(tags=["Blog"])

    # ----- Public -----
    @router.get("/blog", response_model=List[BlogPost])
    async def get_published_blog_posts(
        category: Optional[str] = None,
        tag: Optional[str] = None,
        limit: int = 10,
    ):
        query = {"status": "published"}
        if category:
            query["category"] = category
        if tag:
            query["tags"] = tag
        posts = (
            await db.blog_posts.find(query, {"_id": 0})
            .sort("published_at", -1)
            .limit(limit)
            .to_list(limit)
        )
        return [_hydrate_dates(p) for p in posts]

    @router.get("/blog/{slug}")
    async def get_blog_post_by_slug(slug: str):
        post = await db.blog_posts.find_one({"slug": slug, "status": "published"}, {"_id": 0})
        if not post:
            raise HTTPException(status_code=404, detail="Article non trouvé")
        await db.blog_posts.update_one({"slug": slug}, {"$inc": {"view_count": 1}})
        return _hydrate_dates(post)

    @router.get("/blog-categories")
    async def get_blog_categories():
        pipeline = [
            {"$match": {"status": "published"}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        categories = await db.blog_posts.aggregate(pipeline).to_list(100)
        return [{"category": c["_id"], "count": c["count"]} for c in categories]

    # ----- Admin -----
    @router.get("/admin/blog", response_model=List[BlogPost])
    async def admin_get_blog_posts(
        status: Optional[BlogPostStatus] = None,
        user: dict = Depends(get_current_user),
    ):
        query = {}
        if status:
            query["status"] = status
        posts = await db.blog_posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
        return [_hydrate_dates(p) for p in posts]

    @router.post("/admin/blog", response_model=BlogPost)
    async def create_blog_post(
        post_data: BlogPostCreate,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        existing = await db.blog_posts.find_one({"slug": post_data.slug})
        if existing:
            raise HTTPException(status_code=400, detail="Un article avec ce slug existe déjà")

        post = BlogPost(
            **post_data.model_dump(),
            author_id=user["id"],
            author_name=user.get("full_name", user["email"]),
        )
        doc = post.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        if doc.get("published_at"):
            doc["published_at"] = doc["published_at"].isoformat()

        await db.blog_posts.insert_one(doc)
        await create_audit_log(
            "blog_post_created", "blog_post", post.id, user=user, request=request
        )
        return post

    @router.patch("/admin/blog/{post_id}", response_model=BlogPost)
    async def update_blog_post(
        post_id: str,
        update: BlogPostUpdate,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")

        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        if update_data.get("status") == "published":
            existing = await db.blog_posts.find_one(
                {"id": post_id}, {"_id": 0, "published_at": 1}
            )
            if not existing or not existing.get("published_at"):
                update_data["published_at"] = datetime.now(timezone.utc).isoformat()

        result = await db.blog_posts.update_one({"id": post_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Article non trouvé")

        await create_audit_log(
            "blog_post_updated",
            "blog_post",
            post_id,
            user=user,
            details=update_data,
            request=request,
        )

        post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
        return _hydrate_dates(post)

    @router.delete("/admin/blog/{post_id}")
    async def delete_blog_post(
        post_id: str, request: Request, user: dict = Depends(require_admin)
    ):
        result = await db.blog_posts.delete_one({"id": post_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Article non trouvé")
        await create_audit_log(
            "blog_post_deleted", "blog_post", post_id, user=user, request=request
        )
        return {"message": "Article supprimé"}

    return router

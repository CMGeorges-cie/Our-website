"""One-shot migration: upload existing /app/frontend/public/portfolio/**.jpg
files to R2 and update portfolio_media URLs in MongoDB.

Idempotent: skips files already uploaded (checks by R2 head_object).
Safe to re-run.
"""
import asyncio
import logging
import mimetypes
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load env first
load_dotenv("/app/backend/.env")
sys.path.insert(0, "/app/backend")

from motor.motor_asyncio import AsyncIOMotorClient
from storage import r2 as r2_storage
from botocore.exceptions import ClientError

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger(__name__)

PORTFOLIO_DIR = Path("/app/frontend/public/portfolio")
R2_PREFIX = "portfolio"


def _r2_exists(key: str) -> bool:
    client = r2_storage.get_client()
    try:
        client.head_object(Bucket=r2_storage.R2_BUCKET_NAME, Key=key)
        return True
    except ClientError:
        return False


def _upload_one(local_path: Path) -> str:
    """Upload one file to R2; return the public URL or local path on failure."""
    rel = local_path.relative_to(PORTFOLIO_DIR)
    key = f"{R2_PREFIX}/{rel.as_posix()}"
    if _r2_exists(key):
        log.info(f"  SKIP (already on R2): {key}")
        return r2_storage._build_public_url(key)
    ctype, _ = mimetypes.guess_type(local_path.name)
    with open(local_path, "rb") as fh:
        url = r2_storage.upload_fileobj(fh, key, content_type=ctype or "image/jpeg")
    log.info(f"  UPLOADED: {local_path.name} -> {key} -> {url}")
    return url


async def main():
    if not r2_storage.is_configured():
        log.error("R2 is not configured (missing env vars).")
        return

    files = sorted(PORTFOLIO_DIR.rglob("*"))
    files = [f for f in files if f.is_file() and f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}]
    log.info(f"Found {len(files)} portfolio files to migrate.\n")

    # Build local->r2 URL map
    url_map: dict[str, str] = {}
    for f in files:
        old_url = "/portfolio/" + f.relative_to(PORTFOLIO_DIR).as_posix()
        new_url = _upload_one(f)
        url_map[old_url] = new_url

    log.info(f"\n✓ Upload phase complete. {len(url_map)} files mapped.\n")

    # Now update MongoDB
    mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = mongo[os.environ["DB_NAME"]]

    docs = await db.portfolio_media.find({}).to_list(1000)
    updated_count = 0
    for doc in docs:
        new_doc_fields = {}
        for field in ("image_url", "before_image_url"):
            v = doc.get(field)
            if v and v in url_map:
                new_doc_fields[field] = url_map[v]
        if doc.get("images"):
            new_images = [url_map.get(u, u) for u in doc["images"]]
            if new_images != doc["images"]:
                new_doc_fields["images"] = new_images
        if new_doc_fields:
            await db.portfolio_media.update_one({"id": doc["id"]}, {"$set": new_doc_fields})
            log.info(f"  DB updated: {doc.get('id')} ({len(new_doc_fields)} field(s))")
            updated_count += 1

    log.info(f"\n✓ DB phase complete. {updated_count}/{len(docs)} portfolio docs updated.")
    log.info(f"\n=== Migration complete. Photos now live on Cloudflare R2 CDN. ===")


if __name__ == "__main__":
    asyncio.run(main())

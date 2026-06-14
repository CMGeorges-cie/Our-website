"""Cloudflare R2 storage utility (S3-compatible).

Replaces local /uploads filesystem with Cloudflare R2 — survives pod restarts
and scales horizontally.

Public URLs strategy:
- If R2_PUBLIC_BASE_URL is set (custom domain or r2.dev public bucket), photos
  are served directly from R2 → fastest, free egress via Cloudflare CDN.
- Otherwise, photos are served via the backend proxy at /api/v1/r2/photo/{key}
  (streams from R2). The frontend just stores and uses /api/v1/r2/photo/<key>.

This dual mode lets users start without configuring a public bucket and
upgrade later by simply setting R2_PUBLIC_BASE_URL.
"""

from __future__ import annotations

import logging
import os
import uuid
from io import BytesIO
from typing import Optional, BinaryIO

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError, BotoCoreError

logger = logging.getLogger(__name__)

R2_ENDPOINT_URL = os.environ.get("R2_ENDPOINT_URL", "")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "")
R2_PUBLIC_BASE_URL = (os.environ.get("R2_PUBLIC_BASE_URL") or "").rstrip("/")
R2_PRESIGNED_TTL_SECONDS = int(os.environ.get("R2_PRESIGNED_TTL_SECONDS", "3600"))

# Prefix returned by upload endpoints when no public base URL is configured.
# Frontend just uses this URL verbatim; backend proxies the bytes from R2.
PROXY_URL_PREFIX = "/api/v1/r2/photo"


def is_configured() -> bool:
    """Return True if R2 credentials are fully populated."""
    return all([R2_ENDPOINT_URL, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY])


_client = None


def get_client():
    """Return a cached boto3 S3 client configured for R2 (SigV4)."""
    global _client
    if _client is None:
        if not is_configured():
            raise RuntimeError("R2 storage not configured")
        _client = boto3.client(
            "s3",
            endpoint_url=R2_ENDPOINT_URL,
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            region_name="auto",
            config=BotoConfig(signature_version="s3v4", retries={"max_attempts": 3}),
        )
    return _client


def _build_public_url(key: str) -> str:
    """Return the URL that the frontend should embed in <img src>."""
    if R2_PUBLIC_BASE_URL:
        return f"{R2_PUBLIC_BASE_URL}/{key}"
    return f"{PROXY_URL_PREFIX}/{key}"


def upload_bytes(data: bytes, key: str, content_type: Optional[str] = None) -> str:
    """Upload raw bytes to R2 and return the URL to embed on the frontend."""
    client = get_client()
    extra = {}
    if content_type:
        extra["ContentType"] = content_type
    try:
        client.put_object(Bucket=R2_BUCKET_NAME, Key=key, Body=data, **extra)
    except (ClientError, BotoCoreError) as e:
        logger.error(f"R2 put_object failed for key={key}: {e}")
        raise
    return _build_public_url(key)


def upload_fileobj(fileobj: BinaryIO, key: str, content_type: Optional[str] = None) -> str:
    """Stream a file-like object to R2."""
    client = get_client()
    extra = {}
    if content_type:
        extra["ContentType"] = content_type
    try:
        client.upload_fileobj(fileobj, R2_BUCKET_NAME, key, ExtraArgs=extra or None)
    except (ClientError, BotoCoreError) as e:
        logger.error(f"R2 upload_fileobj failed for key={key}: {e}")
        raise
    return _build_public_url(key)


def get_object_stream(key: str):
    """Return (body_iterator, content_type, content_length) for a key, or None."""
    client = get_client()
    try:
        obj = client.get_object(Bucket=R2_BUCKET_NAME, Key=key)
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") in ("NoSuchKey", "404"):
            return None
        logger.error(f"R2 get_object failed for key={key}: {e}")
        raise
    return (
        obj["Body"],
        obj.get("ContentType", "application/octet-stream"),
        obj.get("ContentLength"),
    )


def make_key(prefix: str, original_filename: str) -> str:
    """Generate a unique R2 object key like prefix/uuid12.ext"""
    ext = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else "jpg"
    # Safety: limit ext length and chars
    ext = "".join(c for c in ext if c.isalnum())[:6] or "jpg"
    return f"{prefix.strip('/')}/{uuid.uuid4().hex[:12]}.{ext}"

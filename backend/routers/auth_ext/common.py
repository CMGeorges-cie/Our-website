"""Shared helpers, constants and Pydantic models for auth extensions."""
from __future__ import annotations

import base64
import io
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
import pyotp
import qrcode
import resend
from pydantic import BaseModel, EmailStr, Field

from config.brand import Brand

logger = logging.getLogger(__name__)

# ---- Configuration ----------------------------------------------------------
JWT_SECRET = os.environ.get("JWT_SECRET", "cmgeorges-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
RESET_TOKEN_TTL_MIN = 60
EMAIL_2FA_CODE_TTL_MIN = 10
TEMP_PASSWORD_TTL_HOURS = 48
RATE_LIMIT_RESET_MAX = 3
RATE_LIMIT_RESET_WINDOW_MIN = 15
TOTP_ISSUER = Brand.NAME

SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")


# ---- Pydantic models --------------------------------------------------------
class ChangeEmailRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_email: EmailStr


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=200)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10)
    new_password: str = Field(min_length=8, max_length=200)


class TwoFAEnableEmailRequest(BaseModel):
    """No body needed — just enables email 2FA for the current user."""


class TwoFAVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=10)


class TwoFADisableRequest(BaseModel):
    current_password: str
    code: str = Field(min_length=6, max_length=10)


class LoginChallengeRequest(BaseModel):
    email: EmailStr
    password: str


class LoginChallengeVerifyRequest(BaseModel):
    challenge_token: str
    code: str = Field(min_length=6, max_length=10)


# ---- Helpers ----------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    if not password or not hashed:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def generate_email_code() -> str:
    """6-digit numeric code for email-based 2FA."""
    return f"{secrets.randbelow(1_000_000):06d}"


def create_challenge_token(user_id: str, ttl_min: int = 5) -> str:
    payload = {
        "sub": user_id,
        "type": "2fa_challenge",
        "exp": now_utc() + timedelta(minutes=ttl_min),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_challenge_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "2fa_challenge":
            return None
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


async def send_resend_email(to: str, subject: str, html: str) -> bool:
    """Send transactional email via Resend. Returns True on success."""
    if not resend.api_key:
        logger.warning(f"[email] RESEND_API_KEY missing — would send to={to} subject={subject!r}")
        return False
    try:
        resend.Emails.send(
            {
                "from": f"{Brand.NAME} <{SENDER_EMAIL}>",
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )
        return True
    except Exception as e:
        logger.error(f"[email] send failed to={to}: {e}")
        return False


def build_totp_qr_data_url(secret: str, email: str) -> tuple[str, str]:
    """Returns (qr_data_url, uri) for a fresh TOTP secret."""
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name=TOTP_ISSUER)
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_data_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    return qr_data_url, uri


async def enforce_password_policy(user: dict) -> None:
    """Raises 403 (via HTTPException) if user is on a temporary password and grace window expired."""
    from fastapi import HTTPException  # local import to keep this module dep-light

    if not user.get("password_is_temporary"):
        return
    expiry_iso = user.get("password_must_change_before")
    if not expiry_iso:
        return
    try:
        expiry = datetime.fromisoformat(expiry_iso.replace("Z", "+00:00"))
    except Exception:
        return
    if now_utc() > expiry:
        raise HTTPException(
            status_code=403,
            detail="Mot de passe temporaire expiré. Utilisez 'Mot de passe oublié' pour le réinitialiser.",
        )


async def verify_2fa_code_for(db, u: dict, code: str) -> bool:
    method = u.get("two_factor_method")
    if method == "totp":
        secret = u.get("totp_secret")
        if not secret:
            return False
        return pyotp.TOTP(secret).verify(code, valid_window=1)
    if method == "email":
        challenge = await db.email_2fa_codes.find_one(
            {
                "user_id": u["id"],
                "used_at": None,
                "expires_at": {"$gte": now_utc().isoformat()},
            },
            {"_id": 0},
            sort=[("created_at", -1)],
        )
        if not challenge:
            return False
        try:
            ok = bcrypt.checkpw(code.encode("utf-8"), challenge["code_hash"].encode("utf-8"))
        except Exception:
            ok = False
        if ok:
            await db.email_2fa_codes.update_one(
                {"user_id": u["id"], "code_hash": challenge["code_hash"]},
                {"$set": {"used_at": now_utc().isoformat()}},
            )
        return ok
    return False


async def start_email_2fa_challenge(db, u: dict) -> None:
    code = generate_email_code()
    code_hash = bcrypt.hashpw(code.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    await db.email_2fa_codes.insert_one(
        {
            "user_id": u["id"],
            "code_hash": code_hash,
            "expires_at": (now_utc() + timedelta(minutes=EMAIL_2FA_CODE_TTL_MIN)).isoformat(),
            "used_at": None,
            "created_at": now_utc().isoformat(),
        }
    )
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
      <h2 style="color:#1a365d;">Votre code de vérification</h2>
      <p>Voici votre code à usage unique pour vous connecter à {Brand.NAME} :</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;color:#d4af37;background:#1a365d;padding:16px;border-radius:8px;">{code}</p>
      <p style="color:#666;">Ce code expire dans {EMAIL_2FA_CODE_TTL_MIN} minutes.</p>
      <p style="color:#666;font-size:12px;">Si vous n'êtes pas à l'origine de cette connexion, changez votre mot de passe immédiatement.</p>
    </div>
    """
    await send_resend_email(u["email"], f"Code de vérification — {Brand.NAME}", html)

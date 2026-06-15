"""
Authentication enhancements router — Déco Touché.

Provides:
  • Password change (authenticated)
  • Forgot password (email reset link with single-use, time-limited token)
  • Two-Factor Authentication (TOTP via QR + email-based 6-digit code)
  • Login challenge flow with 2FA gate
  • First-time admin password expiry (48h forced rotation)

Designed as an extension to the existing JWT/bcrypt auth in server.py.
"""

from __future__ import annotations

import logging
import os
import secrets
import io
import base64
from datetime import datetime, timezone, timedelta
from typing import Optional, Literal

import bcrypt
import jwt
import pyotp
import qrcode
import resend
from fastapi import APIRouter, HTTPException, Request, Response, Depends, status
from fastapi.responses import JSONResponse
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


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _generate_email_code() -> str:
    """6-digit numeric code for email-based 2FA."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _create_challenge_token(user_id: str, ttl_min: int = 5) -> str:
    payload = {
        "sub": user_id,
        "type": "2fa_challenge",
        "exp": _now() + timedelta(minutes=ttl_min),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_challenge_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "2fa_challenge":
            return None
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


async def _send_email(to: str, subject: str, html: str) -> bool:
    """Send transactional email via Resend. Returns True on success."""
    if not resend.api_key:
        logger.warning(f"[email] RESEND_API_KEY missing — would send to={to} subject={subject!r}")
        return False
    try:
        resend.Emails.send({
            "from": f"{Brand.NAME} <{SENDER_EMAIL}>",
            "to": [to],
            "subject": subject,
            "html": html,
        })
        return True
    except Exception as e:
        logger.error(f"[email] send failed to={to}: {e}")
        return False


# ---- Router factory ---------------------------------------------------------

def build_auth_router(db, get_current_user, create_access_token, create_refresh_token,
                     create_audit_log, frontend_url: str,
                     set_auth_cookies=None, clear_auth_cookies=None) -> APIRouter:
    """
    Build the auth-extensions router. We accept dependencies as args to avoid
    a circular import with server.py.
    """
    # Safety: never email a reset link pointing to the preview environment.
    # If FRONTEND_URL is missing or accidentally set to a preview URL, fall back
    # to the canonical production domain so password reset emails always work.
    PROD_URL = "https://cmgeorges.ca"
    if not frontend_url or "preview.emergentagent" in frontend_url or "localhost" in frontend_url:
        logger.warning(f"[auth] FRONTEND_URL='{frontend_url}' looks non-production; "
                       f"falling back to {PROD_URL} for password reset emails.")
        frontend_url = PROD_URL

    router = APIRouter(prefix="/auth", tags=["Auth"])

    # ---- Login pre-check: enforce temp-password expiry & 2FA -----------------

    async def _enforce_password_policy(user: dict) -> None:
        """Raises 403 if user is on a temporary password and grace window expired."""
        if not user.get("password_is_temporary"):
            return
        expiry_iso = user.get("password_must_change_before")
        if not expiry_iso:
            return
        try:
            expiry = datetime.fromisoformat(expiry_iso.replace("Z", "+00:00"))
        except Exception:
            return
        if _now() > expiry:
            raise HTTPException(
                status_code=403,
                detail="Mot de passe temporaire expiré. Utilisez 'Mot de passe oublié' pour le réinitialiser.",
            )

    # ---- Password change (authenticated) -------------------------------------

    @router.post("/change-password")
    async def change_password(body: ChangePasswordRequest, request: Request,
                              user: dict = Depends(get_current_user)):
        db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        if not verify_password(body.current_password, db_user.get("password_hash", "")):
            raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")

        if verify_password(body.new_password, db_user.get("password_hash", "")):
            raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit être différent de l'ancien")

        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "password_hash": hash_password(body.new_password),
                "password_changed_at": _now().isoformat(),
                "password_is_temporary": False,
                "password_must_change_before": None,
            }},
        )
        await create_audit_log("password_changed", "user", user["id"], user=user, request=request)
        return {"success": True, "message": "Mot de passe mis à jour"}

    # ---- Change email (authenticated) ---------------------------------------

    @router.post("/change-email")
    async def change_email(body: ChangeEmailRequest, request: Request,
                            user: dict = Depends(get_current_user)):
        db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        if not verify_password(body.current_password, db_user.get("password_hash", "")):
            raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")

        new_email = body.new_email.strip().lower()
        if new_email == (db_user.get("email") or "").lower():
            raise HTTPException(status_code=400, detail="Le nouveau courriel est identique à l'actuel")

        # Reject if already used by another user
        existing = await db.users.find_one({"email": new_email, "id": {"$ne": user["id"]}}, {"_id": 0, "id": 1})
        if existing:
            raise HTTPException(status_code=409, detail="Ce courriel est déjà utilisé")

        old_email = db_user.get("email")
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"email": new_email, "email_changed_at": _now().isoformat()}},
        )
        await create_audit_log("email_changed", "user", user["id"], user=user, request=request)

        # Best-effort notification to the OLD email so the user is aware
        if old_email:
            html = f"""
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
              <h2 style="color:#1a365d;">Adresse courriel modifiée</h2>
              <p>Le courriel associé à votre compte {Brand.NAME} vient d'être changé pour&nbsp;: <strong>{new_email}</strong>.</p>
              <p style="color:#c0392b;">Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement le support.</p>
              <p style="color:#999;font-size:11px;">{Brand.NAME} · {Brand.PHONE_DISPLAY} · {Brand.EMAIL}</p>
            </div>
            """
            await _send_email(old_email, f"Adresse courriel modifiée — {Brand.NAME}", html)

        return {"success": True, "email": new_email}

    # ---- Forgot / Reset password --------------------------------------------

    @router.post("/forgot-password")
    async def forgot_password(body: ForgotPasswordRequest, request: Request):
        # Rate limit: 3 requests / 15min per (ip, email)
        ip = (request.client.host if request.client else "unknown")
        window_start = _now() - timedelta(minutes=RATE_LIMIT_RESET_WINDOW_MIN)
        recent = await db.password_reset_attempts.count_documents({
            "ip": ip,
            "email": body.email,
            "created_at": {"$gte": window_start.isoformat()},
        })
        if recent >= RATE_LIMIT_RESET_MAX:
            raise HTTPException(
                status_code=429,
                detail="Trop de tentatives. Réessayez dans quelques minutes.",
            )
        await db.password_reset_attempts.insert_one({
            "ip": ip, "email": body.email, "created_at": _now().isoformat(),
        })

        # Always respond success-like to avoid user enumeration
        generic = {"success": True, "message": "Si un compte existe, un courriel a été envoyé."}

        user = await db.users.find_one({"email": body.email}, {"_id": 0})
        if not user:
            return generic

        # Invalidate previous tokens for this user
        await db.password_reset_tokens.update_many(
            {"user_id": user["id"], "used_at": None},
            {"$set": {"used_at": _now().isoformat(), "invalidated": True}},
        )

        token_value = secrets.token_urlsafe(32)
        token_hash = bcrypt.hashpw(token_value.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        await db.password_reset_tokens.insert_one({
            "user_id": user["id"],
            "token_hash": token_hash,
            "expires_at": (_now() + timedelta(minutes=RESET_TOKEN_TTL_MIN)).isoformat(),
            "used_at": None,
            "created_at": _now().isoformat(),
        })

        reset_link = f"{frontend_url.rstrip('/')}/reinitialiser-mot-de-passe?token={token_value}"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2 style="color:#1a365d;">Réinitialisation de mot de passe</h2>
          <p>Bonjour,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe {Brand.NAME}.</p>
          <p>Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe. Le lien est valide pendant {RESET_TOKEN_TTL_MIN} minutes et ne peut être utilisé qu'une seule fois.</p>
          <p style="text-align:center; margin: 24px 0;">
            <a href="{reset_link}" style="background:#d4af37;color:#1a365d;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Réinitialiser mon mot de passe</a>
          </p>
          <p style="color:#666;font-size:12px;">Si vous n'êtes pas à l'origine de cette demande, ignorez ce courriel.</p>
          <hr/>
          <p style="color:#999;font-size:11px;">{Brand.NAME} · {Brand.PHONE_DISPLAY} · {Brand.EMAIL}</p>
        </div>
        """
        await _send_email(user["email"], f"Réinitialisation de mot de passe — {Brand.NAME}", html)
        return generic

    @router.post("/reset-password")
    async def reset_password(body: ResetPasswordRequest, request: Request):
        # Token is opaque; we hashed-stored it, so check all non-expired non-used tokens
        candidates = await db.password_reset_tokens.find({
            "used_at": None,
            "expires_at": {"$gte": _now().isoformat()},
        }, {"_id": 0}).to_list(length=200)

        matched = None
        for tk in candidates:
            try:
                if bcrypt.checkpw(body.token.encode("utf-8"), tk["token_hash"].encode("utf-8")):
                    matched = tk
                    break
            except Exception:
                continue
        if not matched:
            raise HTTPException(status_code=400, detail="Lien de réinitialisation invalide ou expiré")

        user = await db.users.find_one({"id": matched["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=400, detail="Utilisateur introuvable")

        # Mark token as used
        await db.password_reset_tokens.update_one(
            {"user_id": matched["user_id"], "token_hash": matched["token_hash"]},
            {"$set": {"used_at": _now().isoformat()}},
        )
        # Update password and clear temporary flag
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "password_hash": hash_password(body.new_password),
                "password_changed_at": _now().isoformat(),
                "password_is_temporary": False,
                "password_must_change_before": None,
            }},
        )
        await create_audit_log("password_reset", "user", user["id"], user=user, request=request)
        return {"success": True, "message": "Mot de passe réinitialisé", "role": user.get("role", "client")}

    # ---- 2FA setup / verify --------------------------------------------------

    @router.get("/2fa/status")
    async def two_fa_status(user: dict = Depends(get_current_user)):
        u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
        return {
            "enabled": bool(u.get("two_factor_enabled")),
            "method": u.get("two_factor_method"),
        }

    @router.post("/2fa/totp/setup")
    async def two_fa_totp_setup(user: dict = Depends(get_current_user)):
        """Generate a TOTP secret + QR code (not yet activated until verified)."""
        secret = pyotp.random_base32()
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "totp_secret_pending": secret,
                "totp_secret_pending_at": _now().isoformat(),
            }},
        )
        uri = pyotp.totp.TOTP(secret).provisioning_uri(name=user["email"], issuer_name=TOTP_ISSUER)
        # Build QR code as data URI
        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        qr_data_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
        return {"qr_code": qr_data_url, "secret": secret, "uri": uri}

    @router.post("/2fa/totp/activate")
    async def two_fa_totp_activate(body: TwoFAVerifyRequest, request: Request,
                                    user: dict = Depends(get_current_user)):
        u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        pending = u.get("totp_secret_pending")
        if not pending:
            raise HTTPException(status_code=400, detail="Aucune configuration 2FA en attente")
        totp = pyotp.TOTP(pending)
        if not totp.verify(body.code, valid_window=1):
            raise HTTPException(status_code=400, detail="Code invalide")
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "totp_secret": pending,
                "two_factor_enabled": True,
                "two_factor_method": "totp",
            }, "$unset": {"totp_secret_pending": "", "totp_secret_pending_at": ""}},
        )
        await create_audit_log("2fa_totp_activated", "user", user["id"], user=user, request=request)
        return {"success": True}

    @router.post("/2fa/email/activate")
    async def two_fa_email_activate(request: Request, user: dict = Depends(get_current_user)):
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"two_factor_enabled": True, "two_factor_method": "email"},
             "$unset": {"totp_secret": ""}},
        )
        await create_audit_log("2fa_email_activated", "user", user["id"], user=user, request=request)
        return {"success": True}

    @router.post("/2fa/disable")
    async def two_fa_disable(body: TwoFADisableRequest, request: Request,
                              user: dict = Depends(get_current_user)):
        u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        if not verify_password(body.current_password, u.get("password_hash", "")):
            raise HTTPException(status_code=400, detail="Mot de passe incorrect")
        # Verify current 2FA code before allowing disable
        ok = await _verify_2fa_code_for(u, body.code)
        if not ok:
            raise HTTPException(status_code=400, detail="Code 2FA invalide")
        await db.users.update_one(
            {"id": u["id"]},
            {"$set": {"two_factor_enabled": False, "two_factor_method": None},
             "$unset": {"totp_secret": ""}},
        )
        await create_audit_log("2fa_disabled", "user", u["id"], user=u, request=request)
        return {"success": True}

    # ---- 2FA login challenge -------------------------------------------------

    async def _verify_2fa_code_for(u: dict, code: str) -> bool:
        method = u.get("two_factor_method")
        if method == "totp":
            secret = u.get("totp_secret")
            if not secret:
                return False
            return pyotp.TOTP(secret).verify(code, valid_window=1)
        if method == "email":
            challenge = await db.email_2fa_codes.find_one(
                {"user_id": u["id"], "used_at": None,
                 "expires_at": {"$gte": _now().isoformat()}},
                {"_id": 0}, sort=[("created_at", -1)],
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
                    {"$set": {"used_at": _now().isoformat()}},
                )
            return ok
        return False

    async def _start_email_2fa_challenge(u: dict) -> None:
        code = _generate_email_code()
        code_hash = bcrypt.hashpw(code.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        await db.email_2fa_codes.insert_one({
            "user_id": u["id"],
            "code_hash": code_hash,
            "expires_at": (_now() + timedelta(minutes=EMAIL_2FA_CODE_TTL_MIN)).isoformat(),
            "used_at": None,
            "created_at": _now().isoformat(),
        })
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
          <h2 style="color:#1a365d;">Votre code de vérification</h2>
          <p>Voici votre code à usage unique pour vous connecter à {Brand.NAME} :</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;color:#d4af37;background:#1a365d;padding:16px;border-radius:8px;">{code}</p>
          <p style="color:#666;">Ce code expire dans {EMAIL_2FA_CODE_TTL_MIN} minutes.</p>
          <p style="color:#666;font-size:12px;">Si vous n'êtes pas à l'origine de cette connexion, changez votre mot de passe immédiatement.</p>
        </div>
        """
        await _send_email(u["email"], f"Code de vérification — {Brand.NAME}", html)

    @router.post("/login/challenge")
    async def login_challenge(body: LoginChallengeRequest, request: Request, response: Response):
        """First step of the 2FA-aware login. Returns either a session OR a challenge."""
        u = await db.users.find_one({"email": body.email}, {"_id": 0})
        if not u or not verify_password(body.password, u.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Identifiants invalides")
        if not u.get("is_active", True):
            raise HTTPException(status_code=401, detail="Compte désactivé")
        await _enforce_password_policy(u)

        if not u.get("two_factor_enabled"):
            # No 2FA → normal session
            access = create_access_token(u["id"], u["email"], u["role"])
            refresh = create_refresh_token(u["id"])
            if set_auth_cookies:
                set_auth_cookies(response, access, refresh)
            await create_audit_log("user_login", "user", u["id"], user=u, request=request)
            user_response = {k: v for k, v in u.items() if k != "password_hash"}
            return {
                "challenge_required": False,
                "access_token": access,
                "refresh_token": refresh,
                "token_type": "bearer",
                "user": user_response,
                "must_change_password": bool(u.get("password_is_temporary")),
            }

        # 2FA required: send email code if applicable, return challenge token
        if u.get("two_factor_method") == "email":
            await _start_email_2fa_challenge(u)
        challenge_token = _create_challenge_token(u["id"], ttl_min=5)
        return {
            "challenge_required": True,
            "method": u.get("two_factor_method"),
            "challenge_token": challenge_token,
        }

    @router.post("/login/verify-2fa")
    async def login_verify_2fa(body: LoginChallengeVerifyRequest, request: Request, response: Response):
        payload = _decode_challenge_token(body.challenge_token)
        if not payload:
            raise HTTPException(status_code=400, detail="Session de vérification expirée")
        u = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not u:
            raise HTTPException(status_code=400, detail="Utilisateur introuvable")
        if not await _verify_2fa_code_for(u, body.code):
            raise HTTPException(status_code=400, detail="Code de vérification invalide")
        access = create_access_token(u["id"], u["email"], u["role"])
        refresh = create_refresh_token(u["id"])
        if set_auth_cookies:
            set_auth_cookies(response, access, refresh)
        await create_audit_log("user_login_2fa", "user", u["id"], user=u, request=request)
        user_response = {k: v for k, v in u.items() if k != "password_hash"}
        return {
            "access_token": access,
            "refresh_token": refresh,
            "token_type": "bearer",
            "user": user_response,
            "must_change_password": bool(u.get("password_is_temporary")),
        }

    return router

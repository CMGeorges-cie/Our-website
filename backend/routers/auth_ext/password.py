"""Password change, email change, forgot/reset password routes."""
from __future__ import annotations

import secrets
from datetime import timedelta

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request

from config.brand import Brand

from .common import (
    RATE_LIMIT_RESET_MAX,
    RATE_LIMIT_RESET_WINDOW_MIN,
    RESET_TOKEN_TTL_MIN,
    ChangeEmailRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    hash_password,
    now_utc,
    send_resend_email,
    verify_password,
)


def register_password_routes(router: APIRouter, *, db, get_current_user, create_audit_log, frontend_url: str) -> None:
    @router.post("/change-password")
    async def change_password(
        body: ChangePasswordRequest,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        if not verify_password(body.current_password, db_user.get("password_hash", "")):
            raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
        if verify_password(body.new_password, db_user.get("password_hash", "")):
            raise HTTPException(
                status_code=400,
                detail="Le nouveau mot de passe doit être différent de l'ancien",
            )
        await db.users.update_one(
            {"id": user["id"]},
            {
                "$set": {
                    "password_hash": hash_password(body.new_password),
                    "password_changed_at": now_utc().isoformat(),
                    "password_is_temporary": False,
                    "password_must_change_before": None,
                }
            },
        )
        await create_audit_log("password_changed", "user", user["id"], user=user, request=request)
        return {"success": True, "message": "Mot de passe mis à jour"}

    @router.post("/change-email")
    async def change_email(
        body: ChangeEmailRequest,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        if not verify_password(body.current_password, db_user.get("password_hash", "")):
            raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")

        new_email = body.new_email.strip().lower()
        if new_email == (db_user.get("email") or "").lower():
            raise HTTPException(status_code=400, detail="Le nouveau courriel est identique à l'actuel")
        existing = await db.users.find_one(
            {"email": new_email, "id": {"$ne": user["id"]}}, {"_id": 0, "id": 1}
        )
        if existing:
            raise HTTPException(status_code=409, detail="Ce courriel est déjà utilisé")

        old_email = db_user.get("email")
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"email": new_email, "email_changed_at": now_utc().isoformat()}},
        )
        await create_audit_log("email_changed", "user", user["id"], user=user, request=request)

        if old_email:
            html = f"""
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
              <h2 style="color:#1a365d;">Adresse courriel modifiée</h2>
              <p>Le courriel associé à votre compte {Brand.NAME} vient d'être changé pour&nbsp;: <strong>{new_email}</strong>.</p>
              <p style="color:#c0392b;">Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement le support.</p>
              <p style="color:#999;font-size:11px;">{Brand.NAME} · {Brand.PHONE_DISPLAY} · {Brand.EMAIL}</p>
            </div>
            """
            await send_resend_email(old_email, f"Adresse courriel modifiée — {Brand.NAME}", html)

        return {"success": True, "email": new_email}

    @router.post("/forgot-password")
    async def forgot_password(body: ForgotPasswordRequest, request: Request):
        ip = request.client.host if request.client else "unknown"
        window_start = now_utc() - timedelta(minutes=RATE_LIMIT_RESET_WINDOW_MIN)
        recent = await db.password_reset_attempts.count_documents(
            {"ip": ip, "email": body.email, "created_at": {"$gte": window_start.isoformat()}}
        )
        if recent >= RATE_LIMIT_RESET_MAX:
            raise HTTPException(
                status_code=429, detail="Trop de tentatives. Réessayez dans quelques minutes."
            )
        await db.password_reset_attempts.insert_one(
            {"ip": ip, "email": body.email, "created_at": now_utc().isoformat()}
        )

        generic = {"success": True, "message": "Si un compte existe, un courriel a été envoyé."}
        user = await db.users.find_one({"email": body.email}, {"_id": 0})
        if not user:
            return generic

        await db.password_reset_tokens.update_many(
            {"user_id": user["id"], "used_at": None},
            {"$set": {"used_at": now_utc().isoformat(), "invalidated": True}},
        )

        token_value = secrets.token_urlsafe(32)
        token_hash = bcrypt.hashpw(token_value.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        await db.password_reset_tokens.insert_one(
            {
                "user_id": user["id"],
                "token_hash": token_hash,
                "expires_at": (now_utc() + timedelta(minutes=RESET_TOKEN_TTL_MIN)).isoformat(),
                "used_at": None,
                "created_at": now_utc().isoformat(),
            }
        )

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
        await send_resend_email(user["email"], f"Réinitialisation de mot de passe — {Brand.NAME}", html)
        return generic

    @router.post("/reset-password")
    async def reset_password(body: ResetPasswordRequest, request: Request):
        candidates = await db.password_reset_tokens.find(
            {"used_at": None, "expires_at": {"$gte": now_utc().isoformat()}},
            {"_id": 0},
        ).to_list(length=200)

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

        await db.password_reset_tokens.update_one(
            {"user_id": matched["user_id"], "token_hash": matched["token_hash"]},
            {"$set": {"used_at": now_utc().isoformat()}},
        )
        await db.users.update_one(
            {"id": user["id"]},
            {
                "$set": {
                    "password_hash": hash_password(body.new_password),
                    "password_changed_at": now_utc().isoformat(),
                    "password_is_temporary": False,
                    "password_must_change_before": None,
                }
            },
        )
        await create_audit_log("password_reset", "user", user["id"], user=user, request=request)
        return {
            "success": True,
            "message": "Mot de passe réinitialisé",
            "role": user.get("role", "client"),
        }

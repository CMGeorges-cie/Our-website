"""2FA setup, activation and disable routes."""
from __future__ import annotations

import pyotp
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from .common import (
    TwoFADisableRequest,
    TwoFAVerifyRequest,
    build_totp_qr_data_url,
    now_utc,
    verify_2fa_code_for,
    verify_password,
)


class TwoFAEmailActivateRequest(BaseModel):
    """Require current password to prevent token-theft → 2FA-lockout attacks."""
    current_password: str = Field(min_length=1)


def register_two_factor_routes(router: APIRouter, *, db, get_current_user, create_audit_log) -> None:
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
            {
                "$set": {
                    "totp_secret_pending": secret,
                    "totp_secret_pending_at": now_utc().isoformat(),
                }
            },
        )
        qr_data_url, uri = build_totp_qr_data_url(secret, user["email"])
        return {"qr_code": qr_data_url, "secret": secret, "uri": uri}

    @router.post("/2fa/totp/activate")
    async def two_fa_totp_activate(
        body: TwoFAVerifyRequest,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        pending = u.get("totp_secret_pending")
        if not pending:
            raise HTTPException(status_code=400, detail="Aucune configuration 2FA en attente")
        totp = pyotp.TOTP(pending)
        if not totp.verify(body.code, valid_window=1):
            raise HTTPException(status_code=400, detail="Code invalide")
        await db.users.update_one(
            {"id": user["id"]},
            {
                "$set": {
                    "totp_secret": pending,
                    "two_factor_enabled": True,
                    "two_factor_method": "totp",
                },
                "$unset": {"totp_secret_pending": "", "totp_secret_pending_at": ""},
            },
        )
        await create_audit_log("2fa_totp_activated", "user", user["id"], user=user, request=request)
        return {"success": True}

    @router.post("/2fa/email/activate")
    async def two_fa_email_activate(
        body: TwoFAEmailActivateRequest,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        # Hardening: require current password to prevent a stolen-token attacker
        # from enabling 2FA on an email they don't control and locking out the
        # legitimate owner. Matches the threat model of /2fa/disable.
        u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
        if not verify_password(body.current_password, u.get("password_hash", "")):
            raise HTTPException(status_code=400, detail="Mot de passe incorrect")
        await db.users.update_one(
            {"id": user["id"]},
            {
                "$set": {"two_factor_enabled": True, "two_factor_method": "email"},
                "$unset": {"totp_secret": ""},
            },
        )
        await create_audit_log("2fa_email_activated", "user", user["id"], user=user, request=request)
        return {"success": True}

    @router.post("/2fa/disable")
    async def two_fa_disable(
        body: TwoFADisableRequest,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        if not verify_password(body.current_password, u.get("password_hash", "")):
            raise HTTPException(status_code=400, detail="Mot de passe incorrect")
        ok = await verify_2fa_code_for(db, u, body.code)
        if not ok:
            raise HTTPException(status_code=400, detail="Code 2FA invalide")
        await db.users.update_one(
            {"id": u["id"]},
            {
                "$set": {"two_factor_enabled": False, "two_factor_method": None},
                "$unset": {"totp_secret": ""},
            },
        )
        await create_audit_log("2fa_disabled", "user", u["id"], user=u, request=request)
        return {"success": True}

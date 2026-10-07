"""Login challenge flow (2FA-aware) and verify-2fa routes."""
from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request, Response

from .common import (
    LoginChallengeRequest,
    LoginChallengeVerifyRequest,
    create_challenge_token,
    decode_challenge_token,
    enforce_password_policy,
    start_email_2fa_challenge,
    verify_2fa_code_for,
    verify_password,
)


MAX_2FA_FAILS = 5


def register_login_challenge_routes(
    router: APIRouter,
    *,
    db,
    create_access_token,
    create_refresh_token,
    create_audit_log,
    set_auth_cookies=None,
) -> None:
    @router.post("/login/challenge")
    async def login_challenge(
        body: LoginChallengeRequest, request: Request, response: Response
    ):
        """First step of the 2FA-aware login. Returns either a session OR a challenge."""
        u = await db.users.find_one({"email": body.email}, {"_id": 0})
        if not u or not verify_password(body.password, u.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Identifiants invalides")
        if not u.get("is_active", True):
            raise HTTPException(status_code=401, detail="Compte désactivé")
        await enforce_password_policy(u)

        if not u.get("two_factor_enabled"):
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

        if u.get("two_factor_method") == "email":
            await start_email_2fa_challenge(db, u)
        challenge_token = create_challenge_token(u["id"], ttl_min=5)
        return {
            "challenge_required": True,
            "method": u.get("two_factor_method"),
            "challenge_token": challenge_token,
        }

    @router.post("/login/verify-2fa")
    async def login_verify_2fa(
        body: LoginChallengeVerifyRequest, request: Request, response: Response
    ):
        payload = decode_challenge_token(body.challenge_token)
        if not payload:
            raise HTTPException(status_code=400, detail="Session de vérification expirée")
        u = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not u:
            raise HTTPException(status_code=400, detail="Utilisateur introuvable")
        since = datetime.now(timezone.utc) - timedelta(minutes=15)
        token_hash = hashlib.sha256(body.challenge_token.encode()).hexdigest()
        if await db.used_2fa_challenges.find_one({"token_hash": token_hash}):
            raise HTTPException(status_code=400, detail="Session de vérification déjà utilisée")
        fails = await db.twofa_attempts.count_documents({"user_id": u["id"], "at": {"$gte": since.isoformat()}})
        if fails >= MAX_2FA_FAILS:
            raise HTTPException(status_code=429, detail="Trop de tentatives. Réessayez dans 15 minutes.")
        if not await verify_2fa_code_for(db, u, body.code):
            await db.twofa_attempts.insert_one({"user_id": u["id"], "at": datetime.now(timezone.utc).isoformat()})
            raise HTTPException(status_code=400, detail="Code de vérification invalide")
        await db.twofa_attempts.delete_many({"user_id": u["id"]})
        await db.used_2fa_challenges.insert_one({"token_hash": token_hash, "at": datetime.now(timezone.utc).isoformat()})
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

"""
Authentication enhancements router — Déco Touché.

Composed from focused submodules:
  • common.py          — shared helpers, constants, Pydantic models
  • password.py        — change/forgot/reset password + change email
  • two_factor.py      — TOTP & email 2FA setup/activate/disable
  • login_challenge.py — 2FA-aware login flow

`build_auth_router(...)` keeps the original signature for `server.py` compatibility.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter

from .login_challenge import register_login_challenge_routes
from .password import register_password_routes
from .two_factor import register_two_factor_routes

logger = logging.getLogger(__name__)

__all__ = ["build_auth_router"]


def build_auth_router(
    db,
    get_current_user,
    create_access_token,
    create_refresh_token,
    create_audit_log,
    frontend_url: str,
    set_auth_cookies=None,
    clear_auth_cookies=None,
) -> APIRouter:
    """
    Build the auth-extensions router. Dependencies are passed as args to avoid
    a circular import with server.py.
    """
    # Safety: never email a reset link pointing to the preview environment.
    PROD_URL = "https://cmgeorges.ca"
    if (
        not frontend_url
        or "preview.emergentagent" in frontend_url
        or "localhost" in frontend_url
    ):
        logger.warning(
            f"[auth] FRONTEND_URL='{frontend_url}' looks non-production; "
            f"falling back to {PROD_URL} for password reset emails."
        )
        frontend_url = PROD_URL

    router = APIRouter(prefix="/auth", tags=["Auth"])

    register_password_routes(
        router,
        db=db,
        get_current_user=get_current_user,
        create_audit_log=create_audit_log,
        frontend_url=frontend_url,
    )
    register_two_factor_routes(
        router,
        db=db,
        get_current_user=get_current_user,
        create_audit_log=create_audit_log,
    )
    register_login_challenge_routes(
        router,
        db=db,
        create_access_token=create_access_token,
        create_refresh_token=create_refresh_token,
        create_audit_log=create_audit_log,
        set_auth_cookies=set_auth_cookies,
    )
    return router

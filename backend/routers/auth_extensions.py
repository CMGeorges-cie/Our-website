"""
Backwards-compat shim — auth has been split into the `routers/auth_ext/` package.
This module re-exports `build_auth_router` so existing imports continue to work:

    from routers.auth_extensions import build_auth_router
"""
from routers.auth_ext import build_auth_router  # noqa: F401

__all__ = ["build_auth_router"]

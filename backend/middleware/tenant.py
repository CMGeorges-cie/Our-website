"""
Multi-Tenant Middleware for ServiceFlow
Extracts tenant_id from authenticated user and provides it to all routes
"""

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
import os

JWT_SECRET = os.environ.get('JWT_SECRET', 'cmgeorges-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"

security = HTTPBearer()


class TenantContext:
    """Context object that holds tenant information for the current request"""
    
    def __init__(self, tenant_id: str, user_id: str = None, user_role: str = None):
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.user_role = user_role
    
    def get_filter(self) -> dict:
        """Returns a MongoDB filter dict that includes tenant_id"""
        return {"tenant_id": self.tenant_id}
    
    def apply_to_query(self, query: dict) -> dict:
        """Merges tenant filter with existing query"""
        return {**query, "tenant_id": self.tenant_id}
    
    def apply_to_document(self, doc: dict) -> dict:
        """Ensures document has tenant_id before insert"""
        doc["tenant_id"] = self.tenant_id
        return doc


async def get_tenant_context(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TenantContext:
    """
    Dependency that extracts tenant context from JWT token.
    All authenticated routes should depend on this to ensure proper data isolation.
    """
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        tenant_id = payload.get("tenant_id", "default")
        user_id = payload.get("sub")
        user_role = payload.get("role")
        
        return TenantContext(
            tenant_id=tenant_id,
            user_id=user_id,
            user_role=user_role
        )
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_optional_tenant_context(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = None
) -> Optional[TenantContext]:
    """
    Optional tenant context for routes that may or may not be authenticated.
    Returns None if no valid token is provided.
    """
    if not credentials:
        return None
    
    try:
        return await get_tenant_context(request, credentials)
    except HTTPException:
        return None


def require_role(*allowed_roles: str):
    """
    Factory that creates a dependency requiring specific roles.
    Usage: Depends(require_role("admin", "staff"))
    """
    async def role_checker(tenant_ctx: TenantContext = Depends(get_tenant_context)):
        if tenant_ctx.user_role not in allowed_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return tenant_ctx
    
    return role_checker

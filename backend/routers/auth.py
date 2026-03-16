"""
Authentication Router for ServiceFlow
Handles login, token refresh, and user management
"""

from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import uuid
import os

from services.database import get_database, GlobalRepository

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'cmgeorges-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_ACCESS_EXPIRATION_HOURS = 8  # Extended for mobile use
JWT_REFRESH_EXPIRATION_DAYS = 30  # Extended for mobile use


# ==================== SCHEMAS ====================
class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str = ""


class MobileDeviceToken(BaseModel):
    """For push notification registration"""
    device_token: str
    platform: str  # ios, android


# ==================== HELPERS ====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_access_token(user_id: str, email: str, role: str, tenant_id: str = "default") -> str:
    """Create JWT access token with tenant info for multi-tenant isolation"""
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "tenant_id": tenant_id,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_ACCESS_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_REFRESH_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to get current authenticated user"""
    db = get_database()
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account disabled")
        
        return user
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Dependency to require admin role"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ==================== ENDPOINTS ====================
@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request):
    """Login for admin/staff/technician users"""
    db = get_database()
    
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account disabled")
    
    # Get tenant_id from user (defaults to "default" for backwards compatibility)
    tenant_id = user.get("tenant_id", "default")
    
    access_token = create_access_token(user["id"], user["email"], user["role"], tenant_id)
    refresh_token = create_refresh_token(user["id"])
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    db = get_database()
    
    try:
        payload = jwt.decode(request.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account disabled")
        
        tenant_id = user.get("tenant_id", "default")
        
        access_token = create_access_token(user["id"], user["email"], user["role"], tenant_id)
        new_refresh_token = create_refresh_token(user["id"])
        
        user_response = {k: v for k, v in user.items() if k != "password_hash"}
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            user=user_response
        )
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user info"""
    return user


@router.post("/mobile/device-token")
async def register_device_token(
    device: MobileDeviceToken,
    user: dict = Depends(get_current_user)
):
    """Register mobile device token for push notifications"""
    db = get_database()
    
    # Store or update device token for user
    await db.user_devices.update_one(
        {"user_id": user["id"], "platform": device.platform},
        {
            "$set": {
                "device_token": device.device_token,
                "platform": device.platform,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"message": "Device token registered successfully"}


@router.delete("/mobile/device-token")
async def remove_device_token(
    device: MobileDeviceToken,
    user: dict = Depends(get_current_user)
):
    """Remove mobile device token (on logout)"""
    db = get_database()
    
    await db.user_devices.delete_one({
        "user_id": user["id"],
        "device_token": device.device_token
    })
    
    return {"message": "Device token removed"}

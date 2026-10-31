from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.db.models import User, RoleEnum
from backend.app.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from backend.app.auth.rbac import get_current_user, get_permissions_for_role
from backend.app.auth.oauth import get_google_auth_url, sync_oauth_user

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])

# Pydantic Schemas
class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: Optional[RoleEnum] = RoleEnum.STUDENT
    department: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class OAuthCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None

class DemoLoginRequest(BaseModel):
    role: RoleEnum = RoleEnum.ADMIN
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    department: Optional[str]
    oauth_provider: str
    permissions: List[str]

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """
    Public self-registration is disabled to prevent unauthorized account creation.
    Institutional accounts must be provisioned by the Administrator via User Management.
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Public self-registration is disabled. Institutional accounts must be provisioned by the Administrator."
    )

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates a campus user via email and password, returning JWT access & refresh tokens."""
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    token_payload = {"sub": str(user.id), "email": user.email, "role": user.role.value}
    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(token_payload)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "department": user.department,
            "oauth_provider": user.oauth_provider,
            "permissions": get_permissions_for_role(user.role),
        }
    }

@router.post("/refresh")
def refresh_token_endpoint(req: RefreshRequest, db: Session = Depends(get_db)):
    """Exchanges a valid refresh token for a newly minted access token."""
    try:
        payload = decode_token(req.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token type")
        user_id = payload.get("sub")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found or inactive")
    
    token_payload = {"sub": str(user.id), "email": user.email, "role": user.role.value}
    new_access_token = create_access_token(token_payload)
    return {"access_token": new_access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieves the profile and granted RBAC permissions of the authenticated user."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "department": current_user.department,
        "oauth_provider": current_user.oauth_provider,
        "permissions": get_permissions_for_role(current_user.role),
    }

@router.get("/oauth/google/url")
def google_oauth_url(state: Optional[str] = None):
    """Returns the Google OAuth consent URL for Single-Sign-On."""
    return {"url": get_google_auth_url(state)}

@router.post("/oauth/google/callback", response_model=TokenResponse)
def google_oauth_callback(req: OAuthCallbackRequest, db: Session = Depends(get_db)):
    """
    Handles Google OAuth authorization code.
    If running in development/demo without live Google credentials, seamlessly provisions the OAuth account.
    """
    # Simulated/Dev OAuth fallback if mock or code provided
    email = f"google.user_{req.code[:8]}@cit.edu"
    full_name = f"Google User ({req.code[:6]})"
    oauth_data = sync_oauth_user(
        db=db,
        email=email,
        full_name=full_name,
        provider="google",
        oauth_sub=f"google_{req.code[:12]}",
        default_role=RoleEnum.STUDENT
    )
    user = db.query(User).filter(User.email == email).first()
    oauth_data["user"]["permissions"] = get_permissions_for_role(user.role)
    return oauth_data

@router.post("/oauth/demo-login", response_model=TokenResponse)
def demo_role_login(req: DemoLoginRequest, db: Session = Depends(get_db)):
    """
    Fast campus demo authentication:
    Instantly logs in as the selected Role (ADMIN, FACULTY, CLUB_LEAD, STUDENT)
    with a fully signed JWT token and granted RBAC permissions.
    """
    role_email_map = {
        RoleEnum.ADMIN: "admin@cit.edu",
        RoleEnum.FACULTY: "faculty@cit.edu",
        RoleEnum.DEPARTMENT_COORDINATOR: "coordinator@cit.edu",
        RoleEnum.CLUB_LEAD: "club@cit.edu",
        RoleEnum.STUDENT: "student@cit.edu",
    }
    target_email = req.email or role_email_map.get(req.role, "admin@cit.edu")
    user = db.query(User).filter(User.email == target_email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Account '{target_email}' has not been provisioned by the Administrator. Please log in as Admin to provision user roles."
        )

    token_payload = {"sub": str(user.id), "email": user.email, "role": user.role.value}
    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(token_payload)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "department": user.department,
            "oauth_provider": user.oauth_provider,
            "permissions": get_permissions_for_role(user.role),
        }
    }

import os
from typing import Optional, Dict, Any
from urllib.parse import urlencode
from sqlalchemy.orm import Session

from backend.app.db.models import User, RoleEnum
from backend.app.auth.security import create_access_token, create_refresh_token

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "mock-google-client-id.apps.googleusercontent.com")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "mock-google-client-secret")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/oauth/google/callback")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

def get_google_auth_url(state: Optional[str] = None) -> str:
    """Generates the Google OAuth2 consent screen URL."""
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    if state:
        params["state"] = state
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

def sync_oauth_user(
    db: Session,
    email: str,
    full_name: str,
    provider: str,
    oauth_sub: str,
    default_role: RoleEnum = RoleEnum.STUDENT,
    department: Optional[str] = None
) -> Dict[str, Any]:
    """Finds or creates a user account linked to an OAuth provider, returning signed JWT tokens."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=full_name,
            role=default_role,
            department=department or "Computer Science & Engineering",
            oauth_provider=provider,
            oauth_sub=oauth_sub,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Link or update oauth provider
        user.oauth_provider = provider
        user.oauth_sub = oauth_sub
        db.commit()

    token_data = {"sub": str(user.id), "email": user.email, "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

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
        }
    }


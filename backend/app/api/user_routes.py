import csv
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.db.models import User, RoleEnum
from backend.app.auth.security import hash_password
from backend.app.auth.rbac import require_role

router = APIRouter(prefix="/api/admin/users", tags=["Admin User Management"])


class CreateUserSchema(BaseModel):
    email: str
    full_name: str
    role: RoleEnum = RoleEnum.STUDENT
    department: Optional[str] = "Academics"
    password: Optional[str] = "Campus@123"


class UserItemResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    department: Optional[str]
    is_active: bool
    oauth_provider: str
    created_at: str


class BatchUserItem(BaseModel):
    email: str
    full_name: str
    role: str = "STUDENT"
    department: Optional[str] = "Academics"
    password: Optional[str] = "Campus@123"


class BatchUserRequest(BaseModel):
    users: Optional[List[BatchUserItem]] = None
    raw_text: Optional[str] = None  # CSV or comma-separated lines: email, full_name, role, password, department


def normalize_role(role_str: str) -> RoleEnum:
    cleaned = (role_str or "").strip().upper().replace(" ", "_")
    if cleaned in ["ADMIN", "ADMINISTRATOR"]:
        return RoleEnum.ADMIN
    elif cleaned in ["FACULTY", "PROFESSOR", "TEACHER", "INSTRUCTOR"]:
        return RoleEnum.FACULTY
    elif cleaned in ["CLUB", "CLUB_LEAD", "CLUB_REPRESENTATIVE", "CLUB_REP"]:
        return RoleEnum.CLUB_LEAD
    return RoleEnum.STUDENT


@router.get("", response_model=List[UserItemResponse])
def list_all_users(
    current_user: User = Depends(require_role([RoleEnum.ADMIN])),
    db: Session = Depends(get_db)
):
    """
    RBAC Protected (Admin only):
    Returns all campus users provisioned in the database.
    """
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        UserItemResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role.value if hasattr(u.role, "value") else str(u.role),
            department=u.department,
            is_active=u.is_active,
            oauth_provider=u.oauth_provider,
            created_at=u.created_at.isoformat() if u.created_at else ""
        )
        for u in users
    ]


@router.post("", response_model=UserItemResponse, status_code=status.HTTP_201_CREATED)
def create_single_user(
    req: CreateUserSchema,
    current_user: User = Depends(require_role([RoleEnum.ADMIN])),
    db: Session = Depends(get_db)
):
    """
    RBAC Protected (Admin only):
    Provisions a new authorized campus user with a designated role.
    """
    email_clean = req.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{email_clean}' already exists."
        )

    new_user = User(
        email=email_clean,
        full_name=req.full_name.strip(),
        role=req.role,
        department=req.department.strip() if req.department else "General Academics",
        hashed_password=hash_password(req.password or "Campus@123"),
        is_active=True,
        oauth_provider="admin-provisioned"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserItemResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role.value if hasattr(new_user.role, "value") else str(new_user.role),
        department=new_user.department,
        is_active=new_user.is_active,
        oauth_provider=new_user.oauth_provider,
        created_at=new_user.created_at.isoformat() if new_user.created_at else ""
    )


@router.post("/batch")
def batch_create_users(
    req: BatchUserRequest,
    current_user: User = Depends(require_role([RoleEnum.ADMIN])),
    db: Session = Depends(get_db)
):
    """
    RBAC Protected (Admin only):
    Provisions a list of users with assigned roles in bulk.
    Accepts structured JSON or raw CSV/multi-line text:
    `email, full_name, role, password, department`
    """
    candidates = []

    # 1. Parse JSON list if provided
    if req.users:
        for u in req.users:
            candidates.append({
                "email": u.email.strip().lower(),
                "full_name": u.full_name.strip(),
                "role": normalize_role(u.role),
                "password": u.password.strip() if u.password else "Campus@123",
                "department": u.department.strip() if u.department else "Academics"
            })

    # 2. Parse raw CSV / multi-line text if provided
    if req.raw_text and req.raw_text.strip():
        lines = [line.strip() for line in req.raw_text.splitlines() if line.strip()]
        for line in lines:
            # Skip comment or header lines
            if line.startswith("#") or line.lower().startswith("email,"):
                continue
            reader = csv.reader([line])
            parts = next(reader)
            if not parts or not parts[0].strip():
                continue
            
            email = parts[0].strip().lower()
            full_name = parts[1].strip() if len(parts) > 1 and parts[1].strip() else email.split("@")[0].title()
            role_str = parts[2].strip() if len(parts) > 2 and parts[2].strip() else "STUDENT"
            pwd = parts[3].strip() if len(parts) > 3 and parts[3].strip() else "Campus@123"
            dept = parts[4].strip() if len(parts) > 4 and parts[4].strip() else "Academics"

            candidates.append({
                "email": email,
                "full_name": full_name,
                "role": normalize_role(role_str),
                "password": pwd,
                "department": dept
            })

    if not candidates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid user entries provided. Please provide either a list of users or text lines."
        )

    created_users = []
    skipped_emails = []

    for item in candidates:
        existing = db.query(User).filter(User.email == item["email"]).first()
        if existing:
            skipped_emails.append(item["email"])
            continue

        u = User(
            email=item["email"],
            full_name=item["full_name"],
            role=item["role"],
            department=item["department"],
            hashed_password=hash_password(item["password"]),
            is_active=True,
            oauth_provider="admin-batch-provisioned"
        )
        db.add(u)
        created_users.append(u)

    db.commit()
    for u in created_users:
        db.refresh(u)

    return {
        "status": "success",
        "created_count": len(created_users),
        "skipped_count": len(skipped_emails),
        "skipped_emails": skipped_emails,
        "message": f"Successfully provisioned {len(created_users)} users ({len(skipped_emails)} skipped as duplicates)."
    }


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(require_role([RoleEnum.ADMIN])),
    db: Session = Depends(get_db)
):
    """
    RBAC Protected (Admin only):
    Removes an authorized user from the database. Prevents self-deletion.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot delete their own active account."
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    db.delete(target_user)
    db.commit()
    return {"status": "success", "message": f"User '{target_user.email}' removed from system."}


@router.patch("/{user_id}/status")
def toggle_user_status(
    user_id: int,
    current_user: User = Depends(require_role([RoleEnum.ADMIN])),
    db: Session = Depends(get_db)
):
    """
    RBAC Protected (Admin only):
    Toggles the active/deactivated status of a user account.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own active administrator account."
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    target_user.is_active = not target_user.is_active
    db.commit()
    db.refresh(target_user)

    state_label = "activated" if target_user.is_active else "deactivated"
    return {
        "status": "success",
        "is_active": target_user.is_active,
        "message": f"User '{target_user.email}' has been {state_label}."
    }


@router.post("/{user_id}/approve")
def approve_user_registration(
    user_id: int,
    current_user: User = Depends(require_role([RoleEnum.ADMIN])),
    db: Session = Depends(get_db)
):
    """
    RBAC Protected (Admin only):
    Approves a pending self-registered user account, granting full institutional access.
    """
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found.")

    target.is_active = True
    db.commit()
    db.refresh(target)
    return {
        "status": "success",
        "message": f"Account for '{target.full_name}' ({target.email}) has been approved and activated.",
        "user_id": target.id,
        "is_active": target.is_active
    }


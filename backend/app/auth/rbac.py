import enum
from typing import List, Set
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.db.models import User, RoleEnum
from backend.app.auth.security import decode_token

security_scheme = HTTPBearer(auto_error=False)

class PermissionEnum(str, enum.Enum):
    # Schedule
    SCHEDULE_VIEW = "schedule:view"
    SCHEDULE_EDIT = "schedule:edit"
    SCHEDULE_SOLVE = "schedule:solve"
    
    # Exams
    EXAM_VIEW = "exam:view"
    EXAM_SOLVE = "exam:solve"
    
    # Fest Bookings
    BOOKING_VIEW = "booking:view"
    BOOKING_REQUEST = "booking:request"
    BOOKING_APPROVE = "booking:approve"
    
    # Disruption
    DISRUPTION_VIEW = "disruption:view"
    DISRUPTION_TRIGGER = "disruption:trigger"
    DISRUPTION_COMMIT = "disruption:commit"
    
    # Administration
    USER_MANAGE = "user:manage"

# Explicit Role -> Permissions Matrix
ROLE_PERMISSIONS: dict[RoleEnum, Set[PermissionEnum]] = {
    RoleEnum.ADMIN: {
        PermissionEnum.SCHEDULE_VIEW,
        PermissionEnum.SCHEDULE_EDIT,
        PermissionEnum.SCHEDULE_SOLVE,
        PermissionEnum.EXAM_VIEW,
        PermissionEnum.EXAM_SOLVE,
        PermissionEnum.BOOKING_VIEW,
        PermissionEnum.BOOKING_REQUEST,
        PermissionEnum.BOOKING_APPROVE,
        PermissionEnum.DISRUPTION_VIEW,
        PermissionEnum.DISRUPTION_TRIGGER,
        PermissionEnum.DISRUPTION_COMMIT,
        PermissionEnum.USER_MANAGE,
    },
    RoleEnum.FACULTY: {
        PermissionEnum.SCHEDULE_VIEW,
        PermissionEnum.EXAM_VIEW,
        PermissionEnum.BOOKING_VIEW,
        PermissionEnum.BOOKING_REQUEST,
        PermissionEnum.DISRUPTION_VIEW,
        PermissionEnum.DISRUPTION_TRIGGER,
    },
    RoleEnum.DEPARTMENT_COORDINATOR: {
        PermissionEnum.SCHEDULE_VIEW,
        PermissionEnum.SCHEDULE_EDIT,
        PermissionEnum.EXAM_VIEW,
        PermissionEnum.BOOKING_VIEW,
        PermissionEnum.BOOKING_REQUEST,
        PermissionEnum.DISRUPTION_VIEW,
        PermissionEnum.DISRUPTION_TRIGGER,
    },
    RoleEnum.CLUB_LEAD: {
        PermissionEnum.SCHEDULE_VIEW,
        PermissionEnum.BOOKING_VIEW,
        PermissionEnum.BOOKING_REQUEST,
    },
    RoleEnum.STUDENT: {
        PermissionEnum.SCHEDULE_VIEW,
        PermissionEnum.EXAM_VIEW,
        PermissionEnum.BOOKING_VIEW,
    },
}

def get_permissions_for_role(role: RoleEnum) -> List[str]:
    """Returns the list of granted permission keys for a given role."""
    perms = ROLE_PERMISSIONS.get(role, set())
    return [p.value for p in perms]

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Validates the Bearer JWT token and returns the authenticated User."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive account")
    
    return user

def require_role(*allowed_roles: RoleEnum):
    """Enforces that the authenticated user belongs to one of the specified roles."""
    roles = []
    for r in allowed_roles:
        if isinstance(r, (list, tuple, set)):
            roles.extend(r)
        else:
            roles.append(r)

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role
        role_vals = [getattr(x, "value", str(x)) for x in roles]
        user_val = getattr(user_role, "value", str(user_role))
        if user_role not in roles and user_val not in role_vals:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Required role '{role_vals}', your role is '{user_val}'"
            )
        return current_user
    return role_checker

def require_permission(*required_permissions: PermissionEnum):
    """Enforces that the authenticated user possesses all specified permissions."""
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_perms = ROLE_PERMISSIONS.get(current_user.role, set())
        for perm in required_permissions:
            if perm not in user_perms:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: Missing required permission '{perm.value}'"
                )
        return current_user
    return permission_checker


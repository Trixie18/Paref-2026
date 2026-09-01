from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import require_admin_role
from app.models import Admin
from app.repositories import Repository, get_repository
from app.schemas.admin import AuditLogEntryResponse

router = APIRouter(prefix="/api/admin/audit-log", tags=["admin"])


@router.get("", response_model=list[AuditLogEntryResponse])
def get_audit_log(_admin: Annotated[Admin, Depends(require_admin_role)], repo: Annotated[Repository, Depends(get_repository)]):
    admins_by_id = {a.admin_id: a for a in repo.get_admins()}
    return [
        AuditLogEntryResponse(
            log_id=e.log_id, timestamp=e.timestamp, admin_id=e.admin_id,
            admin_name=admins_by_id[e.admin_id].name if e.admin_id in admins_by_id else "Unknown",
            action=e.action, entity_type=e.entity_type, entity_id=e.entity_id, details=e.details,
        )
        for e in repo.get_audit_log()
    ]

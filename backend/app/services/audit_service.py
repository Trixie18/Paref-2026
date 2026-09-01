from datetime import datetime, timezone

from app.models import Admin, AuditLogEntry
from app.repositories import Repository


def record(repo: Repository, admin: Admin, action: str, entity_type: str, entity_id: str, details: str = "") -> None:
    repo.create_audit_log(
        AuditLogEntry(
            log_id="",
            timestamp=datetime.now(timezone.utc),
            admin_id=admin.admin_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
    )

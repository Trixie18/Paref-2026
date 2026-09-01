from datetime import datetime

from pydantic import BaseModel


class AuditLogEntry(BaseModel):
    """Mirrors a row in the Audit_Log sheet."""

    log_id: str
    timestamp: datetime
    admin_id: str
    action: str
    entity_type: str
    entity_id: str
    details: str = ""

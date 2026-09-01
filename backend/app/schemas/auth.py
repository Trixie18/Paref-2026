from datetime import datetime

from pydantic import BaseModel, field_validator


class RegisterRequest(BaseModel):
    name: str
    phone: str

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def phone_valid(cls, v: str) -> str:
        digits = "".join(ch for ch in v if ch.isdigit())
        if len(digits) < 7:
            raise ValueError("Enter a valid mobile number")
        return v.strip()


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    phone: str | None = None


class ProfileResponse(BaseModel):
    user_id: str
    name: str
    email: str
    phone: str
    created_at: datetime
    active: bool


class AdminProfileResponse(BaseModel):
    admin_id: str
    name: str
    email: str
    role: str

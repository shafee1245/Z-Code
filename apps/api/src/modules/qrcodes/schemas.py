from pydantic import BaseModel, Field


class QRCodeRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2048)
    foreground: str = Field(default="#123b32", pattern=r"^#[0-9a-fA-F]{6}$")
    background: str = Field(default="#ffffff", pattern=r"^#[0-9a-fA-F]{6}$")
    size: int = Field(default=512, ge=128, le=2048)

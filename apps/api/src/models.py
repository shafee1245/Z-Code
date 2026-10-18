from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, DateTime, Text, JSON, ForeignKey, Integer, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
import os
import uuid

Base = declarative_base()

DATABASE_URL = os.getenv("DATABASE_URL", "")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False)
    subscription_tier = Column(String(50), nullable=False, default="free")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class QRCode(Base):
    __tablename__ = "qrcodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    target_url = Column(Text, nullable=False)
    short_slug = Column(String(255), nullable=False, unique=True, index=True)
    style_config = Column(JSON, nullable=False, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    scan_analytics = relationship("ScanAnalytics", back_populates="qrcode", cascade="all, delete-orphan")


class ScanAnalytics(Base):
    __tablename__ = "scan_analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    qrcode_id = Column(UUID(as_uuid=True), ForeignKey("qrcodes.id", ondelete="CASCADE"), nullable=False)
    scanned_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String(45))
    user_agent = Column(Text)
    device_type = Column(String(100))
    country = Column(String(100))

    qrcode = relationship("QRCode", back_populates="scan_analytics")


# Pydantic models for API requests/responses
class QRCodeCreateRequest(BaseModel):
    target_url: str
    fill_color: str = "#123b32"
    back_color: str = "#ffffff"
    rounded_modules: bool = False
    center_logo_overlay: bool = False
    title: str = "My QR Code"
    user_id: Optional[str] = None


class QRCodeCreateResponse(BaseModel):
    id: str
    short_slug: str
    short_url: str
    qr_code_image: str  # base64 encoded PNG


class AnalyticsResponse(BaseModel):
    total_scans: int
    scans_by_day: Dict[str, int]
    scans_by_country: Dict[str, int]
    scans_by_device: Dict[str, int]
    recent_scans: list

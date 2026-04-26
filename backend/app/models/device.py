import uuid
from datetime import date, datetime

from sqlalchemy import String, Date, DateTime, ForeignKey, JSON, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    household_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    brand: Mapped[str] = mapped_column(String(255), default="")
    model_number: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    serial_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str] = mapped_column(
        String(50), default="other", nullable=False
    )
    nickname: Mapped[str] = mapped_column(String(255), default="")
    room: Mapped[str] = mapped_column(String(100), default="")
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    specifications: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    documentation_urls: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    household = relationship("Household", back_populates="devices")
    documents = relationship("DeviceDocument", back_populates="device", cascade="all, delete-orphan")
    troubleshoot_sessions = relationship("TroubleshootSession", back_populates="device", cascade="all, delete-orphan")
    recall_alerts = relationship("RecallAlert", back_populates="device", cascade="all, delete-orphan")

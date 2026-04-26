import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    firebase_uid: Mapped[str] = mapped_column(
        String(128), unique=True, nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), default="")
    avatar_url: Mapped[str] = mapped_column(String(512), default="")
    subscription_tier: Mapped[str] = mapped_column(
        String(20), default="free", nullable=False
    )
    subscription_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    households = relationship("Household", back_populates="owner", lazy="selectin")
    household_memberships = relationship("HouseholdMember", back_populates="user", lazy="selectin")

    @property
    def is_premium(self) -> bool:
        if self.subscription_tier != "premium":
            return False
        if self.subscription_expires_at and self.subscription_expires_at < datetime.now(self.subscription_expires_at.tzinfo):
            return False
        return True

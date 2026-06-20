from sqlalchemy import String, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database.base import Base, TimestampMixin

class AuditLog(Base, TimestampMixin):
    __tablename__ = 'audit_logs'

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(80), nullable=False, default='')
    detail: Mapped[str] = mapped_column(Text, nullable=False, default='')
    ip_address: Mapped[str] = mapped_column(String(80), nullable=False, default='')

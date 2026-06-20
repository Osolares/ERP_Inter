from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database.base import Base, TimestampMixin, SoftDeleteMixin

class Company(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'companies'

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    trade_name: Mapped[str] = mapped_column(String(160), nullable=False, default='')
    tax_id: Mapped[str] = mapped_column(String(32), nullable=False, default='')
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default='America/Guatemala')
    date_format: Mapped[str] = mapped_column(String(24), nullable=False, default='dd/MM/yyyy')
    time_format: Mapped[str] = mapped_column(String(24), nullable=False, default='HH:mm:ss')
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

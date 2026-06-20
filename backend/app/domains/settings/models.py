from sqlalchemy import String, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database.base import Base, TimestampMixin, SoftDeleteMixin

class AppSetting(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'app_settings'

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False, default=1)
    key: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    value: Mapped[str] = mapped_column(Text, nullable=False, default='')
    value_type: Mapped[str] = mapped_column(String(40), nullable=False, default='string')
    group: Mapped[str] = mapped_column(String(80), nullable=False, default='general')
    is_public: Mapped[bool] = mapped_column(default=False, nullable=False)

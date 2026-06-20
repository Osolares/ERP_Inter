from sqlalchemy import String, Text, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database.base import Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin

class MediaAsset(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'media_assets'
    id: Mapped[int] = mapped_column(primary_key=True)
    target_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    target_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    asset_type: Mapped[str] = mapped_column(String(30), nullable=False, default='image')
    title: Mapped[str] = mapped_column(String(180), nullable=False, default='')
    description: Mapped[str] = mapped_column(Text, nullable=False, default='')
    alt_text: Mapped[str] = mapped_column(String(240), nullable=False, default='')
    source_url: Mapped[str] = mapped_column(Text, nullable=False, default='')
    storage_key: Mapped[str] = mapped_column(String(260), nullable=False, default='')
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False, default='')
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tags: Mapped[str] = mapped_column(Text, nullable=False, default='')
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    uploaded_by: Mapped[str] = mapped_column(String(120), nullable=False, default='Sistema')
    origin: Mapped[str] = mapped_column(String(40), nullable=False, default='erp')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class LabelTemplate(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'media_label_templates'
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    template_type: Mapped[str] = mapped_column(String(40), nullable=False, default='lot')
    paper_size: Mapped[str] = mapped_column(String(40), nullable=False, default='ticket_80mm')
    width_mm: Mapped[int] = mapped_column(Integer, nullable=False, default=80)
    height_mm: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    variables: Mapped[str] = mapped_column(Text, nullable=False, default='sku,nombre,lote,qr,barcode,precio,ubicacion')
    body_template: Mapped[str] = mapped_column(Text, nullable=False, default='')
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

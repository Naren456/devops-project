from datetime import datetime, timezone
from sqlalchemy import DateTime, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

LOW_STOCK_THRESHOLD = 5

def derive_status(quantity: int) -> str:
    if quantity <= 0:
        return "OUT_OF_STOCK"
    if quantity <= LOW_STOCK_THRESHOLD:
        return "LOW_STOCK"
    return "IN_STOCK"

class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    sku: Mapped[str] = mapped_column(String(60), default="")
    category: Mapped[str] = mapped_column(String(80), default="General")
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    price: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    status: Mapped[str] = mapped_column(String(20), default="OUT_OF_STOCK")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

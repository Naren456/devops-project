from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

Status = Literal["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]

class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(default="", max_length=60)
    category: str = Field(default="General", max_length=80)
    quantity: int = Field(default=0, ge=0)
    price: float = Field(default=0, ge=0)

class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    sku: str | None = Field(default=None, max_length=60)
    category: str | None = Field(default=None, max_length=80)
    quantity: int | None = Field(default=None, ge=0)
    price: float | None = Field(default=None, ge=0)

class ProductOut(ProductCreate):
    id: int
    status: Status
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class StatsOut(BaseModel):
    total: int
    inStock: int
    lowStock: int
    outOfStock: int

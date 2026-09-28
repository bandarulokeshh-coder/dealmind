from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
from .database import Base

def uid(): return str(uuid.uuid4())
def now(): return datetime.now(timezone.utc)

class Customer(Base):
    __tablename__ = "customers"
    id = Column(String, primary_key=True, default=uid)
    name = Column(String, nullable=False)
    company = Column(String, nullable=False)
    industry = Column(String, default="")
    email = Column(String, default="")
    phone = Column(String, default="")
    deal_value = Column(Float, default=0)
    deal_stage = Column(String, default="Lead")
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

class Deal(Base):
    __tablename__ = "deals"
    id = Column(String, primary_key=True, default=uid)
    customer_id = Column(String, ForeignKey("customers.id"))
    title = Column(String, nullable=False)
    value = Column(Float, default=0)
    currency = Column(String, default="INR")
    stage = Column(String, default="Lead")
    probability = Column(Integer, default=30)
    expected_close_date = Column(String, default="")
    status = Column(String, default="Active")
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(String, primary_key=True, default=uid)
    customer_id = Column(String, ForeignKey("customers.id"))
    deal_id = Column(String, ForeignKey("deals.id"), nullable=True)
    role = Column(String, nullable=False)  # user | assistant
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=now)

class MemoryEvent(Base):
    __tablename__ = "memory_events"
    id = Column(String, primary_key=True, default=uid)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=True)
    deal_id = Column(String, ForeignKey("deals.id"), nullable=True)
    operation = Column(String, nullable=False)  # RETAIN | RECALL | REFLECT
    summary = Column(Text, default="")
    source = Column(String, default="hindsight")
    created_at = Column(DateTime, default=now)

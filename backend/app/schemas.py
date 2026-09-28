from pydantic import BaseModel
from typing import Optional, List

class CustomerCreate(BaseModel):
    name: str
    company: str
    industry: str = ""
    email: str = ""
    phone: str = ""
    deal_value: float = 0
    deal_stage: str = "Lead"

class CustomerOut(CustomerCreate):
    id: str
    created_at: str = ""
    updated_at: str = ""

class DealCreate(BaseModel):
    customer_id: str
    title: str
    value: float = 0
    currency: str = "INR"
    stage: str = "Lead"
    probability: int = 30
    expected_close_date: str = ""
    status: str = "Active"

class DealOut(DealCreate):
    id: str

class ChatRequest(BaseModel):
    customer_id: str
    message: str
    deal_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    memory: dict
    evidence: List[dict]
    hindsight_ops: List[dict]

class MemoryOut(BaseModel):
    text: str
    category: str = ""
    timestamp: str = ""
    source: str = "hindsight"
    relevance: float = 0

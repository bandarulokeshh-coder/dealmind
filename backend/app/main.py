from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from pathlib import Path
import logging
from datetime import datetime, timezone

from .config import settings
from . import database as dbmod
from .database import get_db
from .models import Customer, Deal, Conversation, MemoryEvent
from .schemas import CustomerCreate, DealCreate, ChatRequest
from .hindsight.service import get_hindsight, bank_id_for
from .services.llm import LLMService
from .agents.deal_agent import run_agent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="DealMind API", version="0.1.0")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=bool(origins),
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB init: PostgreSQL first, SQLite fallback (logic lives in database.init_db).
# Runs at import time so engine/SessionLocal are ready before any request lands.
_db_ok, db_type = dbmod.init_db()
engine = dbmod.engine  # used by /api/health
if not _db_ok:
    raise RuntimeError("Database initialization failed")
logger.info(f"Database ready: {db_type}")

llm = LLMService(settings.llm_base_url, settings.llm_api_key, settings.llm_model)

@app.get("/api/health")
def health():
    hs = get_hindsight()
    db_ok = True
    try:
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    return {
        "status": "ok",
        "database": "connected" if db_ok else "unavailable",
        "hindsight": "connected" if hs.available else "mock/unavailable",
        "llm": "connected" if llm.client else "mock/unavailable",
    }

@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    customers = db.query(Customer).count()
    deals = db.query(Deal).count()
    interactions = db.query(Conversation).count()
    memories = db.query(MemoryEvent).count()
    total = db.query(func.coalesce(func.sum(Deal.value), 0)).scalar() or 0
    active_deals = db.query(Deal).filter(Deal.status=="Active").count()
    recent_deals = db.query(Deal).order_by(Deal.created_at.desc()).limit(5).all()
    recent_events = db.query(MemoryEvent).order_by(MemoryEvent.created_at.desc()).limit(8).all()
    return {
        "active_deals": active_deals,
        "total_deals": deals,
        "customers": customers,
        "interactions": interactions,
        "memories_learned": memories,
        "total_pipeline": total,
        "recent_deals": [{"id":d.id,"title":d.title,"value":d.value,"stage":d.stage,"status":d.status} for d in recent_deals],
        "recent_events": [{"id":e.id,"operation":e.operation,"summary":e.summary,"customer_id":e.customer_id,"created_at": e.created_at.isoformat() if e.created_at else ""} for e in recent_events],
    }

# Customers
@app.get("/api/customers")
def list_customers(db: Session = Depends(get_db)):
    rows = db.query(Customer).order_by(Customer.created_at.desc()).all()
    return [{"id":c.id,"name":c.name,"company":c.company,"industry":c.industry,"email":c.email,"phone":c.phone,"deal_value":c.deal_value,"deal_stage":c.deal_stage,"created_at":c.created_at.isoformat() if c.created_at else ""} for c in rows]

@app.post("/api/customers")
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    c = Customer(**payload.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    return {"id":c.id,"name":c.name,"company":c.company}

@app.get("/api/customers/{cid}")
def get_customer(cid: str, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id==cid).first()
    if not c: raise HTTPException(404,"Customer not found")
    return {"id":c.id,"name":c.name,"company":c.company,"industry":c.industry,"email":c.email,"phone":c.phone,"deal_value":c.deal_value,"deal_stage":c.deal_stage}

@app.get("/api/customers/{cid}/memory")
def customer_memory(cid: str):
    hs = get_hindsight()
    bank_id = bank_id_for(cid)
    # recall broad to show all
    results = hs.recall(bank_id, "customer requirements budget preferences objections decision makers timeline")
    return {"bank_id": bank_id, "memories": results, "hindsight_available": hs.available}

@app.get("/api/customers/{cid}/timeline")
def customer_timeline(cid: str, db: Session = Depends(get_db)):
    events = db.query(MemoryEvent).filter(MemoryEvent.customer_id==cid).order_by(MemoryEvent.created_at.asc()).all()
    return [{"id":e.id,"operation":e.operation,"summary":e.summary,"created_at":e.created_at.isoformat() if e.created_at else ""} for e in events]

@app.get("/api/customers/{cid}/deals")
def customer_deals(cid: str, db: Session = Depends(get_db)):
    rows = db.query(Deal).filter(Deal.customer_id==cid).all()
    return [{"id":d.id,"title":d.title,"value":d.value,"stage":d.stage,"status":d.status} for d in rows]

# Deals
@app.get("/api/deals")
def list_deals(db: Session = Depends(get_db)):
    rows = db.query(Deal).order_by(Deal.created_at.desc()).all()
    return [{"id":d.id,"customer_id":d.customer_id,"title":d.title,"value":d.value,"stage":d.stage,"status":d.status,"probability":d.probability} for d in rows]

@app.post("/api/deals")
def create_deal(payload: DealCreate, db: Session = Depends(get_db)):
    d = Deal(**payload.model_dump())
    db.add(d); db.commit(); db.refresh(d)
    return {"id": d.id}

@app.get("/api/deal-intelligence/{deal_id}")
def deal_intelligence(deal_id: str, db: Session = Depends(get_db)):
    deal = db.query(Deal).filter(Deal.id==deal_id).first()
    if not deal: raise HTTPException(404,"Deal not found")
    hs = get_hindsight()
    bank_id = bank_id_for(deal.customer_id)
    # Recall evidence first so it is still returned if the reflect synthesis is throttled
    memories = hs.recall(bank_id, "requirements budget objections decision makers rejected options timeline")
    reflect_q = "What are the buying signals, objections, decision makers, and recommended next steps for this deal?"
    synthesis = hs.reflect(bank_id, reflect_q)
    return {"deal": {"id":deal.id,"title":deal.title,"value":deal.value,"stage":deal.stage,"status":deal.status}, "synthesis": synthesis, "evidence": memories}

# Conversations
@app.get("/api/conversations/{customer_id}")
def list_conversations(customer_id: str, db: Session = Depends(get_db)):
    rows = db.query(Conversation).filter(Conversation.customer_id==customer_id).order_by(Conversation.created_at.asc()).all()
    return [{"id":r.id,"role":r.role,"message":r.message,"created_at":r.created_at.isoformat() if r.created_at else ""} for r in rows]

@app.get("/api/memory/events/{customer_id}")
def memory_events(customer_id: str, db: Session = Depends(get_db)):
    rows = db.query(MemoryEvent).filter(MemoryEvent.customer_id==customer_id).order_by(MemoryEvent.created_at.desc()).limit(50).all()
    return [{"id":r.id,"operation":r.operation,"summary":r.summary,"created_at":r.created_at.isoformat() if r.created_at else ""} for r in rows]

# Chat — core agent loop
@app.post("/api/chat")
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    cust = db.query(Customer).filter(Customer.id==req.customer_id).first()
    if not cust: raise HTTPException(404,"Customer not found")
    # persist user message
    db.add(Conversation(customer_id=req.customer_id, deal_id=req.deal_id, role="user", message=req.message))
    db.commit()

    result = run_agent(req.customer_id, req.message, llm)

    # persist assistant
    db.add(Conversation(customer_id=req.customer_id, deal_id=req.deal_id, role="assistant", message=result["answer"]))
    # memory events
    for op in result.get("hindsight_ops",[]):
        db.add(MemoryEvent(customer_id=req.customer_id, deal_id=req.deal_id, operation=op["operation"], summary=str(op.get("query") or op.get("facts") or op.get("count"))[:500]))
    db.commit()

    return result

# Demo
@app.post("/api/demo/seed")
def demo_seed(db: Session = Depends(get_db)):
    # Seed Acme (on-premise) + Nova (cloud-native) demo customers.
    # Each gets its own Hindsight bank via bank_id_for(customer.id),
    # so Acme facts can never leak into Nova answers and vice versa.
    # Idempotent: existing companies are reused, missing memories re-seeded.
    hs = get_hindsight()

    def seed_one(company: str, fields: dict, deal_fields: dict, facts: list) -> dict:
        c = db.query(Customer).filter(Customer.company == company).first()
        if c is None:
            c = Customer(name=company, company=company, **fields)
            db.add(c); db.commit(); db.refresh(c)
        d = db.query(Deal).filter(Deal.customer_id == c.id).first()
        if d is None:
            d = Deal(customer_id=c.id, **deal_fields)
            db.add(d); db.commit(); db.refresh(d)
        bank_id = bank_id_for(c.id)
        # re-seed memories only if this bank has none yet (avoids dupes on re-click)
        existing_events = db.query(MemoryEvent).filter(
            MemoryEvent.customer_id == c.id, MemoryEvent.operation == "RETAIN"
        ).count()
        if existing_events == 0:
            for f in facts:
                hs.retain(bank_id, f)
                db.add(MemoryEvent(customer_id=c.id, deal_id=d.id, operation="RETAIN", summary=f))
            db.commit()
        return {"customer_id": c.id, "deal_id": d.id, "bank_id": bank_id}

    acme = seed_one(
        "Acme Manufacturing",
        dict(industry="Manufacturing", email="cto@acme.example", deal_value=1000000, deal_stage="Proposal"),
        dict(title="Enterprise AI Platform", value=1000000, stage="Proposal", probability=60, status="Active"),
        [
            "Acme Manufacturing has a ₹10 lakh budget.",
            "Acme requires on-premise deployment because of internal privacy requirements.",
            "The CTO is the primary technical decision maker and is concerned about data privacy.",
            "Acme previously rejected a cloud-only deployment.",
            "The CTO wants a technical demonstration before approval.",
            "Expected purchase timeline is approximately 30 days.",
        ],
    )
    nova = seed_one(
        "Nova Labs",
        dict(industry="SaaS", email="vp-eng@nova.example", deal_value=2500000, deal_stage="Discovery"),
        dict(title="Cloud SaaS Platform", value=2500000, stage="Discovery", probability=40, status="Active"),
        [
            "Nova Labs has a ₹25 lakh budget for a cloud solution.",
            "Nova is cloud-native and wants a fully managed SaaS deployment.",
            "The VP Engineering is the primary decision maker and prioritizes shipping speed.",
            "Nova previously rejected on-premise deployment as too slow to maintain.",
            "The VP Engineering wants a 14-day pilot before approval.",
            "Expected purchase timeline is approximately 14 days.",
        ],
    )
    # keep old shape for backward compat (LearningDemo used customer_id)
    return {
        "customer_id": acme["customer_id"], "deal_id": acme["deal_id"], "bank_id": acme["bank_id"],
        "acme": acme, "nova": nova,
        "message": "seeded Acme + Nova",
    }

@app.post("/api/demo/reset")
def demo_reset(db: Session = Depends(get_db)):
    db.query(MemoryEvent).delete()
    db.query(Conversation).delete()
    db.query(Deal).delete()
    db.query(Customer).delete()
    db.commit()
    # reset mock hindsight store
    try:
        hs = get_hindsight()
        hs._mock_store.clear()
    except: pass
    return {"status":"reset"}

@app.post("/api/memory/forget/{customer_id}")
def forget_memory(customer_id: str, db: Session = Depends(get_db)):
    # app-level forget (delete events + conversations + mock store)
    db.query(MemoryEvent).filter(MemoryEvent.customer_id==customer_id).delete()
    db.query(Conversation).filter(Conversation.customer_id==customer_id).delete()
    db.commit()
    try:
        hs = get_hindsight()
        bank_id = bank_id_for(customer_id)
        hs._mock_store.pop(bank_id, None)
        # if real hindsight supports delete, try
        if hs.client and hasattr(hs.client,"delete_bank"):
            try: hs.client.delete_bank(bank_id)
            except: pass
    except: pass
    return {"status":"forgotten"}

@app.get("/api/memory/export/{customer_id}")
def export_memory(customer_id: str):
    hs = get_hindsight()
    bank_id = bank_id_for(customer_id)
    mems = hs.recall(bank_id, "all customer facts")
    return {"bank_id": bank_id, "memories": mems}


@app.put("/api/memory/events/{event_id}")
def update_memory_event(event_id: str, payload: dict, db: Session = Depends(get_db)):
    """Update a specific memory event's summary"""
    event = db.query(MemoryEvent).filter(MemoryEvent.id == event_id).first()
    if not event:
        raise HTTPException(404, "Memory event not found")

    # Only allow updating the summary field for safety
    if "summary" in payload:
        event.summary = payload["summary"]
        db.commit()
        db.refresh(event)

    return {"id": event.id, "summary": event.summary, "updated": True}


@app.delete("/api/memory/events/{event_id}")
def delete_memory_event(event_id: str, db: Session = Depends(get_db)):
    """Delete a specific memory event"""
    event = db.query(MemoryEvent).filter(MemoryEvent.id == event_id).first()
    if not event:
        raise HTTPException(404, "Memory event not found")

    db.delete(event)
    db.commit()

    return {"id": event_id, "deleted": True}


# ---------------------------------------------------------------------------
# Single-URL deploy: serve the built React app from this same service.
#
# When frontend/dist exists (produced by `npm run build`), the API and the UI
# share one origin, so the deployed app needs no CORS configuration and only
# one public URL. Locally, `frontend/dist` may be absent while the Vite dev
# server (:5173) serves the UI and proxies /api -> :8001; in that case the app
# stays API-only and nothing changes.
# ---------------------------------------------------------------------------
_FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


class _SpaStaticFiles(StaticFiles):
    """Static assets plus index.html fallback so client-side routes deep-link."""

    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404 and self.html:
                return await super().get_response("index.html", scope)
            raise


if _FRONTEND_DIST.is_dir():
    app.mount("/", _SpaStaticFiles(directory=str(_FRONTEND_DIST), html=True), name="ui")
    logger.info(f"Serving frontend build from {_FRONTEND_DIST}")
else:
    logger.info("frontend/dist not found — API-only mode (run the Vite dev server for the UI)")


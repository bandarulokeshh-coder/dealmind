from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging
from datetime import datetime, timezone

from .config import settings
from .database import Base, engine, SessionLocal, get_db, get_engine
from .models import Customer, Deal, Conversation, MemoryEvent
from .schemas import CustomerCreate, DealCreate, ChatRequest
from .hindsight.service import get_hindsight, bank_id_for
from .services.llm import LLMService
from .agents.deal_agent import run_agent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="DealMind API", version="0.1.0")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins or ["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# DB init with postgres -> sqlite fallback
def init_db():
    global engine
    try:
        Base.metadata.create_all(bind=engine)
        # probe
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
        logger.info(f"DB connected: {settings.database_url[:30]}...")
    except Exception as e:
        logger.warning(f"Postgres unavailable ({e}), falling back to SQLite")
        from .database import get_engine as ge
        import sqlalchemy
        fallback = "sqlite:///./dealmind.db"
        eng2 = ge(fallback)
        Base.metadata.create_all(bind=eng2)
        # patch globals
        import app.database as dbmod
        import sys
        # Rebind SessionLocal to fallback
        from sqlalchemy.orm import sessionmaker
        new_session = sessionmaker(autocommit=False, autoflush=False, bind=eng2)
        # monkey patch
        import backend.app.database  # noqa
        # update this module's engine/SessionLocal references via globals
        globals()["engine"] = eng2
        # also update database module
        try:
            import app.database as adb
            adb.engine = eng2
            adb.SessionLocal = new_session
        except: pass
        # direct patch for get_db closure — easiest: set SessionLocal in this file
        global SessionLocal
        SessionLocal = new_session
        logger.info("Using SQLite fallback")

init_db()

llm = LLMService(settings.llm_base_url, settings.llm_api_key, settings.llm_model)

@app.get("/api/health")
def health():
    hs = get_hindsight()
    db_ok = True
    try:
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
    except: db_ok=False
    return {
        "status":"ok",
        "database": "connected" if db_ok else "unavailable",
        "hindsight": "connected" if hs.available else "mock/unavailable",
        "llm": "connected" if llm.client else "mock/unavailable",
        "hindsight_url": settings.hindsight_api_url,
        "llm_model": settings.llm_model,
    }

@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    customers = db.query(Customer).count()
    deals = db.query(Deal).count()
    interactions = db.query(Conversation).count()
    memories = db.query(MemoryEvent).count()
    # pipeline sum
    total = sum(d.value for d in db.query(Deal).all())
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
    # create Acme demo customer + deal + seed hindsight
    existing = db.query(Customer).filter(Customer.company=="Acme Manufacturing").first()
    if existing:
        return {"customer_id": existing.id, "message":"already seeded"}
    c = Customer(name="Acme Manufacturing", company="Acme Manufacturing", industry="Manufacturing", email="cto@acme.example", deal_value=1000000, deal_stage="Proposal")
    db.add(c); db.commit(); db.refresh(c)
    d = Deal(customer_id=c.id, title="Enterprise AI Platform", value=1000000, stage="Proposal", probability=60, status="Active")
    db.add(d); db.commit(); db.refresh(d)
    hs = get_hindsight()
    bank_id = bank_id_for(c.id)
    facts = [
        "Acme Manufacturing has a ₹10 lakh budget.",
        "Acme requires on-premise deployment because of internal privacy requirements.",
        "The CTO is the primary technical decision maker and is concerned about data privacy.",
        "Acme previously rejected a cloud-only deployment.",
        "The CTO wants a technical demonstration before approval.",
        "Expected purchase timeline is approximately 30 days.",
    ]
    for f in facts:
        hs.retain(bank_id, f)
        db.add(MemoryEvent(customer_id=c.id, deal_id=d.id, operation="RETAIN", summary=f))
    db.commit()
    return {"customer_id": c.id, "deal_id": d.id, "bank_id": bank_id}

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

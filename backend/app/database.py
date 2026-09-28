from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

# Try postgres, fallback to sqlite if connection fails at startup is handled in main.py
# We create engine lazily; actual fallback handled there
def get_engine(url: str = None):
    u = url or settings.database_url
    connect_args = {}
    if u.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    return create_engine(u, connect_args=connect_args, pool_pre_ping=True)

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

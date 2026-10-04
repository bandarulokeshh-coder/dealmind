from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import logging
import os

from .config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

# Engine and SessionLocal will be initialized by init_db()
engine = None
SessionLocal = None

def get_engine(database_url: str = None):
    """Create database engine with connection pooling."""
    url = database_url or settings.database_url

    if url.startswith("postgresql"):
        return create_engine(
            url,
            pool_pre_ping=True,  # Verify connections before using
            pool_size=5,
            max_overflow=10,
            echo=settings.debug_sql if hasattr(settings, 'debug_sql') else False,
        )
    else:  # SQLite
        return create_engine(
            url,
            connect_args={"check_same_thread": False},
            echo=settings.debug_sql if hasattr(settings, 'debug_sql') else False,
        )

def _sqlite_fallback_url() -> str:
    """Filesystem location for the SQLite fallback database.

    Serverless platforms (Vercel, AWS Lambda) mount the project directory
    read-only and expose only /tmp as writable, so the fallback must live there
    when deployed. Anything written to /tmp is per-instance and does not survive
    a cold start; point DATABASE_URL at a managed Postgres for durable data.
    """
    if os.environ.get("VERCEL"):
        return "sqlite:////tmp/dealmind.db"
    return "sqlite:///./dealmind.db"


def _primary_url() -> str:
    """settings.database_url, corrected when it cannot work in this environment."""
    url = settings.database_url
    # A relative SQLite path would target the read-only deployment directory.
    if os.environ.get("VERCEL") and url.startswith("sqlite") and not url.startswith("sqlite:////"):
        return _sqlite_fallback_url()
    return url


def init_db() -> tuple[bool, str]:
    """
    Initialize database with PostgreSQL -> SQLite fallback.
    Returns: (success, database_type)
    """
    global engine, SessionLocal

    primary_url = _primary_url()

    try:
        # Try PostgreSQL first
        engine = get_engine(primary_url)
        Base.metadata.create_all(bind=engine)

        # Test connection
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("SELECT 1"))

        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        db_type = "postgresql" if primary_url.startswith("postgresql") else "sqlite"
        logger.info(f"Database connected: {db_type}")
        return True, db_type

    except Exception as e:
        logger.warning(f"Primary database unavailable: {e}")
        logger.info("Falling back to SQLite...")

        try:
            # Fallback to SQLite
            fallback_url = _sqlite_fallback_url()
            engine = get_engine(fallback_url)
            Base.metadata.create_all(bind=engine)

            # Test SQLite connection
            with engine.connect() as conn:
                from sqlalchemy import text
                conn.execute(text("SELECT 1"))

            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            logger.info("Using SQLite fallback")
            return True, "sqlite"

        except Exception as fallback_error:
            logger.error(f"SQLite fallback also failed: {fallback_error}")
            raise RuntimeError("Unable to initialize any database") from fallback_error

def get_db() -> Generator[Session, None, None]:
    """Dependency for FastAPI endpoints to get database session."""
    if SessionLocal is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

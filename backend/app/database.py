from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import logging

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

def init_db() -> tuple[bool, str]:
    """
    Initialize database with PostgreSQL -> SQLite fallback.
    Returns: (success, database_type)
    """
    global engine, SessionLocal

    try:
        # Try PostgreSQL first
        engine = get_engine(settings.database_url)
        Base.metadata.create_all(bind=engine)

        # Test connection
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("SELECT 1"))

        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        db_type = "postgresql" if settings.database_url.startswith("postgresql") else "sqlite"
        logger.info(f"Database connected: {db_type}")
        return True, db_type

    except Exception as e:
        logger.warning(f"Primary database unavailable: {e}")
        logger.info("Falling back to SQLite...")

        try:
            # Fallback to SQLite
            fallback_url = "sqlite:///./dealmind.db"
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

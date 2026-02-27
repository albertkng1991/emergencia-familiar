import logging
import threading

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from backend.config.settings import DATABASE_URL
from backend.storage.models import Base

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_engine = None
_SessionLocal = None


def get_engine():
    global _engine
    if _engine is not None:
        return _engine
    with _lock:
        if _engine is not None:
            return _engine
        url = DATABASE_URL
        kwargs: dict = {"echo": False}
        if url.startswith("sqlite"):
            kwargs["connect_args"] = {"check_same_thread": False}
        else:
            # PostgreSQL / other dialects
            kwargs["pool_pre_ping"] = True
        _engine = create_engine(url, **kwargs)
        logger.info("Database engine created: %s", url.split("@")[-1] if "@" in url else url)
    return _engine


def _get_session_factory():
    global _SessionLocal
    if _SessionLocal is not None:
        return _SessionLocal
    with _lock:
        if _SessionLocal is not None:
            return _SessionLocal
        _SessionLocal = sessionmaker(bind=get_engine())
    return _SessionLocal


def get_session() -> Session:
    return _get_session_factory()()


def ensure_schema():
    """Create tables that don't exist yet (additive-only migration)."""
    engine = get_engine()
    inspector = inspect(engine)
    existing = set(inspector.get_table_names())
    target = set(Base.metadata.tables.keys())
    missing = target - existing

    if missing:
        logger.info("Creating missing tables: %s", missing)
        Base.metadata.create_all(engine, tables=[Base.metadata.tables[t] for t in missing])

    # Add missing columns to existing tables
    for table_name in target & existing:
        table = Base.metadata.tables[table_name]
        existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
        for col in table.columns:
            if col.name not in existing_cols:
                col_type = col.type.compile(engine.dialect)
                default = ""
                if col.default is not None and col.default.is_scalar:
                    default = f" DEFAULT {col.default.arg!r}"
                stmt = f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type}{default}"
                logger.info("Adding column: %s.%s", table_name, col.name)
                with engine.begin() as conn:
                    conn.execute(text(stmt))

    logger.info("Schema check complete — %d tables", len(target))


def init_db():
    """Alias kept for backwards compatibility with app.py and generator.py."""
    ensure_schema()

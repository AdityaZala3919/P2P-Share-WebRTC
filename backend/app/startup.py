from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db.database import init_db, engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage FastAPI application lifecycle.
    Startup: Initialize SQLite database tables.
    Shutdown: Dispose async database engine.
    """
    # Startup phase
    print("[INFO] Initializing database tables...", flush=True)
    await init_db()
    print("[INFO] Database ready.", flush=True)
    
    yield
    
    # Shutdown phase
    print("[INFO] Disposing database engine...", flush=True)
    await engine.dispose()
    print("[INFO] Application shutdown complete.", flush=True)


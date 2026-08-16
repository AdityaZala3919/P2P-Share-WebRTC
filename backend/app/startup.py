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
    print("🚀 Initializing database tables...")
    await init_db()
    print("✅ Database ready.")
    
    yield
    
    # Shutdown phase
    print("🛑 Disposing database engine...")
    await engine.dispose()
    print("Application shutdown complete.")

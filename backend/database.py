import os
import aiosqlite
from config import settings

db: aiosqlite.Connection | None = None

async def init_db() -> aiosqlite.Connection:
    global db
    if db is None:
        db = await aiosqlite.connect(settings.DATABASE_URL)
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA journal_mode=WAL")
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS rooms (
                id TEXT PRIMARY KEY,
                passphrase_hash TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS vault_items (
                id TEXT PRIMARY KEY,
                room_id TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('note','file')),
                title TEXT NOT NULL,
                encrypted_data TEXT NOT NULL,
                iv TEXT NOT NULL,
                salt TEXT NOT NULL,
                file_size INTEGER,
                file_name TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
            )
        """)

        # Disk-backed encrypted file staging (50 MB max, no blob in DB)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS vault_files (
                id TEXT PRIMARY KEY,
                room_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                iv TEXT NOT NULL,
                salt TEXT NOT NULL,
                file_path TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
            )
        """)

        await db.commit()

        # Ensure the uploads staging directory exists
        os.makedirs(settings.UPLOADS_DIR, exist_ok=True)

    return db

async def get_db() -> aiosqlite.Connection:
    global db
    if db is None:
        await init_db()
    return db

async def close_db():
    global db
    if db is not None:
        await db.close()
        db = None

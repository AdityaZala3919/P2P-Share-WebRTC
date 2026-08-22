import asyncio
from database import init_db, get_db, close_db

async def test():
    await init_db()
    db = await get_db()
    cursor = await db.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = await cursor.fetchall()
    table_names = [dict(t)["name"] for t in tables]
    print(f"SUCCESS: Created tables: {table_names}")
    await close_db()

if __name__ == "__main__":
    asyncio.run(test())

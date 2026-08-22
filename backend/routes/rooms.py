from fastapi import APIRouter, HTTPException, Depends
import bcrypt
import random
import string
import aiosqlite
from database import get_db
from models import RoomCreate, RoomJoinRequest
from config import settings
from signaling import registry

router = APIRouter(prefix="/api/rooms")

def generate_room_code(length: int = 8) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))

@router.post("", include_in_schema=False)
@router.post("/")
async def create_room(room_data: RoomCreate, db: aiosqlite.Connection = Depends(get_db)):
    room_id = generate_room_code(settings.ROOM_CODE_LENGTH)
    
    salt = bcrypt.gensalt()
    hashed_passphrase = bcrypt.hashpw(room_data.passphrase.encode(), salt).decode('utf-8')
    
    await db.execute(
        "INSERT INTO rooms (id, passphrase_hash) VALUES (?, ?)",
        (room_id, hashed_passphrase)
    )
    await db.commit()
    
    cursor = await db.execute("SELECT created_at FROM rooms WHERE id = ?", (room_id,))
    row = await cursor.fetchone()
    
    return {"room_id": room_id, "created_at": row["created_at"]}

@router.post("/{room_id}/join")
async def join_room(room_id: str, join_data: RoomJoinRequest, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT passphrase_hash FROM rooms WHERE id = ?", (room_id,))
    row = await cursor.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Room not found")
        
    hashed_passphrase = row["passphrase_hash"].encode('utf-8')
    
    if not bcrypt.checkpw(join_data.passphrase.encode(), hashed_passphrase):
        raise HTTPException(status_code=401, detail="Invalid passphrase")
        
    return {"room_id": room_id, "joined": True}

@router.get("/{room_id}/peers")
async def get_peers(room_id: str):
    peers = []
    if room_id in registry:
        for peer_info in registry[room_id].values():
            peers.append(peer_info["device"].model_dump())
            
    return {"peers": peers}

@router.get("/{room_id}/config")
async def get_config(room_id: str):
    return {"iceServers": [{"urls": settings.STUN_URLS}]}

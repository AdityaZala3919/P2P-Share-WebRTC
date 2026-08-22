from fastapi import APIRouter, HTTPException, Depends
from typing import List
import uuid
import aiosqlite
from database import get_db
from models import VaultItemCreate, VaultItemUpdate, VaultItemResponse
from config import settings

router = APIRouter(prefix="/api/rooms")

@router.get("/{room_id}/vault", response_model=List[VaultItemResponse])
async def list_vault_items(room_id: str, db: aiosqlite.Connection = Depends(get_db)):
    # check room exists
    cursor = await db.execute("SELECT id FROM rooms WHERE id = ?", (room_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Room not found")
        
    cursor = await db.execute("SELECT * FROM vault_items WHERE room_id = ? ORDER BY created_at DESC", (room_id,))
    rows = await cursor.fetchall()
    
    return [dict(row) for row in rows]

@router.post("/{room_id}/vault", response_model=VaultItemResponse)
async def create_vault_item(room_id: str, item: VaultItemCreate, db: aiosqlite.Connection = Depends(get_db)):
    if item.type == 'file':
        if item.file_size is not None and item.file_size > settings.MAX_VAULT_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"File exceeds maximum allowed size of {settings.MAX_VAULT_FILE_SIZE} bytes")
            
    # check room exists
    cursor = await db.execute("SELECT id FROM rooms WHERE id = ?", (room_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Room not found")
        
    item_id = str(uuid.uuid4())
    
    await db.execute(
        """
        INSERT INTO vault_items (id, room_id, type, title, encrypted_data, iv, salt, file_size, file_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (item_id, room_id, item.type, item.title, item.encrypted_data, item.iv, item.salt, item.file_size, item.file_name)
    )
    await db.commit()
    
    cursor = await db.execute("SELECT * FROM vault_items WHERE id = ?", (item_id,))
    row = await cursor.fetchone()
    
    return dict(row)

@router.put("/{room_id}/vault/{item_id}", response_model=VaultItemResponse)
async def update_vault_item(room_id: str, item_id: str, item: VaultItemUpdate, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id FROM vault_items WHERE id = ? AND room_id = ?", (item_id, room_id))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Item not found")
        
    updates = []
    params = []
    
    if item.title is not None:
        updates.append("title = ?")
        params.append(item.title)
    if item.encrypted_data is not None:
        updates.append("encrypted_data = ?")
        params.append(item.encrypted_data)
    if item.iv is not None:
        updates.append("iv = ?")
        params.append(item.iv)
        
    if not updates:
        cursor = await db.execute("SELECT * FROM vault_items WHERE id = ?", (item_id,))
        row = await cursor.fetchone()
        return dict(row)
        
    updates.append("updated_at = datetime('now')")
    
    query = f"UPDATE vault_items SET {', '.join(updates)} WHERE id = ? AND room_id = ?"
    params.extend([item_id, room_id])
    
    await db.execute(query, params)
    await db.commit()
    
    cursor = await db.execute("SELECT * FROM vault_items WHERE id = ?", (item_id,))
    row = await cursor.fetchone()
    return dict(row)

@router.delete("/{room_id}/vault/{item_id}")
async def delete_vault_item(room_id: str, item_id: str, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id FROM vault_items WHERE id = ? AND room_id = ?", (item_id, room_id))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Item not found")
        
    await db.execute("DELETE FROM vault_items WHERE id = ? AND room_id = ?", (item_id, room_id))
    await db.commit()
    
    return {"deleted": True}

import os
import uuid
import aiosqlite
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import List
from database import get_db
from models import VaultFileMetadata
from config import settings

router = APIRouter(prefix="/api/rooms")


@router.get("/{room_id}/files", response_model=List[VaultFileMetadata])
async def list_vault_files(room_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """List all staged encrypted file metadata for a room (no binary data returned)."""
    cursor = await db.execute("SELECT id FROM rooms WHERE id = ?", (room_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Room not found")

    cursor = await db.execute(
        "SELECT id, room_id, file_name, file_size, iv, salt, created_at FROM vault_files WHERE room_id = ? ORDER BY created_at DESC",
        (room_id,)
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


@router.post("/{room_id}/files", response_model=VaultFileMetadata)
async def upload_vault_file(
    room_id: str,
    file: UploadFile = File(...),
    iv: str = Form(...),
    salt: str = Form(...),
    original_file_name: str = Form(...),
    original_file_size: int = Form(...),
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Receive an AES-256-GCM encrypted binary blob (encrypted in the browser)
    and write it to disk. Metadata (iv, salt, file_name, file_size) is stored
    in SQLite. The server never sees plaintext.
    """
    if original_file_size > settings.MAX_VAULT_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {settings.MAX_VAULT_FILE_SIZE} bytes"
        )

    cursor = await db.execute("SELECT id FROM rooms WHERE id = ?", (room_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Room not found")

    file_id = str(uuid.uuid4())
    room_upload_dir = os.path.join(settings.UPLOADS_DIR, room_id)
    os.makedirs(room_upload_dir, exist_ok=True)

    enc_file_path = os.path.join(room_upload_dir, f"{file_id}.enc")

    # Stream-write to disk in 1 MB chunks — never loads the full file into RAM
    with open(enc_file_path, "wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)  # 1 MB
            if not chunk:
                break
            f.write(chunk)

    await db.execute(
        """
        INSERT INTO vault_files (id, room_id, file_name, file_size, iv, salt, file_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (file_id, room_id, original_file_name, original_file_size, iv, salt, enc_file_path)
    )
    await db.commit()

    cursor = await db.execute(
        "SELECT id, room_id, file_name, file_size, iv, salt, created_at FROM vault_files WHERE id = ?",
        (file_id,)
    )
    row = await cursor.fetchone()
    return dict(row)


@router.get("/{room_id}/files/{file_id}/download")
async def download_vault_file(
    room_id: str,
    file_id: str,
    db: aiosqlite.Connection = Depends(get_db),
):
    """Stream the encrypted binary blob back to the client for client-side decryption."""
    cursor = await db.execute(
        "SELECT file_path, file_name FROM vault_files WHERE id = ? AND room_id = ?",
        (file_id, room_id)
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = row["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Encrypted file missing from disk")

    return FileResponse(
        path=file_path,
        media_type="application/octet-stream",
        filename=f"{file_id}.enc",
    )


@router.delete("/{room_id}/files/{file_id}")
async def delete_vault_file(
    room_id: str,
    file_id: str,
    db: aiosqlite.Connection = Depends(get_db),
):
    """Delete a staged encrypted file from disk and remove its metadata from SQLite."""
    cursor = await db.execute(
        "SELECT file_path FROM vault_files WHERE id = ? AND room_id = ?",
        (file_id, room_id)
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = row["file_path"]

    # Remove encrypted binary from disk
    if os.path.exists(file_path):
        os.remove(file_path)

    # Remove metadata from DB
    await db.execute(
        "DELETE FROM vault_files WHERE id = ? AND room_id = ?",
        (file_id, room_id)
    )
    await db.commit()

    return {"deleted": True}

import os
import shutil
import uuid
import aiosqlite
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from typing import List, Optional
from database import get_db
from models import VaultFileMetadata
from config import settings

router = APIRouter(prefix="/api/rooms")
uploads_router = APIRouter(prefix="/api/uploads")


def get_uploads_disk_usage() -> int:
    """Calculate total bytes occupied on disk by the uploads staging folder."""
    total = 0
    if os.path.exists(settings.UPLOADS_DIR):
        for root, _, files in os.walk(settings.UPLOADS_DIR):
            for f in files:
                fp = os.path.join(root, f)
                try:
                    total += os.path.getsize(fp)
                except OSError:
                    pass
    return total


# ---------------------------------------------------------------------------
# Global Uploads Management (GET & DELETE all uploads)
# ---------------------------------------------------------------------------

@uploads_router.get("")
async def get_all_uploads(
    room_id: Optional[str] = Query(None, description="Optional room ID filter"),
    db: aiosqlite.Connection = Depends(get_db)
):
    """List all staged uploads across all rooms (or a specific room), with total file count and disk usage."""
    if room_id:
        cursor = await db.execute(
            "SELECT id, room_id, file_name, file_size, iv, salt, created_at FROM vault_files WHERE room_id = ? ORDER BY created_at DESC",
            (room_id,)
        )
    else:
        cursor = await db.execute(
            "SELECT id, room_id, file_name, file_size, iv, salt, created_at FROM vault_files ORDER BY created_at DESC"
        )
    rows = await cursor.fetchall()
    files = [dict(row) for row in rows]
    total_size = sum(f["file_size"] for f in files)
    disk_usage = get_uploads_disk_usage()

    return {
        "status": "ok",
        "total_files": len(files),
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "disk_usage_bytes": disk_usage,
        "disk_usage_mb": round(disk_usage / (1024 * 1024), 2),
        "files": files
    }


@uploads_router.delete("")
async def delete_all_uploads(
    room_id: Optional[str] = Query(None, description="Optional room ID to only delete its uploads"),
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Delete all staged upload files from disk and SQLite across all rooms (or for a specific room).
    Frees server storage immediately.
    """
    freed_bytes = 0
    deleted_count = 0

    if room_id:
        cursor = await db.execute("SELECT id, file_path, file_size FROM vault_files WHERE room_id = ?", (room_id,))
        rows = await cursor.fetchall()
        for row in rows:
            file_path = row["file_path"]
            if os.path.exists(file_path):
                try:
                    freed_bytes += os.path.getsize(file_path)
                    os.remove(file_path)
                except OSError:
                    pass
            deleted_count += 1

        # Remove room upload folder if present
        room_dir = os.path.join(settings.UPLOADS_DIR, room_id)
        if os.path.exists(room_dir):
            try:
                shutil.rmtree(room_dir, ignore_errors=True)
            except OSError:
                pass

        await db.execute("DELETE FROM vault_files WHERE room_id = ?", (room_id,))
        await db.commit()
    else:
        # Delete all uploads across all rooms
        cursor = await db.execute("SELECT COUNT(*) as count FROM vault_files")
        row = await cursor.fetchone()
        deleted_count = row["count"] if row else 0

        freed_bytes = get_uploads_disk_usage()

        # Clean entire uploads directory
        if os.path.exists(settings.UPLOADS_DIR):
            for item in os.listdir(settings.UPLOADS_DIR):
                item_path = os.path.join(settings.UPLOADS_DIR, item)
                try:
                    if os.path.isdir(item_path):
                        shutil.rmtree(item_path, ignore_errors=True)
                    else:
                        os.remove(item_path)
                except OSError:
                    pass

        await db.execute("DELETE FROM vault_files")
        await db.commit()

    return {
        "status": "ok",
        "deleted_count": deleted_count,
        "freed_bytes": freed_bytes,
        "freed_mb": round(freed_bytes / (1024 * 1024), 2),
        "message": f"Successfully deleted {deleted_count} file(s) and freed {round(freed_bytes / (1024 * 1024), 2)} MB."
    }


# ---------------------------------------------------------------------------
# Room-Specific Vault File Routes
# ---------------------------------------------------------------------------

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


@router.delete("/{room_id}/files")
async def delete_all_room_files(
    room_id: str,
    db: aiosqlite.Connection = Depends(get_db),
):
    """Delete all staged encrypted files for a specific room."""
    return await delete_all_uploads(room_id=room_id, db=db)


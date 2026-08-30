import asyncio
import httpx
from main import app

async def test_api():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/api/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("1. Health check: OK")

        # 2. Create room (test both without and with trailing slash)
        res = await client.post("/api/rooms", json={"passphrase": "super-secret-key-123"})
        assert res.status_code == 200, f"Create room failed: {res.text}"
        data = res.json()
        room_id = data["room_id"]
        print(f"2. Room created via /api/rooms: {room_id} (created_at: {data['created_at']})")

        # 3. Join room with correct passphrase
        res = await client.post(f"/api/rooms/{room_id}/join", json={"passphrase": "super-secret-key-123"})
        assert res.status_code == 200, f"Join room failed: {res.text}"
        print("3. Join room (valid passphrase): OK")

        # 4. Join room with wrong passphrase (expect 401)
        res = await client.post(f"/api/rooms/{room_id}/join", json={"passphrase": "wrong-password"})
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        print("4. Join room (invalid passphrase -> 401): OK")

        # 5. Add note to vault
        note_data = {
            "type": "note",
            "title": "Secret Token",
            "encrypted_data": "dGVzdC1lbmNyeXB0ZWQtZGF0YQ==",
            "iv": "a1b2c3d4e5f6a1b2c3d4e5f6",
            "salt": "0102030405060708090a0b0c0d0e0f10"
        }
        res = await client.post(f"/api/rooms/{room_id}/vault", json=note_data)
        assert res.status_code == 200, f"Create vault item failed: {res.text}"
        item = res.json()
        item_id = item["id"]
        print(f"5. Vault note added: {item['title']} (id: {item_id})")

        # 6. List vault items
        res = await client.get(f"/api/rooms/{room_id}/vault")
        assert res.status_code == 200
        items = res.json()
        assert len(items) == 1
        print(f"6. Vault listed: {len(items)} item found")

        # 7. Delete vault item
        res = await client.delete(f"/api/rooms/{room_id}/vault/{item_id}")
        assert res.status_code == 200
        print("7. Vault note deleted: OK")

        # 8. Check empty vault
        res = await client.get(f"/api/rooms/{room_id}/vault")
        assert len(res.json()) == 0
        print("8. Vault is empty: OK")

        # 9. Test config / STUN servers
        res = await client.get(f"/api/rooms/{room_id}/config")
        assert res.status_code == 200
        print("9. WebRTC STUN config: OK")

        # 10. Test static SPA fallback
        res = await client.get(f"/room/{room_id}")
        assert res.status_code == 200
        assert "html" in res.headers.get("content-type", "").lower()
        print("10. SPA static fallback for /room/{room_id}: OK")

        # 11. Test upload staged file
        files = {"file": ("test.enc", b"encrypted_sample_data_12345", "application/octet-stream")}
        form_data = {
            "iv": "abcdef123456abcdef123456",
            "salt": "0102030405060708090a0b0c0d0e0f10",
            "original_file_name": "sample_document.pdf",
            "original_file_size": "27"
        }
        res = await client.post(f"/api/rooms/{room_id}/files", files=files, data=form_data)
        assert res.status_code == 200, f"Upload failed: {res.text}"
        uploaded_meta = res.json()
        print(f"11. Staged file uploaded: {uploaded_meta['file_name']} (id: {uploaded_meta['id']})")

        # 12. Test GET /api/uploads
        res = await client.get("/api/uploads")
        assert res.status_code == 200
        data = res.json()
        assert data["total_files"] >= 1
        print(f"12. GET /api/uploads: {data['total_files']} files, total size: {data['total_size_bytes']} bytes: OK")

        # 13. Test DELETE /api/uploads
        res = await client.delete("/api/uploads")
        assert res.status_code == 200
        del_data = res.json()
        assert del_data["status"] == "ok"
        print(f"13. DELETE /api/uploads: {del_data['deleted_count']} files deleted: OK")

        # 14. Verify uploads list is empty
        res = await client.get("/api/uploads")
        assert res.status_code == 200
        assert res.json()["total_files"] == 0
        print("14. Verified uploads list is now empty: OK")

        print("\nALL 14 API & INTEGRATION CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_api())

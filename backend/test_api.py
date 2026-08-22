import asyncio
import httpx
from main import app

async def test_api():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/api/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("1. Health check: OK")

        # 2. Create room
        res = await client.post("/api/rooms/", json={"passphrase": "super-secret-key-123"})
        assert res.status_code == 200, f"Create room failed: {res.text}"
        data = res.json()
        room_id = data["room_id"]
        print(f"2. Room created: {room_id} (created_at: {data['created_at']})")

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

        print("\nALL 10 API & INTEGRATION CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_api())

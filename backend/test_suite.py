import asyncio
import httpx
from app.app import app
from app.db.database import init_db, engine

async def run_tests():
    # 1. Initialize DB schema
    await init_db()
    print("Database initialized successfully.")

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 2. Health check
        res = await client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("1. /health check: OK")

        # 3. Create room
        res = await client.post("/api/rooms/", json={"passphrase": "super-secret-key-123"})
        assert res.status_code == 200, f"Create room failed: {res.text}"
        data = res.json()
        room_id = data["room_id"]
        print(f"2. /api/rooms/ created: {room_id} (created_at: {data['created_at']})")

        # 4. Join room with valid passphrase
        res = await client.post(f"/api/rooms/{room_id}/join", json={"passphrase": "super-secret-key-123"})
        assert res.status_code == 200, f"Join room failed: {res.text}"
        assert res.json()["joined"] is True
        print("3. /api/rooms/{id}/join (valid passphrase): OK")

        # 5. Join room with wrong passphrase -> Expect 401
        res = await client.post(f"/api/rooms/{room_id}/join", json={"passphrase": "wrong-password"})
        assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
        print("4. /api/rooms/{id}/join (invalid passphrase -> 401 CustomException): OK")

        # 6. Join non-existent room -> Expect 404
        res = await client.post("/api/rooms/NONEXIST/join", json={"passphrase": "any"})
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("5. /api/rooms/{id}/join (non-existent room -> 404 CustomException): OK")

        # 7. Add note to vault
        note_data = {
            "type": "note",
            "title": "Secret Recovery Key",
            "encrypted_data": "dGVzdC1lbmNyeXB0ZWQtZGF0YQ==",
            "iv": "a1b2c3d4e5f6a1b2c3d4e5f6",
            "salt": "0102030405060708090a0b0c0d0e0f10"
        }
        res = await client.post(f"/api/rooms/{room_id}/vault", json=note_data)
        assert res.status_code == 200, f"Create vault item failed: {res.text}"
        item = res.json()
        item_id = item["id"]
        print(f"6. /api/rooms/{{id}}/vault note added: {item['title']} (id: {item_id})")

        # 8. List vault items
        res = await client.get(f"/api/rooms/{room_id}/vault")
        assert res.status_code == 200
        items = res.json()
        assert len(items) == 1
        print(f"7. /api/rooms/{{id}}/vault listed: {len(items)} item")

        # 9. Update vault item
        update_data = {"title": "Updated Secret Recovery Key"}
        res = await client.put(f"/api/rooms/{room_id}/vault/{item_id}", json=update_data)
        assert res.status_code == 200
        assert res.json()["title"] == "Updated Secret Recovery Key"
        print("8. /api/rooms/{id}/vault/{item_id} updated: OK")

        # 10. Delete vault item
        res = await client.delete(f"/api/rooms/{room_id}/vault/{item_id}")
        assert res.status_code == 200
        assert res.json()["deleted"] is True
        print("9. /api/rooms/{id}/vault/{item_id} deleted: OK")

        # 11. Verify vault is now empty
        res = await client.get(f"/api/rooms/{room_id}/vault")
        assert len(res.json()) == 0
        print("10. /api/rooms/{id}/vault empty check: OK")

        # 12. WebRTC STUN config
        res = await client.get(f"/api/rooms/{room_id}/config")
        assert res.status_code == 200
        assert "iceServers" in res.json()
        print("11. /api/rooms/{id}/config STUN config: OK")

        # 13. Active peers list
        res = await client.get(f"/api/rooms/{room_id}/peers")
        assert res.status_code == 200
        assert "peers" in res.json()
        print("12. /api/rooms/{id}/peers list: OK")

        # 14. SPA static fallback
        res = await client.get(f"/room/{room_id}")
        assert res.status_code == 200
        print("13. SPA client-side fallback /room/{room_id}: OK")

        print("\n=== ALL 13 NEW ARCHITECTURE TESTS PASSED SUCCESSFULLY! ===")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_tests())

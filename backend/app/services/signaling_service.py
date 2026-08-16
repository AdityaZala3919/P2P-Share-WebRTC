import json
from typing import Dict, Any, List
from fastapi import WebSocket, WebSocketDisconnect
from app.schemas.signaling import DeviceInfo

class SignalingService:
    """In-memory signaling service for WebRTC mesh peer coordination."""
    
    # rooms: dict[room_id, dict[peer_id, {"ws": WebSocket, "device": DeviceInfo}]]
    _registry: Dict[str, Dict[str, Dict[str, Any]]] = {}

    @classmethod
    def get_connected_peers(cls, room_id: str) -> List[DeviceInfo]:
        """Return list of currently active devices in a room."""
        if room_id not in cls._registry:
            return []
        return [peer_data["device"] for peer_data in cls._registry[room_id].values()]

    @classmethod
    async def handle_connection(
        cls,
        websocket: WebSocket,
        room_id: str,
        peer_id: str,
        device_name: str,
        device_type: str,
    ) -> None:
        """Manage full WebSocket signaling lifecycle for a peer."""
        await websocket.accept()
        device = DeviceInfo(peer_id=peer_id, device_name=device_name, device_type=device_type)

        if room_id not in cls._registry:
            cls._registry[room_id] = {}

        # 1. Notify existing peers that a new peer joined
        join_msg = {"type": "peer-joined", "peer": device.model_dump()}
        for existing_peer_id, peer_data in cls._registry[room_id].items():
            try:
                await peer_data["ws"].send_json(join_msg)
            except Exception:
                pass

        # 2. Send existing peer list to the newly connected peer
        existing_peers = [p["device"].model_dump() for p in cls._registry[room_id].values()]
        try:
            await websocket.send_json({"type": "peer-list", "peers": existing_peers})
        except Exception:
            pass

        # 3. Add new peer to registry
        cls._registry[room_id][peer_id] = {"ws": websocket, "device": device}

        try:
            while True:
                data = await websocket.receive_text()
                try:
                    msg = json.loads(data)
                except json.JSONDecodeError:
                    continue

                msg_type = msg.get("type")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
                    continue

                # Unicast WebRTC signaling (offer, answer, ICE candidate)
                if msg_type in ["offer", "answer", "ice-candidate"]:
                    to_peer = msg.get("to_peer")
                    if to_peer and to_peer in cls._registry.get(room_id, {}):
                        try:
                            await cls._registry[room_id][to_peer]["ws"].send_json(msg)
                        except Exception:
                            pass

                # Broadcast room messages (chat, clipboard fallback)
                elif msg_type in ["chat", "clipboard"]:
                    for other_peer_id, peer_data in cls._registry.get(room_id, {}).items():
                        if other_peer_id != peer_id:
                            try:
                                await peer_data["ws"].send_json(msg)
                            except Exception:
                                pass

        except WebSocketDisconnect:
            pass
        except Exception:
            pass
        finally:
            # 4. Cleanup on disconnect
            if room_id in cls._registry and peer_id in cls._registry[room_id]:
                del cls._registry[room_id][peer_id]
                if not cls._registry[room_id]:
                    del cls._registry[room_id]
                else:
                    leave_msg = {"type": "peer-left", "peer_id": peer_id}
                    for other_peer_id, peer_data in cls._registry.get(room_id, {}).items():
                        try:
                            await peer_data["ws"].send_json(leave_msg)
                        except Exception:
                            pass

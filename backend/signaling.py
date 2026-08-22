import json
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Any
from models import DeviceInfo
import asyncio

# in-memory room registry
# rooms: dict[room_id, dict[peer_id, {"ws": WebSocket, "device": DeviceInfo}]]
registry: Dict[str, Dict[str, Dict[str, Any]]] = {}

async def signaling_endpoint(websocket: WebSocket, room_id: str, peer_id: str, device_name: str, device_type: str):
    await websocket.accept()
    
    device = DeviceInfo(peer_id=peer_id, device_name=device_name, device_type=device_type)
    
    if room_id not in registry:
        registry[room_id] = {}
        
    # Notify existing peers about the new peer
    join_msg = {"type": "peer-joined", "peer": device.model_dump()}
    for existing_peer_id, peer_data in registry[room_id].items():
        try:
            await peer_data["ws"].send_json(join_msg)
        except Exception:
            pass
            
    # Send list of existing peers to the new peer
    existing_peers = [p["device"].model_dump() for p in registry[room_id].values()]
    try:
        await websocket.send_json({"type": "peer-list", "peers": existing_peers})
    except Exception:
        pass
        
    # Add new peer to registry
    registry[room_id][peer_id] = {"ws": websocket, "device": device}
    
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
                
            if msg_type in ["offer", "answer", "ice-candidate"]:
                to_peer = msg.get("to_peer")
                if to_peer and to_peer in registry[room_id]:
                    try:
                        await registry[room_id][to_peer]["ws"].send_json(msg)
                    except Exception:
                        pass
                        
            elif msg_type in ["chat", "clipboard"]:
                # broadcast to all OTHER peers
                for existing_peer_id, peer_data in registry[room_id].items():
                    if existing_peer_id != peer_id:
                        try:
                            await peer_data["ws"].send_json(msg)
                        except Exception:
                            pass
                            
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        # On disconnect
        if room_id in registry and peer_id in registry[room_id]:
            del registry[room_id][peer_id]
            if not registry[room_id]:
                del registry[room_id]
            else:
                leave_msg = {"type": "peer-left", "peer_id": peer_id}
                for existing_peer_id, peer_data in registry[room_id].items():
                    try:
                        await peer_data["ws"].send_json(leave_msg)
                    except Exception:
                        pass

from fastapi import APIRouter, WebSocket, Query
from app.services.signaling_service import SignalingService

router = APIRouter(tags=["Signaling"])

@router.websocket("/ws/{room_id}")
async def websocket_signaling(
    websocket: WebSocket,
    room_id: str,
    peer_id: str = Query(..., description="Unique client peer ID"),
    device_name: str = Query("Browser", description="Client device display name"),
    device_type: str = Query("desktop", description="Client device category"),
) -> None:
    """Real-time WebSocket signaling endpoint for WebRTC handshake."""
    await SignalingService.handle_connection(
        websocket=websocket,
        room_id=room_id,
        peer_id=peer_id,
        device_name=device_name,
        device_type=device_type,
    )

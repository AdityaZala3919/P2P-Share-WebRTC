from typing import Annotated
from fastapi import APIRouter, Depends, Body, Path

from app.services.room_service import RoomService
from app.services.signaling_service import SignalingService
from app.schemas.room import (
    CreateRoomRequest,
    JoinRoomRequest,
    RoomResponse,
    JoinRoomResponse,
    ConfigResponse,
)
from app.schemas.signaling import PeersListResponse

router = APIRouter(prefix="/rooms", tags=["Rooms"])

@router.post(
    "",
    response_model=RoomResponse,
    summary="Create an encrypted room",
    description="Generate a unique 8-character room identifier and hash the passphrase with bcrypt.",
)
@router.post(
    "/",
    response_model=RoomResponse,
    include_in_schema=False,
)
async def create_room(
    service: Annotated[RoomService, Depends()],
    request: Annotated[CreateRoomRequest, Body()],
) -> RoomResponse:
    return await service.create_room(passphrase=request.passphrase)

@router.post(
    "/{room_id}/join",
    response_model=JoinRoomResponse,
    summary="Join an encrypted room",
    description="Authenticate against the room's stored bcrypt passphrase hash.",
)
async def join_room(
    service: Annotated[RoomService, Depends()],
    room_id: Annotated[str, Path(description="Room unique identifier")],
    request: Annotated[JoinRoomRequest, Body()],
) -> JoinRoomResponse:
    return await service.verify_and_join_room(room_id=room_id, passphrase=request.passphrase)

@router.get(
    "/{room_id}/peers",
    response_model=PeersListResponse,
    summary="List active room peers",
    description="Retrieve list of currently connected WebRTC devices in the room.",
)
async def get_peers(
    room_id: Annotated[str, Path(description="Room unique identifier")],
) -> PeersListResponse:
    peers = SignalingService.get_connected_peers(room_id)
    return PeersListResponse(peers=peers)

@router.get(
    "/{room_id}/config",
    response_model=ConfigResponse,
    summary="Get WebRTC ICE STUN configuration",
    description="Retrieve public STUN server endpoints for WebRTC peer connection establishment.",
)
async def get_room_config(
    service: Annotated[RoomService, Depends()],
    room_id: Annotated[str, Path(description="Room unique identifier")],
) -> ConfigResponse:
    return service.get_config()

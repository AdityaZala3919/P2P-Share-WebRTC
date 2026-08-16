from typing import List, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field

class CreateRoomRequest(BaseModel):
    passphrase: str = Field(..., min_length=1, description="Passphrase for encrypting and joining the room")

class JoinRoomRequest(BaseModel):
    passphrase: str = Field(..., min_length=1, description="Passphrase to verify against room hash")

class RoomResponse(BaseModel):
    room_id: str
    created_at: Any

    class Config:
        from_attributes = True

class JoinRoomResponse(BaseModel):
    room_id: str
    joined: bool = True

class StunServerConfig(BaseModel):
    urls: List[str]

class ConfigResponse(BaseModel):
    iceServers: List[StunServerConfig]

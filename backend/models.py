from pydantic import BaseModel
from typing import Literal, Optional, Any

class RoomCreate(BaseModel):
    passphrase: str

class RoomJoinRequest(BaseModel):
    passphrase: str

class RoomInfo(BaseModel):
    id: str
    created_at: str

class VaultItemCreate(BaseModel):
    type: Literal['note','file']
    title: str
    encrypted_data: str
    iv: str
    salt: str
    file_size: Optional[int] = None
    file_name: Optional[str] = None

class VaultItemUpdate(BaseModel):
    title: Optional[str] = None
    encrypted_data: Optional[str] = None
    iv: Optional[str] = None

class VaultItemResponse(BaseModel):
    id: str
    room_id: str
    type: str
    title: str
    encrypted_data: str
    iv: str
    salt: str
    file_size: Optional[int] = None
    file_name: Optional[str] = None
    created_at: str
    updated_at: str

class SignalMessage(BaseModel):
    type: str
    from_peer: str
    to_peer: Optional[str] = None
    payload: Any = None

class DeviceInfo(BaseModel):
    peer_id: str
    device_name: str
    device_type: str

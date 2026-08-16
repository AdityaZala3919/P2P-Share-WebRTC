from typing import Optional, Any, List
from pydantic import BaseModel

class DeviceInfo(BaseModel):
    peer_id: str
    device_name: str
    device_type: str

class SignalMessage(BaseModel):
    type: str
    from_peer: Optional[str] = None
    to_peer: Optional[str] = None
    payload: Optional[Any] = None
    peer: Optional[DeviceInfo] = None
    peer_id: Optional[str] = None
    peers: Optional[List[DeviceInfo]] = None

class PeersListResponse(BaseModel):
    peers: List[DeviceInfo]

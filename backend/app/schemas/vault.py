from typing import Optional, Literal, Any
from pydantic import BaseModel, Field

class CreateVaultItemRequest(BaseModel):
    type: Literal["note", "file"]
    title: str = Field(..., min_length=1)
    encrypted_data: str = Field(..., min_length=1)
    iv: str = Field(..., min_length=1)
    salt: str = Field(..., min_length=1)
    file_size: Optional[int] = None
    file_name: Optional[str] = None

class UpdateVaultItemRequest(BaseModel):
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
    created_at: Any
    updated_at: Any

    class Config:
        from_attributes = True

class DeleteVaultItemResponse(BaseModel):
    deleted: bool = True

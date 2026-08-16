from typing import Annotated, List
from fastapi import APIRouter, Depends, Body, Path

from app.services.vault_service import VaultService
from app.schemas.vault import (
    CreateVaultItemRequest,
    UpdateVaultItemRequest,
    VaultItemResponse,
    DeleteVaultItemResponse,
)

router = APIRouter(prefix="/rooms", tags=["Vault"])

@router.get(
    "/{room_id}/vault",
    response_model=List[VaultItemResponse],
    summary="List encrypted vault items",
    description="Retrieve all encrypted notes and file records stored in the SQLite vault for this room.",
)
@router.get(
    "/{room_id}/vault/",
    response_model=List[VaultItemResponse],
    include_in_schema=False,
)
async def list_vault_items(
    service: Annotated[VaultService, Depends()],
    room_id: Annotated[str, Path(description="Room unique identifier")],
) -> List[VaultItemResponse]:
    return await service.list_vault_items(room_id=room_id)

@router.post(
    "/{room_id}/vault",
    response_model=VaultItemResponse,
    summary="Create an encrypted vault item",
    description="Store an encrypted AES-256-GCM note or file in the room's persistent SQLite vault.",
)
@router.post(
    "/{room_id}/vault/",
    response_model=VaultItemResponse,
    include_in_schema=False,
)
async def create_vault_item(
    service: Annotated[VaultService, Depends()],
    room_id: Annotated[str, Path(description="Room unique identifier")],
    request: Annotated[CreateVaultItemRequest, Body()],
) -> VaultItemResponse:
    return await service.create_vault_item(room_id=room_id, request=request)

@router.put(
    "/{room_id}/vault/{item_id}",
    response_model=VaultItemResponse,
    summary="Update an encrypted vault item",
    description="Update title or ciphertext of an existing vault item.",
)
async def update_vault_item(
    service: Annotated[VaultService, Depends()],
    room_id: Annotated[str, Path(description="Room unique identifier")],
    item_id: Annotated[str, Path(description="Vault item UUID")],
    request: Annotated[UpdateVaultItemRequest, Body()],
) -> VaultItemResponse:
    return await service.update_vault_item(room_id=room_id, item_id=item_id, request=request)

@router.delete(
    "/{room_id}/vault/{item_id}",
    response_model=DeleteVaultItemResponse,
    summary="Delete a vault item",
    description="Permanently delete an encrypted item from the SQLite database.",
)
async def delete_vault_item(
    service: Annotated[VaultService, Depends()],
    room_id: Annotated[str, Path(description="Room unique identifier")],
    item_id: Annotated[str, Path(description="Vault item UUID")],
) -> DeleteVaultItemResponse:
    return await service.delete_vault_item(room_id=room_id, item_id=item_id)

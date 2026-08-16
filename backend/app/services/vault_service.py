import uuid
from typing import Annotated, List, Optional
from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.models.vault import VaultItemModel
from app.schemas.vault import (
    CreateVaultItemRequest,
    UpdateVaultItemRequest,
    VaultItemResponse,
    DeleteVaultItemResponse,
)
from app.services.room_service import RoomService
from app.core.config import settings
from app.core.exceptions import VaultItemNotFound, FileTooLarge

class VaultService:
    """Service layer for encrypted vault item operations."""

    def __init__(
        self,
        session: Annotated[AsyncSession, Depends(get_session)],
        room_service: Annotated[RoomService, Depends()],
    ):
        self.session = session
        self.room_service = room_service

    async def list_vault_items(self, room_id: str) -> List[VaultItemResponse]:
        """
        List all encrypted items for a room in descending order of creation.
        """
        await self.room_service.verify_room_exists(room_id)

        query = (
            select(VaultItemModel)
            .where(VaultItemModel.room_id == room_id)
            .order_by(VaultItemModel.created_at.desc())
        )
        result = await self.session.execute(query)
        items = result.scalars().all()

        return [VaultItemResponse.model_validate(item) for item in items]

    async def create_vault_item(
        self, room_id: str, request: CreateVaultItemRequest
    ) -> VaultItemResponse:
        """
        Store a new encrypted item (note or file) into the room's vault.
        """
        if request.type == "file":
            if request.file_size is not None and request.file_size > settings.MAX_VAULT_FILE_SIZE:
                raise FileTooLarge(
                    message=f"File exceeds maximum allowed size of {settings.MAX_VAULT_FILE_SIZE} bytes"
                )

        await self.room_service.verify_room_exists(room_id)

        item_id = str(uuid.uuid4())
        item_obj = VaultItemModel(
            id=item_id,
            room_id=room_id,
            type=request.type,
            title=request.title,
            encrypted_data=request.encrypted_data,
            iv=request.iv,
            salt=request.salt,
            file_size=request.file_size,
            file_name=request.file_name,
        )

        self.session.add(item_obj)
        await self.session.flush()
        await self.session.refresh(item_obj)

        return VaultItemResponse.model_validate(item_obj)

    async def update_vault_item(
        self, room_id: str, item_id: str, request: UpdateVaultItemRequest
    ) -> VaultItemResponse:
        """
        Update title or encrypted payload of an existing vault item.
        """
        query = select(VaultItemModel).where(
            VaultItemModel.id == item_id,
            VaultItemModel.room_id == room_id,
        )
        result = await self.session.execute(query)
        item_obj = result.scalar_one_or_none()

        if not item_obj:
            raise VaultItemNotFound()

        if request.title is not None:
            item_obj.title = request.title
        if request.encrypted_data is not None:
            item_obj.encrypted_data = request.encrypted_data
        if request.iv is not None:
            item_obj.iv = request.iv

        self.session.add(item_obj)
        await self.session.flush()
        await self.session.refresh(item_obj)

        return VaultItemResponse.model_validate(item_obj)

    async def delete_vault_item(
        self, room_id: str, item_id: str
    ) -> DeleteVaultItemResponse:
        """
        Permanently delete a vault item from SQLite.
        """
        query = select(VaultItemModel).where(
            VaultItemModel.id == item_id,
            VaultItemModel.room_id == room_id,
        )
        result = await self.session.execute(query)
        item_obj = result.scalar_one_or_none()

        if not item_obj:
            raise VaultItemNotFound()

        await self.session.delete(item_obj)
        await self.session.flush()

        return DeleteVaultItemResponse(deleted=True)

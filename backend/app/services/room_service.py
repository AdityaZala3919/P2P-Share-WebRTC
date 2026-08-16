import random
import string
from typing import Annotated
import bcrypt
from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.models.room import RoomModel
from app.schemas.room import RoomResponse, JoinRoomResponse, ConfigResponse, StunServerConfig
from app.core.config import settings
from app.core.exceptions import RoomNotFound, InvalidPassphrase

class RoomService:
    """Service layer for room creation, authentication, and configuration."""

    def __init__(self, session: Annotated[AsyncSession, Depends(get_session)]):
        self.session = session

    @staticmethod
    def _generate_room_code(length: int = 8) -> str:
        return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))

    async def create_room(self, passphrase: str) -> RoomResponse:
        """
        Create a new room with a hashed passphrase.
        """
        room_id = self._generate_room_code(settings.ROOM_CODE_LENGTH)
        salt = bcrypt.gensalt()
        hashed_passphrase = bcrypt.hashpw(passphrase.encode("utf-8"), salt).decode("utf-8")

        room_obj = RoomModel(
            id=room_id,
            passphrase_hash=hashed_passphrase,
        )
        self.session.add(room_obj)
        await self.session.flush()
        await self.session.refresh(room_obj)

        return RoomResponse(
            room_id=room_obj.id,
            created_at=room_obj.created_at,
        )

    async def verify_and_join_room(self, room_id: str, passphrase: str) -> JoinRoomResponse:
        """
        Verify room existence and passphrase authentication.
        """
        query = select(RoomModel).where(RoomModel.id == room_id).limit(1)
        result = await self.session.execute(query)
        room_obj = result.scalar_one_or_none()

        if not room_obj:
            raise RoomNotFound()

        hashed_bytes = room_obj.passphrase_hash.encode("utf-8")
        if not bcrypt.checkpw(passphrase.encode("utf-8"), hashed_bytes):
            raise InvalidPassphrase()

        return JoinRoomResponse(room_id=room_id, joined=True)

    async def verify_room_exists(self, room_id: str) -> RoomModel:
        """
        Ensure room exists or raise RoomNotFound.
        """
        query = select(RoomModel).where(RoomModel.id == room_id).limit(1)
        result = await self.session.execute(query)
        room_obj = result.scalar_one_or_none()

        if not room_obj:
            raise RoomNotFound()
        return room_obj

    @staticmethod
    def get_config() -> ConfigResponse:
        """
        Return WebRTC STUN server configuration.
        """
        return ConfigResponse(iceServers=[StunServerConfig(urls=settings.STUN_URLS)])

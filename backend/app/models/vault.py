import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base
from app.core.utils.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.room import RoomModel

class VaultItemModel(Base, TimestampMixin):
    """Encrypted vault item (note or file) stored with AES-256-GCM ciphertext."""
    __tablename__ = "vault_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id: Mapped[str] = mapped_column(String(16), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'note' or 'file'
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    encrypted_data: Mapped[str] = mapped_column(Text, nullable=False)
    iv: Mapped[str] = mapped_column(String(64), nullable=False)
    salt: Mapped[str] = mapped_column(String(64), nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    room: Mapped["RoomModel"] = relationship("RoomModel", back_populates="vault_items")

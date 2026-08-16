from typing import List, TYPE_CHECKING
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base
from app.core.utils.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.vault import VaultItemModel

class RoomModel(Base, TimestampMixin):
    """Encrypted room model with bcrypt passphrase hash."""
    __tablename__ = "rooms"

    id: Mapped[str] = mapped_column(String(16), primary_key=True, index=True)
    passphrase_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Relationships
    vault_items: Mapped[List["VaultItemModel"]] = relationship(
        "VaultItemModel",
        back_populates="room",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

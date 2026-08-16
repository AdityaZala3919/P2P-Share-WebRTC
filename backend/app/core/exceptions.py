from typing import Optional, Dict, Any
from fastapi import status

class CustomException(Exception):
    """
    Base exception class for all application-specific exceptions.
    """
    message: str = "An error occurred"
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "UNKNOWN_ERROR"

    def __init__(
        self,
        message: Optional[str] = None,
        error_code: Optional[str] = None,
        status_code: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        if message is not None:
            self.message = message
        if error_code is not None:
            self.error_code = error_code
        if status_code is not None:
            self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error_code": self.error_code,
            "message": self.message,
            "status_code": self.status_code,
            "details": self.details if self.details else None,
        }

class RoomNotFound(CustomException):
    message = "Room not found"
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "ROOM_NOT_FOUND"

class RoomAlreadyExists(CustomException):
    message = "Room already exists"
    status_code = status.HTTP_409_CONFLICT
    error_code = "ROOM_ALREADY_EXISTS"

class InvalidPassphrase(CustomException):
    message = "Invalid passphrase"
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "INVALID_PASSPHRASE"

class VaultItemNotFound(CustomException):
    message = "Vault item not found"
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "VAULT_ITEM_NOT_FOUND"

class FileTooLarge(CustomException):
    message = "File exceeds maximum allowed size"
    status_code = status.HTTP_413_CONTENT_TOO_LARGE
    error_code = "FILE_TOO_LARGE"

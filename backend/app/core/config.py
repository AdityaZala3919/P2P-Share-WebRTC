import os
from typing import Annotated, Any, Literal, List
from pydantic import (
    AnyUrl,
    BeforeValidator,
    computed_field,
)
from pydantic_settings import BaseSettings, SettingsConfigDict

def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",") if i.strip()]
    elif isinstance(v, (list, str)):
        return v
    raise ValueError(v)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "../../../.env"),
        env_ignore_empty=True,
        extra="ignore",
    )

    # Base configuration
    PROJECT_NAME: str = "CipherShare"
    ENVIRONMENT: Literal["local", "staging", "production"] = "local"
    
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    FRONTEND_HOST: str = "http://localhost:5173"

    # CORS
    BACKEND_CORS_ORIGINS: Annotated[
        list[AnyUrl] | str, BeforeValidator(parse_cors)
    ] = [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:5173",
        "https://enormous-keys-ind-hit.trycloudflare.com",
        "https://rosa-boutique-discover-slope.trycloudflare.com",
    ]

    @computed_field
    @property
    def all_cors_origins(self) -> list[str]:
        origins = [str(origin).rstrip("/") for origin in self.BACKEND_CORS_ORIGINS]
        if self.FRONTEND_HOST not in origins:
            origins.append(self.FRONTEND_HOST)
        return origins

    # Database configuration (SQLite with AsyncIO)
    DATABASE_PATH: str = "ciphershare.db"

    @computed_field
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"sqlite+aiosqlite:///{self.DATABASE_PATH}"

    # P2P & WebRTC configuration
    STUN_URLS: List[str] = [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
    ]
    MAX_VAULT_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ROOM_CODE_LENGTH: int = 8

settings = Settings()

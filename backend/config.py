from dataclasses import dataclass

@dataclass
class Settings:
    DATABASE_URL: str = "./ciphershare.db"
    STUN_URLS: list[str] = None
    CORS_ORIGINS: list[str] = None
    MAX_VAULT_FILE_SIZE: int = 50 * 1024 * 1024  # 50 MB
    UPLOADS_DIR: str = "./uploads"               # Encrypted binary staging folder
    ROOM_CODE_LENGTH: int = 5

    def __post_init__(self):
        if self.STUN_URLS is None:
            self.STUN_URLS = ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]
        if self.CORS_ORIGINS is None:
            self.CORS_ORIGINS = ["http://localhost:5173", "http://localhost:4173", "http://localhost:8000"]

settings = Settings()

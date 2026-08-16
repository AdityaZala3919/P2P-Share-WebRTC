from fastapi import APIRouter
from app.api.v1.endpoints import rooms, vault, signaling

api_router = APIRouter(prefix="/api")

# Mount REST controllers
api_router.include_router(rooms.router)
api_router.include_router(vault.router)

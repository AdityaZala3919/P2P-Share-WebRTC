import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import init_db, close_db
from config import settings
from routes import rooms, vault
from signaling import signaling_endpoint

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms.router)
app.include_router(vault.router)

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, peer_id: str, device_name: str, device_type: str):
    await signaling_endpoint(websocket, room_id, peer_id, device_name, device_type)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Static frontend support (prioritize frontend_static, fallback to frontend/dist)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
frontend_static = os.path.join(project_root, "frontend_static")
frontend_dist = os.path.join(project_root, "frontend", "dist")

static_root = frontend_static if os.path.exists(frontend_static) else frontend_dist

css_dir = os.path.join(static_root, "css")
js_dir = os.path.join(static_root, "js")
assets_dir = os.path.join(static_root, "assets")

if os.path.exists(css_dir):
    app.mount("/css", StaticFiles(directory=css_dir), name="css")
if os.path.exists(js_dir):
    app.mount("/js", StaticFiles(directory=js_dir), name="js")
if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

@app.get("/room/{room_id:path}")
async def serve_room(room_id: str):
    room_html = os.path.join(static_root, "room.html")
    if os.path.exists(room_html):
        return FileResponse(room_html)
    index_html = os.path.join(static_root, "index.html")
    if os.path.exists(index_html):
        return FileResponse(index_html)
    raise HTTPException(status_code=404, detail="Room template not found")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api") or full_path.startswith("ws"):
        raise HTTPException(status_code=404, detail="Not Found")
    
    file_path = os.path.join(static_root, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
        
    index_path = os.path.join(static_root, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
        
    return {"message": "CipherShare Backend Running. Static frontend not found."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

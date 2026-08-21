import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.api.v1.endpoints.signaling import router as signaling_router
from app.core.config import settings
from app.core.exceptions import CustomException
from app.core.schemas import BaseErrorResponse
from app.startup import lifespan

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    swagger_ui_parameters={
        "deepLinking": False,
        "defaultModelsExpandDepth": -1,
        "displayRequestDuration": True,
        "requestSnippetsEnabled": True,
        "withCredentials": True,
        "tryItOutEnabled": True,
    },
)

# CORS Middleware - permit all tunnel domains, local networks, and development ports
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API router & WebSocket signaling
app.include_router(api_router)
app.include_router(signaling_router)

# Custom Exception Handler
@app.exception_handler(CustomException)
async def custom_exception_handler(request: Request, exc: CustomException):
    """Handle custom domain exceptions."""
    error_response = BaseErrorResponse(
        status="error",
        code=exc.status_code,
        message=exc.message,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump(by_alias=True),
    )

# Health check endpoints
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check() -> dict:
    """Liveness / readiness probe."""
    return {"status": "ok"}

# Frontend static directory support
frontend_static = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../frontend_static")
)
frontend_dist = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../frontend/dist")
)

# Prioritize frontend_static, fallback to frontend/dist
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

@app.get("/room/{room_id:path}", include_in_schema=False)
async def serve_room(room_id: str):
    room_html = os.path.join(static_root, "room.html")
    if os.path.exists(room_html):
        return FileResponse(room_html)
    index_html = os.path.join(static_root, "index.html")
    if os.path.exists(index_html):
        return FileResponse(index_html)
    raise HTTPException(status_code=404, detail="Room template not found")

@app.get("/{full_path:path}", include_in_schema=False)
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

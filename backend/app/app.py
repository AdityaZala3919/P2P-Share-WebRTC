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

# Frontend SPA support
frontend_dist = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../frontend/dist")
)
assets_dir = os.path.join(frontend_dist, "assets")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    if full_path.startswith("api") or full_path.startswith("ws"):
        raise HTTPException(status_code=404, detail="Not Found")

    file_path = os.path.join(frontend_dist, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)

    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)

    return {"message": "CipherShare Backend Running. Frontend dist not built."}

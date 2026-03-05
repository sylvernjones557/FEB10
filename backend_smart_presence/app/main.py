
# Load environment variables from .env before any config import
import os
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'), override=True)

# ── Force IPv4 for Supabase connectivity ──
# Systems without IPv6 fail when Python tries IPv6 first → timeout.
# Patch socket.getaddrinfo early to prefer IPv4 results globally.
import socket as _socket
_orig_getaddrinfo = _socket.getaddrinfo
def _ipv4_first_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    results = _orig_getaddrinfo(host, port, family, type, proto, flags)
    results.sort(key=lambda x: x[0] != _socket.AF_INET)
    return results
_socket.getaddrinfo = _ipv4_first_getaddrinfo

# ── CPU Performance: Set thread limits BEFORE importing any numerical libraries ──
# This must happen before numpy, onnxruntime, cv2, etc. are imported
_cpu_threads = os.getenv("ONNX_NUM_THREADS", "2")
os.environ.setdefault("OMP_NUM_THREADS", _cpu_threads)
os.environ.setdefault("OMP_WAIT_POLICY", "PASSIVE")
os.environ.setdefault("MKL_NUM_THREADS", _cpu_threads)
os.environ.setdefault("OPENBLAS_NUM_THREADS", _cpu_threads)
os.environ.setdefault("NUMEXPR_NUM_THREADS", _cpu_threads)
# Disable CUDA/GPU globally at environment level
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")
os.environ.setdefault("ONNXRUNTIME_PROVIDERS", "CPUExecutionProvider")

from fastapi import FastAPI
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings

# ── Detect Frontend (Docker unified mode) ──
# When built with the unified Dockerfile, frontend dist is at /app/frontend/
_frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
_frontend_available = os.path.isdir(_frontend_dir) and os.path.isfile(os.path.join(_frontend_dir, "index.html"))
_frontend_index = os.path.join(_frontend_dir, "index.html") if _frontend_available else None

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Smart Presence Backend API - CPU-optimized for low-power systems. Powered by Supabase & InsightFace.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Robust CORS for frontend and tools
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    # Docker unified mode: serve the React frontend at root
    if _frontend_available:
        return FileResponse(_frontend_index, media_type="text/html")
    # Standalone backend mode: return API info
    return {
        "message": "Welcome to Smart Presence Backend",
        "status": "online",
        "version": "1.0.0",
        "mode": "CPU-optimized (low-power)",
        "docs_url": f"{settings.API_V1_STR}/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "ok", "device": "cpu", "mode": "low-power"}

@app.get("/system-info")
def system_info():
    """Returns current CPU optimization settings for debugging."""
    return {
        "device": "CPU-only",
        "face_model": settings.FACE_MODEL_NAME,
        "det_size": settings.FACE_DET_SIZE_CPU,
        "max_image_dim": settings.MAX_IMAGE_DIMENSION,
        "onnx_threads": settings.ONNX_NUM_THREADS,
        "lazy_load": settings.LAZY_LOAD_ENGINE,
        "env_omp_threads": os.environ.get("OMP_NUM_THREADS"),
        "env_cuda_visible": os.environ.get("CUDA_VISIBLE_DEVICES", "(not set)"),
        "frontend_mode": "unified (Docker)" if _frontend_available else "standalone (API only)",
    }


# ══════════════════════════════════════════════════════════════
# Frontend Static Files — Docker Unified Mode
# When the frontend dist/ folder is present (built via unified Dockerfile),
# serve it alongside the API from the SAME port.
# All API routes (/api/v1/*, /health, /system-info) take priority.
# Everything else falls through to the frontend SPA.
# ══════════════════════════════════════════════════════════════
if _frontend_available:
    import mimetypes

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        """
        SPA catch-all route:
        1. If the path matches a real file in frontend/dist → serve it (JS, CSS, images)
        2. Otherwise → serve index.html (React Router handles client-side routing)
        """
        # Try to serve the exact file (e.g., /assets/index-abc123.js)
        file_path = os.path.join(_frontend_dir, full_path)
        if full_path and os.path.isfile(file_path):
            # Auto-detect MIME type for proper Content-Type header
            mime_type, _ = mimetypes.guess_type(file_path)
            return FileResponse(file_path, media_type=mime_type)

        # Fallback: serve index.html for all unknown routes (SPA client-side routing)
        return FileResponse(_frontend_index, media_type="text/html")


# Load environment variables from .env before any config import
import os
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'), override=True)

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
from starlette.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings

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
    }

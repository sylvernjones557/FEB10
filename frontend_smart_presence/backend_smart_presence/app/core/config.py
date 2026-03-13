
import os
from typing import Any, Optional

from pydantic import Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE_THIS_TO_A_SECRET_KEY_PLEASE")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    PROJECT_NAME: str = "Smart Presence Backend"

    # SQLite (local file — no internet needed)
    DATABASE_URL: str = Field(
        default="sqlite:///./db/sqlite/smart_presence.db",
        env="DATABASE_URL"
    )

    # AI & Vector DB
    CHROMA_DB_PATH: str = "./db/chroma"

    # Face match threshold (cosine distance)
    FACE_MATCH_THRESHOLD: float = 0.5

    # Face engine runtime mode: forced to CPU for low-power systems
    FACE_DEVICE_PREFERENCE: str = Field(default="cpu", env="FACE_DEVICE_PREFERENCE")

    # Detector input size — lower = faster on CPU (160-320 recommended for low-power)
    FACE_DET_SIZE_CPU: int = Field(default=320, env="FACE_DET_SIZE_CPU")
    FACE_DET_SIZE_GPU: int = Field(default=640, env="FACE_DET_SIZE_GPU")

    # Model variant: buffalo_sc is the smallest & fastest for CPU
    FACE_MODEL_NAME: str = Field(default="buffalo_sc", env="FACE_MODEL_NAME")

    # ── CPU Performance Tuning ──
    # Max image dimension (pixels) — images are downscaled before processing
    MAX_IMAGE_DIMENSION: int = Field(default=640, env="MAX_IMAGE_DIMENSION")

    # ONNX Runtime thread count (0 = auto, 1-2 recommended for low-power CPU)
    ONNX_NUM_THREADS: int = Field(default=2, env="ONNX_NUM_THREADS")

    # Number of uvicorn workers (1 for low-power systems)
    UVICORN_WORKERS: int = Field(default=1, env="UVICORN_WORKERS")

    # Lazy-load the face engine (only load on first recognition request, not at startup)
    LAZY_LOAD_ENGINE: bool = Field(default=True, env="LAZY_LOAD_ENGINE")

    # JPEG quality for any re-encoding (lower = faster processing)
    IMAGE_QUALITY: int = Field(default=80, env="IMAGE_QUALITY")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

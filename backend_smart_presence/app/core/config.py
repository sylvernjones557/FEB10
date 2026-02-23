
import os
from typing import Any, Optional

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE_THIS_TO_A_SECRET_KEY_PLEASE")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    PROJECT_NAME: str = "Smart Presence Backend"

    # PostgreSQL (Supabase)
    DATABASE_URL: str = Field(..., env="DATABASE_URL")

    # Supabase config
    SUPABASE_URL: AnyHttpUrl = Field(..., env="SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(..., env="SUPABASE_SERVICE_ROLE_KEY")

    # AI & Vector DB
    CHROMA_DB_PATH: str = "./chroma_store"

    # Face match threshold (cosine distance)
    FACE_MATCH_THRESHOLD: float = 0.5

    # Face engine runtime mode: auto | gpu | cpu
    FACE_DEVICE_PREFERENCE: str = Field(default="auto", env="FACE_DEVICE_PREFERENCE")

    # Device-specific detector input size (higher = potentially better accuracy, lower = faster)
    FACE_DET_SIZE_CPU: int = Field(default=480, env="FACE_DET_SIZE_CPU")
    FACE_DET_SIZE_GPU: int = Field(default=640, env="FACE_DET_SIZE_GPU")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

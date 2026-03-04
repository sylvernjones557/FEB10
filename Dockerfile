# ============================================================
# Smart Presence — Unified Docker Image
# Backend (FastAPI) + Frontend (React) in ONE container
# CPU-Only, optimized for low-end college PCs
# DB stays in the cloud (Supabase) — no local database needed
# ============================================================
# Build:  docker compose build
# Run:    docker compose up -d
# Access: http://localhost:8000
# ============================================================

# ── Stage 1: Build Frontend ─────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy package files first (Docker layer caching — only reinstall if deps change)
COPY frontend_smart_presence/package.json frontend_smart_presence/package-lock.json ./

# Install Node dependencies (ci = clean install, reproducible)
RUN npm ci --ignore-scripts 2>/dev/null || npm install

# Copy all frontend source files
COPY frontend_smart_presence/ .

# Override API URL to use RELATIVE path — works from ANY host/IP
# (browser resolves /api/v1 relative to wherever it loaded the page from)
RUN echo "VITE_API_BASE_URL=/api/v1" > .env.production.local

# Build production bundle → outputs to /frontend/dist/
RUN npm run build


# ── Stage 2: Python Backend + Frontend Static Files ─────────
FROM python:3.11-slim AS runtime

# Prevent Python from writing .pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Force IPv4 for all external connections (Docker can't route IPv6 to Supabase)
RUN echo 'precedence ::ffff:0:0/96  100' >> /etc/gai.conf

# ── CPU Performance Tuning (set BEFORE any numerical library imports) ──
ENV OMP_NUM_THREADS=2 \
    OMP_WAIT_POLICY=PASSIVE \
    MKL_NUM_THREADS=2 \
    OPENBLAS_NUM_THREADS=2 \
    NUMEXPR_NUM_THREADS=2 \
    CUDA_VISIBLE_DEVICES="" \
    ONNXRUNTIME_PROVIDERS=CPUExecutionProvider

# Install system dependencies for OpenCV, InsightFace, psycopg2
# g++ is needed to compile InsightFace's C++ cython extension during pip install
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    curl \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install Python Dependencies (layer cached — only reinstall if requirements change) ──
COPY backend_smart_presence/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    # Remove g++ after pip install — saves ~150MB, only needed for building C extensions
    apt-get purge -y g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# ── Copy Backend Application Code ──
COPY backend_smart_presence/app/ ./app/

# ── Copy ChromaDB Data (face embeddings — persisted via Docker volume at runtime) ──
COPY backend_smart_presence/chroma_store/ ./chroma_store/

# ── Copy Frontend Build Output (from Stage 1) ──
COPY --from=frontend-builder /frontend/dist ./frontend/

# NOTE: .env is NOT baked into the image (security best practice)
# It's mounted at runtime via docker-compose env_file or volume mount

# Single port serves BOTH frontend and API
EXPOSE 8000

# Health check — verifies backend is responsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the unified server
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

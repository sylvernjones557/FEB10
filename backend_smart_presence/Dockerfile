# ============================================
# Smart Presence Backend — Docker Image
# CPU-Only, optimized for low-power college PCs
# ============================================
FROM python:3.11-slim AS base

# Prevent Python from buffering stdout/stderr (logs show immediately)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Force IPv4 for external connections (Docker containers often can't reach IPv6)
# This fixes "Network is unreachable" errors connecting to Supabase
RUN echo 'precedence ::ffff:0:0/96  100' >> /etc/gai.conf

# CPU performance tuning — set BEFORE any numerical library imports
ENV OMP_NUM_THREADS=2 \
    OMP_WAIT_POLICY=PASSIVE \
    MKL_NUM_THREADS=2 \
    OPENBLAS_NUM_THREADS=2 \
    NUMEXPR_NUM_THREADS=2 \
    CUDA_VISIBLE_DEVICES="" \
    ONNXRUNTIME_PROVIDERS=CPUExecutionProvider

# Install system dependencies required by OpenCV, InsightFace, psycopg2
# g++ is needed to build InsightFace's C++ mesh_core_cython extension
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

# Set working directory
WORKDIR /app

# Copy requirements first (Docker layer caching — only reinstall if deps change)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY .env .env
COPY chroma_store/ ./chroma_store/

# Expose the backend port
EXPOSE 8000

# Health check — checks /health endpoint every 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the server
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

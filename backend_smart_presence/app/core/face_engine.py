
import numpy as np
import cv2
from insightface.app import FaceAnalysis
import threading
import os
from app.core.config import settings


def _configure_cpu_threads():
    """Set thread limits for all numerical libraries to prevent CPU thrashing on low-power systems."""
    num_threads = str(settings.ONNX_NUM_THREADS) if settings.ONNX_NUM_THREADS > 0 else "2"
    # OpenMP (used by ONNX Runtime and many C libraries)
    os.environ["OMP_NUM_THREADS"] = num_threads
    os.environ["OMP_WAIT_POLICY"] = "PASSIVE"  # don't busy-wait (saves CPU)
    # MKL (Intel Math Kernel Library)
    os.environ["MKL_NUM_THREADS"] = num_threads
    # OpenBLAS
    os.environ["OPENBLAS_NUM_THREADS"] = num_threads
    # NumPy / SciPy internal threading
    os.environ["NUMEXPR_NUM_THREADS"] = num_threads
    # ONNX Runtime specific
    os.environ["ORT_DISABLE_ALL_OPTIMIZATIONS"] = "0"


def downscale_image(img: np.ndarray, max_dim: int = None) -> np.ndarray:
    """Downscale image so the largest dimension is at most max_dim pixels.
    This dramatically reduces CPU load for face detection/recognition."""
    if max_dim is None:
        max_dim = settings.MAX_IMAGE_DIMENSION
    h, w = img.shape[:2]
    if max(h, w) <= max_dim:
        return img
    scale = max_dim / max(h, w)
    new_w, new_h = int(w * scale), int(h * scale)
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)


class FaceEngine:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(FaceEngine, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def _initialize(self):
        if self._initialized:
            return
        print("[FaceEngine] Initializing in CPU-only mode for low-power system...")

        # Apply CPU thread limits BEFORE loading any model
        _configure_cpu_threads()

        # Force CPU-only — no GPU probing at all
        providers = ['CPUExecutionProvider']
        ctx_id = -1
        det_size = (settings.FACE_DET_SIZE_CPU, settings.FACE_DET_SIZE_CPU)

        # Configure ONNX Runtime session options for CPU efficiency
        sess_options = None
        try:
            import onnxruntime as ort
            sess_options = ort.SessionOptions()
            sess_options.intra_op_num_threads = settings.ONNX_NUM_THREADS if settings.ONNX_NUM_THREADS > 0 else 2
            sess_options.inter_op_num_threads = 1  # single inter-op thread for low CPU
            sess_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL  # sequential = less overhead
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            # Disable memory pattern optimization — saves RAM on low-power systems
            sess_options.enable_mem_pattern = False
            print(f"[FaceEngine] ONNX threads: intra={sess_options.intra_op_num_threads}, inter={sess_options.inter_op_num_threads}")
        except Exception as e:
            print(f"[FaceEngine] Warning: Could not configure ONNX session options: {e}")

        try:
            self.app = FaceAnalysis(
                name=settings.FACE_MODEL_NAME,
                providers=providers,
            )
            self.app.prepare(ctx_id=ctx_id, det_size=det_size)
            self.device = 'CPU'
            self.providers = providers
        except Exception as e:
            print(f"[FaceEngine] Error initializing: {e}")
            raise

        self._initialized = True
        print(f"[FaceEngine] Ready on CPU | model={settings.FACE_MODEL_NAME} | det_size={det_size} | max_img={settings.MAX_IMAGE_DIMENSION}px")

    def _ensure_initialized(self):
        """Lazy initialization — model loads on first use, not at import time."""
        if not self._initialized:
            with self._lock:
                if not self._initialized:
                    self._initialize()

    def get_faces(self, img_array: np.ndarray):
        """Detect faces in an image (BGR format). Auto-downscales for CPU performance."""
        self._ensure_initialized()
        img_array = downscale_image(img_array)
        return self.app.get(img_array)

    def extract_embedding(self, img_path_or_array):
        """Extract the embedding of the largest face found in the image."""
        self._ensure_initialized()

        if isinstance(img_path_or_array, str):
            if not os.path.exists(img_path_or_array):
                return None
            img = cv2.imread(img_path_or_array)
        else:
            img = img_path_or_array

        if img is None:
            return None

        # Downscale for CPU performance
        img = downscale_image(img)

        faces = self.get_faces(img)
        if not faces:
            return None
        
        # Sort by bounding box area to get the largest face
        faces.sort(key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)
        largest_face = faces[0]
        
        return largest_face.embedding.tolist()

    def extract_embeddings(self, img_array: np.ndarray):
        """Extract embeddings for ALL faces found in the image."""
        self._ensure_initialized()

        if img_array is None:
            return []
        
        img_array = downscale_image(img_array)
        faces = self.get_faces(img_array)
        if not faces:
            return []
            
        return [face.embedding.tolist() for face in faces]


# Lazy singleton — does NOT load model at import time
# Model loads on first actual use (saves startup time and memory)
face_engine = FaceEngine()

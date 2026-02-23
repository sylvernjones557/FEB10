
import numpy as np
import cv2
from insightface.app import FaceAnalysis
import threading
import os
from app.core.config import settings

# Initialize FaceAnalysis (this downloads models on first run if not present)
# We use a singleton pattern or global object to load model once.
class FaceEngine:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(FaceEngine, cls).__new__(cls)
                    cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        print("Initializing FaceEngine with automatic device selection...")

        available_providers = []
        try:
            import onnxruntime as ort
            available_providers = ort.get_available_providers()
        except Exception as e:
            print(f"Warning: Could not query ONNX Runtime providers: {e}")

        preferred_device = (settings.FACE_DEVICE_PREFERENCE or "auto").lower()
        has_cuda = 'CUDAExecutionProvider' in available_providers
        use_cuda = preferred_device == 'gpu' or (preferred_device == 'auto' and has_cuda)

        if preferred_device == 'cpu':
            use_cuda = False

        if use_cuda:
            providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
            ctx_id = 0
            det_size = (settings.FACE_DET_SIZE_GPU, settings.FACE_DET_SIZE_GPU)
            device_label = 'GPU'
        else:
            providers = ['CPUExecutionProvider']
            ctx_id = -1
            det_size = (settings.FACE_DET_SIZE_CPU, settings.FACE_DET_SIZE_CPU)
            device_label = 'CPU'

        try:
            self.app = FaceAnalysis(name="buffalo_l", providers=providers)
            self.app.prepare(ctx_id=ctx_id, det_size=det_size)
            self.device = device_label
            self.providers = providers
        except Exception as e:
            print(f"Warning: Failed to initialize on {device_label}. Falling back to CPU. Error: {e}")
            self.app = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
            self.app.prepare(ctx_id=-1, det_size=(settings.FACE_DET_SIZE_CPU, settings.FACE_DET_SIZE_CPU))
            self.device = 'CPU'
            self.providers = ['CPUExecutionProvider']

        print(f"FaceEngine initialized on {self.device} with providers: {self.providers}")

    def get_faces(self, img_array: np.ndarray):
        """
        Detect faces in an image (BGR format).
        Returns a list of Face objects (bbox, kps, det_score, landmark_3d_68, pose, land5k, embedding).
        Embedding is 512-dim vector.
        """
        return self.app.get(img_array)

    def extract_embedding(self, img_path_or_array):
        """
        Extract the embedding of the largest face found in the image.
        Returns the embedding (list of floats) or None if no face found.
        """
        if isinstance(img_path_or_array, str):
            if not os.path.exists(img_path_or_array):
                return None
            img = cv2.imread(img_path_or_array)
        else:
            img = img_path_or_array

        if img is None:
            return None

        faces = self.get_faces(img)
        if not faces:
            return None
        
        # Sort by bounding box area to get the largest face
        # face.bbox is [x1, y1, x2, y2]
        faces.sort(key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)
        largest_face = faces[0]
        
        # Return embedding as a standard python list (for JSON serialization/DB storage)
        return largest_face.embedding.tolist()

    def extract_embeddings(self, img_array: np.ndarray):
        """
        Extract embeddings for ALL faces found in the image.
        Returns a list of embeddings.
        """
        if img_array is None:
            return []
            
        faces = self.get_faces(img_array)
        if not faces:
            return []
            
        return [face.embedding.tolist() for face in faces]

face_engine = FaceEngine()

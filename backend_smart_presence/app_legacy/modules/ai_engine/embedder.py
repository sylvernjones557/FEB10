import cv2
import numpy as np
from insightface.app import FaceAnalysis


class FaceEmbedder:
    """
    ArcFace-based face embedding using InsightFace.

    IMPORTANT DESIGN:
    - This embedder expects a FULL IMAGE (not a cropped face).
    - InsightFace internally handles:
        - face detection
        - face alignment
        - embedding generation
    """

    def __init__(self):
        # CPU-only configuration (safe for your system)
        self.app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"]
        )

        # Prepare models (detection + recognition)
        self.app.prepare(
            ctx_id=0,          # CPU
            det_size=(224, 224)
        )

    def embed(self, image: np.ndarray) -> np.ndarray | None:
        """
        Generate a 512-d face embedding from a FULL image.

        Returns:
            np.ndarray (512,) if a face is found
            None if no face is detected
        """

        # Safety checks
        if image is None or image.size == 0:
            return None

        # OpenCV loads images in BGR → convert to RGB
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # InsightFace handles face detection internally
        faces = self.app.get(rgb)

        if not faces:
            # No face detected
            return None

        # Choose the most confident detected face
        faces = sorted(faces, key=lambda f: f.det_score, reverse=True)
        embedding = faces[0].embedding

        # Ensure float32 for vector DB compatibility
        return embedding.astype("float32")

import cv2
import time
import numpy as np
import logging

from app.modules.ai_engine.detector import YOLODetector
from app.modules.ai_engine.face_cropper import FaceCropper
from app.modules.ai_engine.embedder import FaceEmbedder
from app.modules.ai_engine.face_store import get_face_store

logger = logging.getLogger(__name__)


class LiveFaceRegistrar:
    """
    Live Camera Face Registration (Backend Only)

    - Uses live camera (phone / webcam / video file)
    - Captures multiple frames
    - Averages embeddings
    - Stores ONE clean identity
    """

    def __init__(
        self,
        video_source: str,
        frames_required: int = 8,
        capture_delay: float = 0.2
    ):
        self.video_source = video_source
        self.frames_required = frames_required
        self.capture_delay = capture_delay

        # AI components
        self.detector = YOLODetector(
            model_path="yolov8n.pt",
            device="cpu"
        )
        self.cropper = FaceCropper()
        self.embedder = FaceEmbedder()
        self.face_store = get_face_store()

    def register(self, person_id: str) -> dict:
        cap = cv2.VideoCapture(self.video_source)

        if not cap.isOpened():
            raise RuntimeError("Camera stream not available")

        embeddings = []
        collected = 0

        logger.info(f"Starting live face registration for {person_id}")

        try:
            while collected < self.frames_required:
                ret, frame = cap.read()
                if not ret:
                    continue

                bboxes = self.detector.detect(frame)
                if not bboxes:
                    continue

                # Use the first detected face only (controlled registration)
                face = self.cropper.crop(frame, bboxes[0])
                if face is None:
                    continue

                embedding = self.embedder.embed(face)
                if embedding is None:
                    continue

                embeddings.append(embedding)
                collected += 1

                logger.info(
                    f"Captured {collected}/{self.frames_required} frames"
                )

                time.sleep(self.capture_delay)

        finally:
            cap.release()

        if len(embeddings) < self.frames_required:
            raise RuntimeError("Insufficient face data captured")

        # --------------------------------------------------
        # Average embeddings (VERY IMPORTANT)
        # --------------------------------------------------
        final_embedding = np.mean(np.vstack(embeddings), axis=0)

        # --------------------------------------------------
        # Store identity in FaceStore (ChromaDB)
        # --------------------------------------------------
        self.face_store.add_identity(
            person_id,
            final_embedding.tolist()  # Chroma expects list, not numpy array
        )

        logger.info(f"Face registration completed for {person_id}")

        return {
            "person_id": person_id,
            "frames_used": len(embeddings),
            "status": "REGISTERED"
        }

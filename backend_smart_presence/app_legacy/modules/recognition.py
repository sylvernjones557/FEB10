import numpy as np
from typing import Optional

from app.modules.ai_engine.recognition_pipeline import RecognitionPipeline


class FaceRecognizer:
    """
    High-level face recognizer wrapper
    """

    def __init__(self):
        # NO import-time side effects
        self.pipeline = RecognitionPipeline()

    def recognize(self, face_img: np.ndarray) -> Optional[str]:
        """
        Recognize a face crop and return student_id if matched.
        NOTE: This assumes bbox logic is handled earlier.
        """
        # If your pipeline expects bbox, adapt here
        return None


# -------------------------------------------------
# LAZY SINGLETON (CRITICAL)
# -------------------------------------------------

_face_recognizer_instance = None


def get_face_recognizer() -> FaceRecognizer:
    global _face_recognizer_instance
    if _face_recognizer_instance is None:
        _face_recognizer_instance = FaceRecognizer()
    return _face_recognizer_instance

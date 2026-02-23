import cv2
import time
import logging

from app.modules.ai_engine.detector import YOLODetector
from app.modules.ai_engine.face_cropper import FaceCropper
from app.modules.ai_engine.embedder import FaceEmbedder
from app.modules.ai_engine.recognition_pipeline import RecognitionPipeline

logger = logging.getLogger(__name__)


class LiveRecognitionLoop:
    """
    Phase 8 → Phase 9.3 – Live Recognition Loop

    Responsibilities:
    - Run face recognition ONLY during SCANNING state
    - Push detections to AttendanceEngine
    - Exit safely on stop or camera failure
    """

    def __init__(
        self,
        session_manager,
        video_source: str = "http://192.168.1.4:8080/video"
    ):
        self.session_manager = session_manager
        self.video_source = video_source
        self.running = False

        # AI components (UNCHANGED)
        self.detector = YOLODetector(
            model_path="yolov8n.pt",
            device="cpu"
        )
        self.cropper = FaceCropper()
        self.embedder = FaceEmbedder()

    # --------------------------------------------------
    # START LOOP
    # --------------------------------------------------
    def start(self):
        # Safety: session must exist
        if not self.session_manager.is_active():
            logger.warning("Recognition loop started without active session")
            return

        self.running = True

        logger.info(f"Opening video source: {self.video_source}")
        cap = cv2.VideoCapture(self.video_source)

        # Camera unavailable → do NOT crash backend
        if not cap.isOpened():
            logger.error("Phone camera stream not available. Check IP & WiFi.")
            self.running = False
            return

        pipeline = RecognitionPipeline(
            detector=self.detector,
            cropper=self.cropper,
            embedder=self.embedder,
            identity_manager=self.session_manager.identity_manager
        )

        logger.info("Live recognition loop started (PHONE CAMERA)")

        try:
            while (
                self.running
                and self.session_manager.is_active()
                and self.session_manager.get_state() == "SCANNING"
            ):
                ret, frame = cap.read()
                if not ret:
                    logger.warning("Failed to read frame from phone camera")
                    time.sleep(0.2)
                    continue

                try:
                    results = pipeline.process_frame(frame)
                except Exception:
                    logger.exception("Error during recognition pipeline")
                    continue

                for r in results:
                    # Mark attendance ONLY during scanning
                    if r.get("is_new") and r.get("person_id"):
                        self.session_manager.attendance_engine.mark_present(
                            r["person_id"]
                        )

                # CPU safety (~8–10 FPS)
                time.sleep(0.12)

        finally:
            cap.release()
            self.running = False
            logger.info("Live recognition loop stopped")

    # --------------------------------------------------
    # STOP LOOP
    # --------------------------------------------------
    def stop(self):
        self.running = False

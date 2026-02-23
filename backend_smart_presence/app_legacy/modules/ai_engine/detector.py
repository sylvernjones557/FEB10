from ultralytics import YOLO
import numpy as np


class YOLODetector:
    """
    Unified YOLO face detector
    Exposes a standard `detect(frame)` interface
    """

    def __init__(self, model_path: str = "yolov8n.pt", device: str = "cpu"):
        self.device = device
        self.model = YOLO(model_path)
        self.model.to(self.device)
        print(f"[AI] YOLO loaded ({model_path}) on {self.device}")

    def detect(self, frame):
        """
        Accepts a numpy image (BGR).
        Returns: List of bounding boxes [x1, y1, x2, y2]
        """

        results = self.model(frame, verbose=False)

        bboxes = []

        for r in results:
            if r.boxes is None:
                continue

            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                bboxes.append([
                    int(x1), int(y1),
                    int(x2), int(y2)
                ])

        return bboxes


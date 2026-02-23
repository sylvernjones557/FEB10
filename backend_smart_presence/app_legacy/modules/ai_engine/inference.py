from app.modules.ai_engine.detector import YOLODetector
from app.modules.ai_engine.engine import get_device
from app.modules.ai_engine.config import CONFIDENCE_THRESHOLD, YOLO_MODEL_PATH


class InferenceEngine:
    def __init__(self):
        self.device = get_device()
        self.detector = YOLODetector(YOLO_MODEL_PATH, self.device)

    def run(self, frame):
        """
        Runs YOLO inference on a single frame.
        Returns structured detection results.
        """
        results = self.detector.infer(frame)
        detections = []

        for r in results:
            if r.boxes is None:
                continue

            for box in r.boxes:
                conf = float(box.conf[0])
                if conf < CONFIDENCE_THRESHOLD:
                    continue

                cls_id = int(box.cls[0])
                cls_name = r.names.get(cls_id, str(cls_id))

                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

                detections.append({
                    "class": cls_name,
                    "confidence": round(conf, 3),
                    "bbox": [x1, y1, x2, y2]
                })

        return detections

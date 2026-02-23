import cv2

class FaceCropper:
    def crop(self, frame, bbox):
        """
        bbox = [x1, y1, x2, y2]
        Returns cropped image or None
        """
        h, w, _ = frame.shape
        x1, y1, x2, y2 = bbox

        # clamp bounds
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(w, x2)
        y2 = min(h, y2)

        if x2 <= x1 or y2 <= y1:
            return None

        crop = frame[y1:y2, x1:x2]
        return crop

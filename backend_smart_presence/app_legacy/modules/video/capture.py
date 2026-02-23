import cv2
import time

class FrameCapture:
    def __init__(self, source, fps=10):
        """
        source:
          - int (camera index)
          - str (video file path)
        """
        self.source = source
        self.fps = fps
        self.cap = None
        self.running = False
        self.frame_interval = 1.0 / fps

    def start(self):
        self.cap = cv2.VideoCapture(self.source)
        if not self.cap.isOpened():
            raise RuntimeError("Video source could not be opened")
        self.running = True

    def stop(self):
        self.running = False
        if self.cap:
            self.cap.release()

    def frames(self):
        """
        Generator that yields frames at controlled FPS.
        """
        last_time = 0
        while self.running:
            ret, frame = self.cap.read()
            if not ret:
                break

            now = time.time()
            if now - last_time >= self.frame_interval:
                last_time = now
                yield frame

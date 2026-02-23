from app.modules.video.capture import FrameCapture

class VideoPipelineController:
    def __init__(self):
        self.capture = None

    def start(self, source, fps=10):
        if self.capture:
            raise RuntimeError("Video pipeline already running")

        self.capture = FrameCapture(source=source, fps=fps)
        self.capture.start()
        return self.capture.frames()

    def stop(self):
        if self.capture:
            self.capture.stop()
            self.capture = None

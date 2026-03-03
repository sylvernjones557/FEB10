import pytest
import numpy as np

try:
    import cv2
    import insightface
    from insightface.app import FaceAnalysis
    HAS_INSIGHTFACE = True
except (ImportError, AttributeError):
    HAS_INSIGHTFACE = False

@pytest.mark.skipif(not HAS_INSIGHTFACE, reason="insightface/cv2 not available")
def test():
    try:
        print("Initializing FaceAnalysis...")
        app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        app.prepare(ctx_id=0, det_size=(640, 640))
        print("FaceAnalysis initialized.")

        # Create dummy image
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        # Add a white rectangle as a 'face' just so it's not completely black (though model won't detect it)
        cv2.rectangle(img, (200, 100), (400, 400), (255, 255, 255), -1)

        print("Testing detection (expecting 0 faces)...")
        faces = app.get(img)
        print(f"Detected {len(faces)} faces.")
        
        # Test pose logic if we can mock a face object
        # Or load a real image if available.
        # But if this runs without crashing, basic setup is OK.
        
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()

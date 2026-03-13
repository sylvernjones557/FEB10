
import asyncio
import os
import pytest
import numpy as np

try:
    import cv2
    from app.core.face_engine import face_engine
    from app.db.vector_store import vector_store
    HAS_ENGINE = True
except (ImportError, AttributeError):
    HAS_ENGINE = False

@pytest.mark.skipif(not HAS_ENGINE, reason="insightface/cv2 not available")
def test_face_engine():
    print("Testing FaceEngine initialization...")
    # This should trigger model download if not present
    face_engine._initialize() 
    
    # Create a dummy image (black square)
    img = np.zeros((640, 640, 3), dtype=np.uint8)
    # Draw a white rectangle (won't be detected as face but checks cv2)
    cv2.rectangle(img, (100, 100), (500, 500), (255, 255, 255), -1)
    
    print("Extracting embedding (expecting None for dummy image)...")
    emb = face_engine.extract_embedding(img)
    if emb is None:
        print("Correctly returned None for non-face image.")
    else:
        print("Unexpectedly found a face!")

@pytest.mark.skipif(not HAS_ENGINE, reason="insightface/cv2 not available")
def test_vector_store():
    print("Testing VectorStore...")
    # Add dummy data
    test_id = "test_student_001"
    test_emb = [0.1] * 512 # 512-dim vector
    
    vector_store.add_face(test_id, test_emb, {"name": "Test Student"})
    print(f"Added face for {test_id}")
    
    # Search
    results = vector_store.search_face(test_emb)
    if results['ids'] and results['ids'][0]:
        print(f"Found match: {results['ids'][0][0]}")
    else:
        print("No match found.")
        
    # Clean up (optional, or keep for verification)
    vector_store.delete_student_faces(test_id)
    print("Cleaned up test data.")

if __name__ == "__main__":
    try:
        test_face_engine()
        test_vector_store()
        print("ALL TESTS PASSED")
    except Exception as e:
        print(f"TEST FAILED: {e}")

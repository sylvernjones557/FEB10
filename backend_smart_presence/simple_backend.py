import cv2
import numpy as np
import uuid
import math
import traceback
import json
import logging
from typing import List, Optional, Dict
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse

import chromadb
from chromadb.config import Settings
from insightface.app import FaceAnalysis

# ==========================================
# 0. LOGGING SUTUP
# ==========================================
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==========================================
# 1. HELPER: NUMPY CLEANER & POSE
# ==========================================

def clean_numpy(obj):
    """
    Recursively convert numpy types to native python types for JSON serialization.
    """
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (bool, np.bool_)):
        return bool(obj)
    elif isinstance(obj, dict):
        return {k: clean_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_numpy(i) for i in obj]
    return obj

def estimate_pose(kps: np.ndarray) -> str:
    # 0: Left Eye, 1: Right Eye, 2: Nose
    eye_center_x = (kps[0][0] + kps[1][0]) / 2
    nose_x = kps[2][0]
    eye_dist = np.linalg.norm(kps[0] - kps[1])
    # Deviation from center (smaller = center)
    deviation = (nose_x - eye_center_x) / (eye_dist + 1e-6)
    
    # Tuned thresholds for better sensitivity
    if deviation > 0.25: return "left"
    elif deviation < -0.25: return "right"
    else: return "center"

def check_image_quality(img: np.ndarray) -> Dict[str, bool]:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    brightness = np.mean(gray)
    is_low_light = bool(brightness < 40)
    
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    is_blurry = bool(laplacian_var < 50)
    
    return {
        "low_light": is_low_light,
        "blurry": is_blurry,
        "score": float(laplacian_var)
    }

# ==========================================
# 2. CORE AI SERVICE
# ==========================================

class AIService:
    def __init__(self):
        # FAST MODEL: buffalo_s (MobileFaceNet - optimized for CPU/Accuracy balance)
        # Slower but more accurage was 'buffalo_l' (ResNet50)
        logger.info("[AI] Loading InsightFace (buffalo_s)...")
        self.app = FaceAnalysis(name="buffalo_s", providers=["CPUExecutionProvider"])
        self.app.prepare(ctx_id=0, det_size=(640, 640))
        logger.info("[AI] InsightFace loaded (FAST mode)")
        
        persist_dir = Path("chroma_store").resolve()
        persist_dir.mkdir(exist_ok=True)
        
        self.client = chromadb.Client(Settings(
            persist_directory=str(persist_dir),
            anonymized_telemetry=False
        ))
        
        # Reset collection on startup to prevent model mismatch if previously using buffalo_l
        # Or check if we should clear it. Assuming existing data might be incompatible.
        # Ideally we'd version it, but simplest is to clear if the model changed.
        # For now, let's allow persistent data but warn user if results are bad.
        # Actually, let's try to query. If dimensions mismatch, it will crash.
        # buffalo_s is 512-d. buffalo_l is 512-d. Dimension is same, but space is diff.
        # We will DELETE the collection on init if it exists to ensure freshness for this demo.
        try:
           self.client.delete_collection("face_embeddings")
           logger.info("[DB] Cleared old embeddings (new session)")
        except:
           pass

        self.collection = self.client.get_or_create_collection(
            name="face_embeddings",
            metadata={"hnsw:space": "cosine"}
        )
        logger.info(f"[DB] ChromaDB connected")

    def process_frame(self, frame: np.ndarray, extract_embedding=False):
        # RESIZE for speed (Max 640px)
        h, w = frame.shape[:2]
        if w > 640:
            scale = 640 / w
            frame = cv2.resize(frame, (0, 0), fx=scale, fy=scale)
        
        quality = check_image_quality(frame)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        faces = self.app.get(rgb)
        
        results = []
        for face in faces:
            pose = estimate_pose(face.kps)
            embedding = None
            if extract_embedding:
                embedding = face.embedding.astype("float32")
                
            bbox = face.bbox.astype(int).tolist()
            age = getattr(face, 'age', None)
            gender = getattr(face, 'sex', None) or getattr(face, 'gender', None)

            results.append({
                "bbox": bbox,
                "pose": pose,
                "det_score": float(face.det_score),
                "embedding": embedding, 
                "age": age,
                "gender": gender
            })
            
        return results, quality

    def register(self, name: str, embedding: np.ndarray):
        unique_id = f"{name}_{uuid.uuid4()}"
        self.collection.add(
            ids=[unique_id],
            embeddings=[embedding.tolist()],
            metadatas=[{"person_id": name}]
        )
        logger.info(f"Registered: {name}")

    def query(self, embedding: np.ndarray, threshold: float = 0.6): # Default cosine: 0.5-0.6 range
        try:
            results = self.collection.query(
                query_embeddings=[embedding.tolist()],
                n_results=1
            )
            if not results.get("ids") or not results["ids"][0]:
                return "Unknown", 0.0
            
            dist = results["distances"][0][0]
            # Chroma returns Cosine Distance (0..2). 
            # 0 = same, 2 = opposite.
            # Similarity = 1 - Distance (approx).
            # Usually strict limit is 0.4 distance (0.6 sim).
            
            sim = 1.0 - dist 
            
            if dist > (1 - threshold): 
                 return "Unknown", sim
                 
            person_id = results["metadatas"][0][0]["person_id"]
            return person_id, sim
            
        except Exception as e:
            logger.error(f"Query Error: {e}")
            return "Error", 0.0

# ==========================================
# 3. FASTAPI WITH WEBSOCKET
# ==========================================

resources = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize AI once
    resources["ai"] = AIService()
    yield
    resources.clear()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def read_image_bytes(data: bytes) -> Optional[np.ndarray]:
    nparr = np.frombuffer(data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


# -----------------------------------------------------
# WEBSOCKET ENDPOINT: STREAMING ANALYSIS
# -----------------------------------------------------
@app.websocket("/ws/face_stream")
async def websocket_face_stream(websocket: WebSocket):
    await websocket.accept()
    ai: AIService = resources["ai"]
    
    try:
        while True:
            # 1. Receive Image Bytes directly
            data = await websocket.receive_bytes()
            
            # 2. Decode
            img = read_image_bytes(data)
            if img is None:
                await websocket.send_json({"error": "Invalid image format"})
                continue

            # 3. Process
            results, quality = ai.process_frame(img, extract_embedding=True)
            
            # 4. Format Response
            final_output = []
            global_warnings = []
            
            if quality["low_light"]: global_warnings.append("Low Light")
            if quality["blurry"]: global_warnings.append("Blurry")

            for face in results:
                face_warnings = []
                if face["det_score"] < 0.6: face_warnings.append("Low Confidence")
                
                # Identify
                name, conf = ai.query(face["embedding"], threshold=0.45) # Use loose threshold
                
                # Clean up for JSON
                del face["embedding"]
                
                final_output.append({
                    "name": name,
                    "confidence": float(conf),
                    "bbox": face["bbox"],
                    "pose": face["pose"],
                    "warnings": face_warnings,
                    "is_spoof": len(face_warnings) > 0 or quality["blurry"]
                })
            
            response = {
                "faces": final_output,
                "global_quality": quality,
                "global_warnings": global_warnings
            }

            # 5. Send
            await websocket.send_json(clean_numpy(response))

    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        traceback.print_exc()
        try:
            await websocket.close()
        except:
            pass


# -----------------------------------------------------
# HTTP ENDPOINT: FINAL REGISTRATION (High Quality)
# -----------------------------------------------------
@app.post("/register_final")
async def register_final(
    name: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Called only once at the end of the liveness flow.
    """
    try:
        ai: AIService = resources["ai"]
        img = read_image_bytes(await file.read())
        
        # We need a clean embedding
        results, _ = ai.process_frame(img, extract_embedding=True)
        if not results:
             raise HTTPException(400, "No face found")
             
        # Pick largest face
        face = max(results, key=lambda x: (x['bbox'][2]-x['bbox'][0]) * (x['bbox'][3]-x['bbox'][1]))
        
        ai.register(name, face["embedding"])
        
        return {"status": "success", "name": name}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, str(e))

@app.get("/")
def index():
    return HTMLResponse(content=open("simple_ui.html", encoding="utf-8").read())

if __name__ == "__main__":
    import uvicorn
    # Workers=1 is crucial for AI models not to reload in parallel processes unnecessarily
    uvicorn.run(app, host="127.0.0.1", port=8000)

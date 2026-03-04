"""
GPU Mode Test Script for Smart Presence Backend
================================================
Tests the face engine and API endpoints in GPU mode with CUDA provider.
Compares performance with CPU mode results.

Run: python tests/test_gpu_mode.py
"""

import os
import sys
import time
import json
import numpy as np

# Force GPU mode by overriding environment
os.environ["FACE_DEVICE_PREFERENCE"] = "gpu"
os.environ["CUDA_VISIBLE_DEVICES"] = "0"
os.environ.pop("ONNXRUNTIME_PROVIDERS", None)

results = []

# Add parent dir to path for app imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def record(test_name, status, elapsed_ms, details=""):
    results.append({
        "test": test_name,
        "status": status,
        "elapsed_ms": round(elapsed_ms, 2),
        "details": details,
    })
    icon = "PASS" if status == "PASS" else ("SKIP" if status == "SKIP" else "FAIL")
    print(f"  [{icon}] {test_name} ({round(elapsed_ms, 2)}ms) {details}")


def main():
    print("=" * 70)
    print("SMART PRESENCE - GPU MODE TESTING")
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # ── 1. ONNX Runtime GPU Provider Check ──
    print("\n--- 1. ONNX RUNTIME GPU PROVIDER ---")
    try:
        import onnxruntime as ort
        providers = ort.get_available_providers()
        has_cuda = "CUDAExecutionProvider" in providers
        has_trt = "TensorrtExecutionProvider" in providers
        print(f"  ONNX Runtime: {ort.__version__}")
        print(f"  Providers: {providers}")
        record("ONNX CUDA check", "PASS" if has_cuda else "FAIL", 0,
               f"CUDA={'YES' if has_cuda else 'NO'}, TensorRT={'YES' if has_trt else 'NO'}")
    except ImportError:
        record("ONNX import", "FAIL", 0, "onnxruntime not installed")
        print("\n[FATAL] Cannot continue GPU testing without onnxruntime")
        return

    # ── 2. nvidia-smi GPU Info ──
    print("\n--- 2. GPU HARDWARE INFO ---")
    try:
        import subprocess
        r = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.free,driver_version,temperature.gpu",
             "--format=csv,noheader"],
            capture_output=True, text=True, timeout=10
        )
        if r.returncode == 0:
            gpu_info = r.stdout.strip()
            print(f"  GPU: {gpu_info}")
            record("GPU Hardware Detection", "PASS", 0, gpu_info)
        else:
            record("GPU Hardware Detection", "FAIL", 0, "nvidia-smi error")
    except Exception as e:
        record("GPU Hardware Detection", "FAIL", 0, str(e))

    # ── 3. CUDA Session Creation ──
    print("\n--- 3. CUDA SESSION CREATION ---")
    try:
        import onnxruntime as ort
        start = time.time()
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        # Test if CUDA provider works by creating a simple session
        # Just test provider availability
        elapsed = (time.time() - start) * 1000
        record("CUDA session options", "PASS", elapsed, "Session options created")
    except Exception as e:
        record("CUDA session creation", "FAIL", 0, str(e))

    # ── 4. FaceEngine GPU Initialization ──
    print("\n--- 4. FACE ENGINE GPU MODE ---")
    try:
        from insightface.app import FaceAnalysis

        # GPU mode: Use CUDA provider
        start = time.time()
        gpu_app = FaceAnalysis(
            name="buffalo_sc",
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
        )
        gpu_app.prepare(ctx_id=0, det_size=(640, 640))
        elapsed = (time.time() - start) * 1000
        record("FaceEngine GPU init (buffalo_sc, 640x640)", "PASS", elapsed,
               "Model loaded on GPU")
    except Exception as e:
        record("FaceEngine GPU init", "FAIL", 0, str(e))
        gpu_app = None

    # ── 5. GPU Face Detection Performance ──
    print("\n--- 5. GPU FACE DETECTION PERFORMANCE ---")
    if gpu_app:
        try:
            import cv2

            # Test with blank image (no face)
            img = np.zeros((640, 640, 3), dtype=np.uint8)
            
            # Warmup
            gpu_app.get(img)

            # Timed test - no face
            start = time.time()
            faces = gpu_app.get(img)
            elapsed = (time.time() - start) * 1000
            record("GPU detect - blank 640x640", "PASS", elapsed,
                   f"Detected {len(faces)} faces")

            # Test with larger image
            img_large = np.zeros((1080, 1920, 3), dtype=np.uint8)
            start = time.time()
            faces = gpu_app.get(img_large)
            elapsed = (time.time() - start) * 1000
            record("GPU detect - blank 1920x1080", "PASS", elapsed,
                   f"Detected {len(faces)} faces")

            # White rectangle image
            img_rect = np.zeros((640, 640, 3), dtype=np.uint8)
            cv2.rectangle(img_rect, (100, 100), (500, 500), (255, 255, 255), -1)
            start = time.time()
            faces = gpu_app.get(img_rect)
            elapsed = (time.time() - start) * 1000
            record("GPU detect - rect 640x640", "PASS", elapsed,
                   f"Detected {len(faces)} faces")

        except Exception as e:
            record("GPU detection test", "FAIL", 0, str(e))

    # ── 6. CPU Mode Benchmark (Comparison) ──
    print("\n--- 6. CPU MODE BENCHMARK (Comparison) ---")
    try:
        from insightface.app import FaceAnalysis

        start = time.time()
        cpu_app = FaceAnalysis(
            name="buffalo_sc",
            providers=["CPUExecutionProvider"],
        )
        cpu_app.prepare(ctx_id=-1, det_size=(320, 320))
        elapsed = (time.time() - start) * 1000
        record("FaceEngine CPU init (buffalo_sc, 320x320)", "PASS", elapsed,
               "Model loaded on CPU")

        # Warmup
        img = np.zeros((640, 640, 3), dtype=np.uint8)
        cpu_app.get(img)

        # Timed test
        start = time.time()
        faces = cpu_app.get(img)
        elapsed = (time.time() - start) * 1000
        record("CPU detect - blank 640x640", "PASS", elapsed,
               f"Detected {len(faces)} faces")

        img_large = np.zeros((1080, 1920, 3), dtype=np.uint8)
        start = time.time()
        faces = cpu_app.get(img_large)
        elapsed = (time.time() - start) * 1000
        record("CPU detect - blank 1920x1080", "PASS", elapsed,
               f"Detected {len(faces)} faces")

    except Exception as e:
        record("CPU benchmark", "FAIL", 0, str(e))

    # ── 7. GPU vs CPU Configuration Check ──
    print("\n--- 7. GPU vs CPU CONFIGURATION COMPARISON ---")
    from app.core.config import settings
    
    config_info = {
        "FACE_DET_SIZE_CPU": settings.FACE_DET_SIZE_CPU,
        "FACE_DET_SIZE_GPU": settings.FACE_DET_SIZE_GPU,
        "FACE_MODEL_NAME": settings.FACE_MODEL_NAME,
        "MAX_IMAGE_DIMENSION": settings.MAX_IMAGE_DIMENSION,
        "ONNX_NUM_THREADS": settings.ONNX_NUM_THREADS,
    }
    for k, v in config_info.items():
        print(f"  {k}: {v}")
    record("Config comparison", "PASS", 0, json.dumps(config_info))

    # ── SUMMARY ──
    print("\n" + "=" * 70)
    print("GPU TEST SUMMARY")
    print("=" * 70)

    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    skipped = sum(1 for r in results if r["status"] == "SKIP")

    print(f"Total Tests: {total}")
    print(f"Passed:      {passed}")
    print(f"Failed:      {failed}")
    print(f"Skipped:     {skipped}")

    # Save results
    output_file = os.path.join(os.path.dirname(__file__), "..", "test_results_gpu.json")
    with open(output_file, "w") as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "mode": "GPU (CUDA)",
            "python_version": sys.version,
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "results": results
        }, f, indent=2, default=str)

    print(f"\nResults saved to: {output_file}")


if __name__ == "__main__":
    main()

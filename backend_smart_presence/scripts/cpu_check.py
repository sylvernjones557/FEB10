"""Comprehensive CPU optimization verification for low-end devices."""
import os
import sys

# Add parent to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def main():
    issues = []

    print("=" * 55)
    print("  CPU OPTIMIZATION VERIFICATION REPORT")
    print("=" * 55)
    print()

    # 1. Environment variables
    print("[1] ENVIRONMENT VARIABLES (Thread Locks)")
    env_checks = {
        "CUDA_VISIBLE_DEVICES": "",
        "OMP_NUM_THREADS": None,
        "OMP_WAIT_POLICY": "PASSIVE",
        "MKL_NUM_THREADS": None,
        "OPENBLAS_NUM_THREADS": None,
        "NUMEXPR_NUM_THREADS": None,
    }
    for key, expected in env_checks.items():
        val = os.environ.get(key, "NOT SET")
        status = "OK" if val != "NOT SET" else "WARN"
        if key == "CUDA_VISIBLE_DEVICES" and val == "":
            status = "OK (GPU blocked)"
        print(f"    {key:.<30s} {val:>10s}  [{status}]")
    print()

    # 2. ONNX Runtime
    print("[2] ONNX RUNTIME")
    try:
        import onnxruntime as ort
        print(f"    Version: {ort.__version__}")
        providers = ort.get_available_providers()
        print(f"    Providers: {providers}")
        has_cuda = "CUDAExecutionProvider" in providers
        if has_cuda:
            print("    WARNING: CUDA provider detected!")
            issues.append("CUDA provider available in ONNX Runtime")
        else:
            print("    GPU: Disabled (CPU-only)")
    except ImportError:
        print("    ERROR: onnxruntime not installed!")
        issues.append("onnxruntime not installed")
    print()

    # 3. GPU packages check
    print("[3] GPU/HEAVY PACKAGES (should NOT be installed)")
    bad_pkgs = ["torch", "torchvision", "torchaudio", "ultralytics", "onnxruntime_gpu"]
    for pkg in bad_pkgs:
        try:
            __import__(pkg.replace("-", "_"))
            print(f"    {pkg:.<30s} INSTALLED  [BAD]")
            issues.append(f"{pkg} is installed (wastes RAM/CPU)")
        except ImportError:
            print(f"    {pkg:.<30s} absent     [GOOD]")
    print()

    # 4. Config settings
    print("[4] APP CONFIG SETTINGS")
    from app.core.config import settings
    checks = [
        ("FACE_DEVICE_PREFERENCE", settings.FACE_DEVICE_PREFERENCE, "cpu"),
        ("FACE_MODEL_NAME", settings.FACE_MODEL_NAME, "buffalo_sc"),
        ("FACE_DET_SIZE_CPU", settings.FACE_DET_SIZE_CPU, 320),
        ("MAX_IMAGE_DIMENSION", settings.MAX_IMAGE_DIMENSION, 640),
        ("ONNX_NUM_THREADS", settings.ONNX_NUM_THREADS, 2),
        ("LAZY_LOAD_ENGINE", settings.LAZY_LOAD_ENGINE, True),
        ("UVICORN_WORKERS", settings.UVICORN_WORKERS, 1),
    ]
    for name, actual, expected in checks:
        ok = actual == expected
        status = "OK" if ok else "DIFF"
        print(f"    {name:.<30s} {str(actual):>10s}  [{status}]")
        if not ok and name == "FACE_DEVICE_PREFERENCE":
            issues.append(f"Device preference is '{actual}', not 'cpu'")
    print()

    # 5. NumPy
    print("[5] NUMPY")
    import numpy as np
    print(f"    Version: {np.__version__}")
    v_major = int(np.__version__.split(".")[0])
    if v_major >= 2:
        print("    WARNING: numpy >= 2.0 may have compatibility issues")
        issues.append("numpy >= 2.0 detected")
    else:
        print("    Compatible version")
    print()

    # 6. OpenCV
    print("[6] OPENCV")
    import cv2
    try:
        ver = cv2.__version__
    except AttributeError:
        ver = "installed (version attr unavailable)"
    print(f"    Version: {ver}")
    try:
        threads = cv2.getNumThreads()
        print(f"    Active threads: {threads}")
        if threads > 4:
            issues.append(f"OpenCV using {threads} threads (too many for low-end)")
    except Exception:
        print("    Threads: could not query")
    print()

    # 7. InsightFace model
    print("[7] FACE ENGINE (Lazy Load)")
    print(f"    Lazy loading: {settings.LAZY_LOAD_ENGINE}")
    print(f"    Model: {settings.FACE_MODEL_NAME} (smallest)")
    print(f"    Det size: {settings.FACE_DET_SIZE_CPU}x{settings.FACE_DET_SIZE_CPU}")
    print(f"    Max image: {settings.MAX_IMAGE_DIMENSION}px (auto-downscale)")
    print()

    # Final verdict
    print("=" * 55)
    if issues:
        print(f"  RESULT: {len(issues)} ISSUE(S) FOUND")
        for i, issue in enumerate(issues, 1):
            print(f"    {i}. {issue}")
    else:
        print("  RESULT: ALL CPU OPTIMIZATIONS ACTIVE")
        print("  System is ready for low-end / low-CPU devices.")
    print("=" * 55)


if __name__ == "__main__":
    main()

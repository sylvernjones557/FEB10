import torch

def get_device():
    """
    Decide where AI models should run.
    CPU by default, GPU if available.
    """
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"

import uuid
import numpy as np
from typing import Optional, Tuple
from .face_store import FaceStore


class FaceMatcher:
    """
    Handles face embedding similarity search (NO threshold logic here)
    """

    def __init__(self, face_store: FaceStore):
        self.collection = face_store.collection

    def add_identity(self, person_id: str, embedding: np.ndarray) -> None:
        """
        Store a new identity embedding
        """

        unique_id = f"{person_id}_{uuid.uuid4()}"

        self.collection.add(
            ids=[unique_id],
            embeddings=[embedding.tolist()],
            metadatas=[{"person_id": person_id}]
        )

    def query(
        self,
        embedding: np.ndarray,
        top_k: int = 1
    ) -> Tuple[Optional[str], Optional[float]]:
        """
        Query closest identity

        Returns:
            (person_id, similarity) or (None, None)
        """

        results = self.collection.query(
            query_embeddings=[embedding.tolist()],
            n_results=top_k
        )

        if not results.get("ids") or not results["ids"][0]:
            return None, None

        person_id = results["metadatas"][0][0]["person_id"]
        distance = results["distances"][0][0]

        similarity = 1.0 - float(distance)

        return person_id, similarity

import uuid
import numpy as np
from numpy.linalg import norm


class IdentityManager:
    def __init__(self, matcher, match_threshold=0.75, local_threshold=0.95):
        self.matcher = matcher
        self.match_threshold = match_threshold
        self.local_threshold = local_threshold

        # person_id -> embedding
        self.id_map = {}

        # unique identities in this session
        self.identities = set()

    def _new_person_id(self) -> str:
        return f"person_{uuid.uuid4().hex[:8]}"

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        return float(np.dot(a, b) / (norm(a) * norm(b)))

    def recognize(self, embedding: np.ndarray):
        """
        Returns:
        {
            'person_id': str,
            'similarity': float | None,
            'is_new': bool
        }
        """

        # -------------------------------------------------
        # 1️⃣ SESSION-LEVEL DEDUPLICATION (CRITICAL)
        # -------------------------------------------------
        for pid, stored_emb in self.id_map.items():
            sim = self._cosine_similarity(embedding, stored_emb)
            if sim >= self.local_threshold:
                self.id_map[pid] = embedding
                self.identities.add(pid)
                return {
                    "person_id": pid,
                    "similarity": sim,
                    "is_new": False
                }

        # -------------------------------------------------
        # 2️⃣ GLOBAL MATCHER CHECK
        # -------------------------------------------------
        pid, similarity = self.matcher.query(embedding)

        if pid is not None and similarity >= self.match_threshold:
            self.id_map[pid] = embedding
            self.identities.add(pid)
            return {
                "person_id": pid,
                "similarity": float(similarity),
                "is_new": False
            }

        # -------------------------------------------------
        # 3️⃣ NEW IDENTITY
        # -------------------------------------------------
        new_pid = self._new_person_id()
        self.id_map[new_pid] = embedding
        self.identities.add(new_pid)

        self.matcher.add_identity(new_pid, embedding)

        return {
            "person_id": new_pid,
            "similarity": None,
            "is_new": True
        }

    def get_identity_count(self) -> int:
        return len(self.identities)

import chromadb
from chromadb.config import Settings
from pathlib import Path
from typing import List, Optional


class FaceStore:
    """
    Persistent vector database for face embeddings
    (ChromaDB-backed)
    """

    def __init__(self):
        # Project root = folder that contains "app/"
        project_root = Path(__file__).resolve().parents[3]

        persist_dir = project_root / "chroma_store"
        persist_dir.mkdir(exist_ok=True)

        self.client = chromadb.Client(
            Settings(
                persist_directory=str(persist_dir),
                anonymized_telemetry=False
            )
        )

        self.collection = self.client.get_or_create_collection(
            name="face_embeddings",
            metadata={"hnsw:space": "cosine"}
        )

    # -------------------------------------------------
    # WRITE OPERATIONS
    # -------------------------------------------------
    def add_identity(self, person_id: str, embedding: List[float]):
        """
        Add or update a face embedding for a person.
        """

        self.collection.upsert(
            ids=[person_id],
            embeddings=[embedding],
            metadatas=[{"person_id": person_id}]
        )

    # -------------------------------------------------
    # READ OPERATIONS
    # -------------------------------------------------
    def get_embedding(self, person_id: str) -> Optional[List[float]]:
        """
        Fetch embedding for a person_id (if exists)
        """

        result = self.collection.get(
            ids=[person_id],
            include=["embeddings"]
        )

        if not result or not result.get("embeddings"):
            return None

        return result["embeddings"][0]

    def get_all_embeddings(self):
        """
        Fetch all stored embeddings.
        Used by IdentityManager.
        """

        return self.collection.get(
            include=["embeddings", "metadatas", "ids"]
        )

    def persist(self):
        # New ChromaDB versions auto-persist
        pass


# -------------------------------------------------
# SHARED FACE STORE (SINGLETON)
# -------------------------------------------------
_face_store_instance = None


def get_face_store() -> FaceStore:
    global _face_store_instance
    if _face_store_instance is None:
        _face_store_instance = FaceStore()
    return _face_store_instance

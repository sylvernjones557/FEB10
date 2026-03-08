
import chromadb
from chromadb.config import Settings
import uuid

from app.core.config import settings

class VectorStore:
    def __init__(self):
        # Initialize persistent client (Local ChromaDB)
        # Embeddings are stored locally in 'chroma_store' for privacy and speed.
        # User metadata links to the local SQLite database.
        self.client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)
        
        # Get or create collection for student faces
        # Using l2 (Euclidean) distance or cosine? InsightFace embeddings are normalized, 
        # so cosine distance is appropriate. Chroma defaults to l2, let's use cosine.
        self.collection = self.client.get_or_create_collection(
            name="student_faces",
            metadata={"hnsw:space": "cosine"}
        )

    def add_face(self, student_id: str, embedding: list, metadata: dict = None):
        """
        Add a face embedding to the vector store.
        """
        if not metadata:
            metadata = {}
        
        # Ensure student_id is in metadata
        metadata["student_id"] = student_id
        
        self.collection.add(
            ids=[str(uuid.uuid4())], # Unique ID for this specific face entry
            embeddings=[embedding],
            metadatas=[metadata]
        )

    def search_face(self, embedding: list, n_results: int = 1):
        """
        Search for the closest matching face.
        """
        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=n_results
        )
        return results

    def delete_student_faces(self, student_id: str):
        """
        Delete all face entries for a specific student.
        """
        self.collection.delete(
            where={"student_id": student_id}
        )

    def clear_all(self):
        """Delete ALL face embeddings from the collection and recreate it."""
        self.client.delete_collection("student_faces")
        self.collection = self.client.get_or_create_collection(
            name="student_faces",
            metadata={"hnsw:space": "cosine"}
        )

    def get_count(self) -> int:
        """Return the total number of face embeddings stored."""
        return self.collection.count()

vector_store = VectorStore()

import json
from app.core.redis_client import redis_client

class RedisSessionStore:
    @staticmethod
    def create_session(session_id, data):
        redis_client.set(f"session:{session_id}", json.dumps(data))

    @staticmethod
    def get_session(session_id):
        data = redis_client.get(f"session:{session_id}")
        return json.loads(data) if data else None

    @staticmethod
    def update_session(session_id, data):
        redis_client.set(f"session:{session_id}", json.dumps(data))

    @staticmethod
    def delete_session(session_id):
        redis_client.delete(f"session:{session_id}")

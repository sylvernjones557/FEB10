import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.db.session import SessionLocal

def check_connection():
    try:
        db = SessionLocal()
        # Try a simple query
        db.execute(text("SELECT 1"))
        print("SUCCESS: Connected to the database successfully.")
        return True
    except Exception as e:
        print(f"FAILURE: Could not connect to the database.\nError: {e}")
        return False
    finally:
        try:
            db.close()
        except:
            pass

if __name__ == "__main__":
    if check_connection():
        sys.exit(0)
    else:
        sys.exit(1)

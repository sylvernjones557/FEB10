import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import MetaData, create_engine, text
from app.core.config import settings
from app.db.base import Base

def reset_schema():
    print("Connecting to database...")
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"sslmode": "require"},
    )
    
    print("Dropping all existing tables (CASCADE)...")
    with engine.connect() as connection:
        connection.execute(text("DROP TABLE IF EXISTS timetable CASCADE;"))
        connection.execute(text("DROP TABLE IF EXISTS students CASCADE;"))
        connection.execute(text("DROP TABLE IF EXISTS staff CASCADE;"))
        connection.execute(text("DROP TABLE IF EXISTS groups CASCADE;"))
        connection.execute(text("DROP TABLE IF EXISTS organizations CASCADE;"))
        connection.commit()
    
    print("Creating new tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Database schema reset complete.")

if __name__ == "__main__":
    reset_schema()

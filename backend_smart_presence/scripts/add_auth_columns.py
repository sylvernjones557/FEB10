"""Add auth columns to staff table and verify."""
from sqlalchemy import create_engine, text

DB_URL = "postgresql://postgres:OCT%40142310_jones@db.gnvarelitiufeevowaru.supabase.co:5432/postgres"
engine = create_engine(DB_URL, connect_args={"sslmode": "require"})

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE staff ADD COLUMN IF NOT EXISTS hashed_password text"))
    conn.execute(text("ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_superuser boolean DEFAULT false"))
    conn.commit()
    
    result = conn.execute(text(
        "SELECT column_name, data_type FROM information_schema.columns "
        "WHERE table_name = 'staff' ORDER BY ordinal_position"
    ))
    print("Staff table columns:")
    for row in result:
        print(f"  {row[0]}: {row[1]}")
    print("\nAuth columns added successfully.")

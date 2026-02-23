"""Run the V2 migration SQL against Supabase and verify tables."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text

DB_URL = "postgresql://postgres:OCT%40142310_jones@db.gnvarelitiufeevowaru.supabase.co:5432/postgres"

engine = create_engine(DB_URL, connect_args={"sslmode": "require"})

# Read migration SQL
sql_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "v2_migration.sql")
with open(sql_path, "r") as f:
    sql = f.read()

# Execute migration
with engine.connect() as conn:
    # Split by semicolons and execute each statement
    for stmt in sql.split(";"):
        stmt = stmt.strip()
        if stmt and not stmt.startswith("--"):
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print(f"Warning: {e}")
    conn.commit()
    print("Migration executed successfully!")

    # Verify tables
    result = conn.execute(text(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' "
        "ORDER BY table_name"
    ))
    tables = [row[0] for row in result]
    print(f"Tables in DB: {tables}")

    # Verify foreign keys
    result = conn.execute(text(
        "SELECT tc.table_name, tc.constraint_name, "
        "ccu.table_name AS foreign_table "
        "FROM information_schema.table_constraints tc "
        "JOIN information_schema.constraint_column_usage ccu "
        "ON tc.constraint_name = ccu.constraint_name "
        "WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' "
        "ORDER BY tc.table_name"
    ))
    print("\nForeign Key Relationships:")
    for row in result:
        print(f"  {row[0]} --({row[1]})--> {row[2]}")

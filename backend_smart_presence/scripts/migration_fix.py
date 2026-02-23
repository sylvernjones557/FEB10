"""Fix remaining migration items."""
import psycopg2, os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
conn.autocommit = True
cur = conn.cursor()

sqls = [
    "ALTER TABLE staff ADD COLUMN IF NOT EXISTS type VARCHAR DEFAULT 'SUBJECT_TEACHER'",
    "ALTER TABLE staff ADD COLUMN IF NOT EXISTS full_name VARCHAR",
    "UPDATE staff SET full_name = name WHERE full_name IS NULL",
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS face_data_registered BOOLEAN DEFAULT FALSE",
    """CREATE TABLE IF NOT EXISTS attendance_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        created_by UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
        status VARCHAR NOT NULL DEFAULT 'SCANNING',
        started_at TIMESTAMPTZ DEFAULT now(),
        ended_at TIMESTAMPTZ,
        CONSTRAINT chk_session_status CHECK (status IN ('SCANNING', 'VERIFYING', 'COMPLETED'))
    )""",
    """CREATE TABLE IF NOT EXISTS attendance_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        status VARCHAR NOT NULL DEFAULT 'PRESENT',
        method VARCHAR NOT NULL DEFAULT 'FACE',
        marked_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT chk_record_status CHECK (status IN ('PRESENT', 'ABSENT')),
        CONSTRAINT chk_record_method CHECK (method IN ('FACE', 'MANUAL'))
    )"""
]
for i, s in enumerate(sqls):
    try:
        cur.execute(s)
        print(f'[{i+1}] OK')
    except Exception as e:
        print(f'[{i+1}] {e}')
        conn.rollback()
        conn.autocommit = True

# Verify
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1")
print(f"\nTables: {[r[0] for r in cur.fetchall()]}")

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='staff' ORDER BY ordinal_position")
print(f"Staff columns: {[r[0] for r in cur.fetchall()]}")

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='students' ORDER BY ordinal_position")
print(f"Student columns: {[r[0] for r in cur.fetchall()]}")

cur.close()
conn.close()
print("Done!")

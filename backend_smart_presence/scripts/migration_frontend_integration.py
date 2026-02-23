"""
Migration: Add frontend-required columns to staff/students and create attendance tables.
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
DATABASE_URL = os.getenv("DATABASE_URL")

MIGRATION_SQL = """
-- ══════════════════════════════════════════════════════════════
-- 1. Add missing columns to STAFF
-- ══════════════════════════════════════════════════════════════
ALTER TABLE staff ADD COLUMN IF NOT EXISTS type VARCHAR DEFAULT 'SUBJECT_TEACHER';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS primary_subject VARCHAR;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS assigned_class_id UUID REFERENCES groups(id) ON DELETE SET NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS avatar_url VARCHAR;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS full_name VARCHAR;

-- Populate full_name from name for existing rows
UPDATE staff SET full_name = name WHERE full_name IS NULL;

-- ══════════════════════════════════════════════════════════════
-- 2. Add missing columns to STUDENTS
-- ══════════════════════════════════════════════════════════════
ALTER TABLE students ADD COLUMN IF NOT EXISTS face_data_registered BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_url VARCHAR;
ALTER TABLE students ADD COLUMN IF NOT EXISTS external_id VARCHAR;

-- ══════════════════════════════════════════════════════════════
-- 3. Create ATTENDANCE_SESSIONS table
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    status VARCHAR NOT NULL DEFAULT 'SCANNING',
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    CONSTRAINT chk_session_status CHECK (status IN ('SCANNING', 'VERIFYING', 'COMPLETED'))
);

-- ══════════════════════════════════════════════════════════════
-- 4. Create ATTENDANCE_RECORDS table
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status VARCHAR NOT NULL DEFAULT 'PRESENT',
    method VARCHAR NOT NULL DEFAULT 'FACE',
    marked_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT chk_record_status CHECK (status IN ('PRESENT', 'ABSENT')),
    CONSTRAINT chk_record_method CHECK (method IN ('FACE', 'MANUAL'))
);
"""

def run():
    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # Execute each statement separately to handle IF NOT EXISTS gracefully
    statements = [s.strip() for s in MIGRATION_SQL.split(';') if s.strip() and not s.strip().startswith('--')]
    for i, stmt in enumerate(statements, 1):
        try:
            cur.execute(stmt)
            print(f"  [{i}/{len(statements)}] OK")
        except Exception as e:
            # Skip "column already exists" errors
            if 'already exists' in str(e) or 'duplicate' in str(e).lower():
                print(f"  [{i}/{len(statements)}] SKIPPED (already exists)")
                conn.rollback()
                conn.autocommit = True
            else:
                print(f"  [{i}/{len(statements)}] ERROR: {e}")
                conn.rollback()
                conn.autocommit = True

    # Verify
    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    tables = [r[0] for r in cur.fetchall()]
    print(f"\nAll tables: {tables}")

    # Verify staff columns
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'staff' ORDER BY ordinal_position
    """)
    cols = [r[0] for r in cur.fetchall()]
    print(f"Staff columns: {cols}")

    # Verify student columns
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'students' ORDER BY ordinal_position
    """)
    cols = [r[0] for r in cur.fetchall()]
    print(f"Student columns: {cols}")

    cur.close()
    conn.close()
    print("\nMigration complete!")

if __name__ == "__main__":
    run()

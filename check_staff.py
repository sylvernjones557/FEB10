import sqlite3
import os

db_path = r"e:\FEB10\backend_smart_presence\db\sqlite\smart_presence.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT staff_code, name, role, is_active FROM staff")
    rows = cursor.fetchall()
    print("Staff in DB:")
    for row in rows:
        print(row)
    conn.close()
else:
    print(f"DB not found at {db_path}")

from app.db.session import SessionLocal
from app.models.staff import Staff

db = SessionLocal()
try:
    users = db.query(Staff).all()
    print("--- User List ---")
    for u in users:
        print(f"Code: {u.staff_code} | Role: {u.role} | Active: {u.is_active}")
finally:
    db.close()

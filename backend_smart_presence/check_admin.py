from app.db.session import SessionLocal
from app.models.staff import Staff
from app.core import security

db = SessionLocal()
admin = db.query(Staff).filter(Staff.staff_code == "admin").first()
if admin:
    print(f"Admin found: {admin.staff_code}")
    is_correct = security.verify_password("admin", admin.hashed_password)
    print(f"Is password 'admin' correct? {is_correct}")
else:
    print("Admin NOT found!")

db.close()

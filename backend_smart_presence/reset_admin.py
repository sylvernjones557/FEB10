from app.db.session import SessionLocal
from app.models.staff import Staff
from app.core import security

db = SessionLocal()
admin = db.query(Staff).filter(Staff.staff_code == "admin").first()
if admin:
    print(f"Updating password for {admin.staff_code} to 'admin'...")
    admin.hashed_password = security.get_password_hash("admin")
    db.commit()
    print("Password updated successfully!")
else:
    print("Admin NOT found!")

db.close()

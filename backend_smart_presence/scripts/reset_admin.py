import sys
import os

# Add parent directory to path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from uuid import uuid4
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash


def reset_admin():
    db = SessionLocal()

    user = db.query(User).filter(User.staff_code == "admin").first()
    if user:
        print(f"Found admin user: {user.staff_code}")
        new_hash = get_password_hash("admin")
        user.hashed_password = new_hash
        user.is_superuser = True
        user.role = "ADMIN"
        user.is_active = True
        db.commit()
        print("Admin password reset to 'admin'.")
    else:
        print("Admin user not found. Creating...")
        admin_user = User(
            user_id=uuid4(),
            staff_code="admin",
            full_name="System Administrator",
            email="admin@smartpresence.edu",
            hashed_password=get_password_hash("admin"),
            is_superuser=True,
            is_active=True,
            role="ADMIN",
        )
        db.add(admin_user)
        db.commit()
        print("Admin user created with password 'admin'.")

    db.close()


if __name__ == "__main__":
    reset_admin()

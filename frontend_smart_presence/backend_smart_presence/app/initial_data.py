
from app.db.session import SessionLocal
from app.core import security
from app.models.staff import Staff
from app.models.organization import Organization


def init():
    db = SessionLocal()

    # Ensure default organization exists
    org = db.query(Organization).first()
    if not org:
        print("No organization found. Please seed data first.")
        db.close()
        return

    # Create admin staff if not exists
    admin = db.query(Staff).filter(Staff.staff_code == "admin").first()
    if not admin:
        admin_in = Staff(
            organization_id=org.id,
            staff_code="admin",
            name="Administrator",
            email="admin@smartpresence.edu",
            hashed_password=security.get_password_hash("password"),
            role="ADMIN",
            is_superuser=True,
            is_active=True,
        )
        db.add(admin_in)
        db.commit()
        print("Superuser created")
    else:
        print("Superuser already exists")
    db.close()


if __name__ == "__main__":
    init()

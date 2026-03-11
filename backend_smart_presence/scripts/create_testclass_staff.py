import os

from dotenv import load_dotenv

from app.db.session import SessionLocal
from app.models.organization import Organization
from app.models.group import Group
from app.models.staff import Staff
from app.core import security


def main() -> None:
    # Ensure .env is loaded (if present)
    load_dotenv()

    db = SessionLocal()
    try:
        org = db.query(Organization).first()
        if not org:
            print("No organization found in database; run the backend once to seed initial data.")
            return

        # Ensure Test Class group exists
        test_group = (
            db.query(Group)
            .filter(
                Group.organization_id == org.id,
                (Group.name.ilike("%Test Class%")) | (Group.code.ilike("TEST")),
            )
            .first()
        )
        if not test_group:
            test_group = Group(
                organization_id=org.id,
                name="Test Class",
                code="TEST",
                is_active=True,
            )
            db.add(test_group)
            db.flush()
            print(f"Created Test Class group with id={test_group.id}")

        # Create or update the testclass staff user
        staff = db.query(Staff).filter(Staff.staff_code == "testclass").first()
        if staff:
            staff.hashed_password = security.get_password_hash("testclass")
            staff.assigned_class_id = test_group.id
            staff.is_active = True
            staff.role = staff.role or "STAFF"
            staff.type = staff.type or "CLASS_TEACHER"
            if not staff.name:
                staff.name = "Test Class Teacher"
            if not staff.full_name:
                staff.full_name = "Test Class Teacher"
            print("Updated existing 'testclass' staff account.")
        else:
            staff = Staff(
                organization_id=org.id,
                name="Test Class Teacher",
                full_name="Test Class Teacher",
                email="testclass@school.edu",
                staff_code="testclass",
                role="STAFF",
                type="CLASS_TEACHER",
                assigned_class_id=test_group.id,
                is_active=True,
                is_superuser=False,
                hashed_password=security.get_password_hash("testclass"),
            )
            db.add(staff)
            print("Created new 'testclass' staff account.")

        db.commit()
        print("✅ Credentials ready: username=testclass password=testclass")
    finally:
        db.close()


if __name__ == "__main__":
    main()



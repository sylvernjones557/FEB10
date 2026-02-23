import sys
import os

# Add parent directory to path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from uuid import uuid4
from app.core import security
from app.db.session import SessionLocal
from app.models.user import User as UserModel
from app.models.organization import Organization
from app.models.group import Group
from app.models.member import Member


def seed(db):
    print("Checking for existing users...")

    # 1. Admin
    admin = db.query(UserModel).filter(UserModel.staff_code == "admin").first()
    if not admin:
        print(" > Creating Admin User (admin / admin)")
        u = UserModel(
            user_id=uuid4(),
            staff_code="admin",
            full_name="System Admin",
            email="admin@smartpresence.edu",
            hashed_password=security.get_password_hash("admin"),
            is_superuser=True,
            is_active=True,
            role="ADMIN",
        )
        db.add(u)
    else:
        print(" > Admin user exists")

    # 2. Staff
    staff = db.query(UserModel).filter(UserModel.staff_code == "stf-1").first()
    if not staff:
        print(" > Creating Staff User (stf-1 / password123)")
        u = UserModel(
            user_id=uuid4(),
            staff_code="stf-1",
            full_name="Staff Demo",
            email="staff@smartpresence.edu",
            hashed_password=security.get_password_hash("password123"),
            is_superuser=False,
            is_active=True,
            role="STAFF",
        )
        db.add(u)
    else:
        print(" > Staff user exists")

    # 3. Default Organization
    org = db.query(Organization).filter(Organization.id == "org-1").first()
    if not org:
        print(" > Creating Default Organization (org-1)")
        org = Organization(id="org-1", name="Default Organization")
        db.add(org)

    # 4. Default Group
    grp = db.query(Group).filter(Group.id == "g1").first()
    if not grp:
        print(" > Creating Group g1")
        grp = Group(id="g1", organization_id="org-1", name="Class A", code="A")
        db.add(grp)

    # 5. Members
    for i in range(1, 4):
        mid = f"m-{i}"
        m = db.query(Member).filter(Member.id == mid).first()
        if not m:
            print(f" > Creating Member {mid}")
            mem = Member(
                id=mid,
                organization_id="org-1",
                group_id="g1",
                name=f"Member {i}",
                role="MEMBER",
                external_id=f"R00{i}",
                face_data_registered=False,
            )
            db.add(mem)

    db.commit()
    print("Seeding Complete (V2).")


if __name__ == "__main__":
    db = SessionLocal()
    seed(db)
    db.close()

"""Check staff credentials and face registration status"""
from app.db.session import SessionLocal
from app.models.staff import Staff
from app.models.student import Student

db = SessionLocal()

# Check staff with credentials
staff_list = db.query(Staff).filter(Staff.hashed_password.isnot(None)).all()
print(f"\n=== STAFF WITH LOGIN CREDENTIALS ===")
print(f"Total staff with credentials: {len(staff_list)}")
for s in staff_list[:5]:
    print(f"  ✓ {s.staff_code}: {s.name} ({s.role}) - Active: {s.is_active}")

# Check students with face data
students_with_faces = db.query(Student).filter(Student.face_data_registered == True).all()
print(f"\n=== STUDENTS WITH FACE DATA ===")
print(f"Total students with face registered: {len(students_with_faces)}")
for s in students_with_faces[:5]:
    print(f"  ✓ {s.roll_no or s.external_id}: {s.name}")

# Total students
total_students = db.query(Student).count()
print(f"\n=== OVERALL STATS ===")
print(f"Total students: {total_students}")
print(f"Students with face data: {len(students_with_faces)} ({len(students_with_faces)/max(total_students, 1)*100:.1f}%)")

db.close()
print("\n✅ Database check complete!\n")

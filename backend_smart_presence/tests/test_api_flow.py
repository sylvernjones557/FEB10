import httpx
import json
import sys
sys.path.insert(0, '.')

BASE = 'http://127.0.0.1:8000/api/v1'
results = []


def test(name, method, url, expected_status=None, json_body=None, headers=None, form_data=None):
    try:
        with httpx.Client(timeout=15) as c:
            if method == 'GET':
                r = c.get(url, headers=headers)
            elif method == 'POST':
                if form_data:
                    r = c.post(url, data=form_data, headers=headers)
                elif json_body:
                    r = c.post(url, json=json_body, headers=headers)
                else:
                    r = c.post(url, headers=headers)
            elif method == 'PATCH':
                r = c.patch(url, json=json_body, headers=headers)
            elif method == 'DELETE':
                r = c.delete(url, headers=headers)

        status_ok = True
        if expected_status and r.status_code != expected_status:
            status_ok = False

        icon = 'PASS' if status_ok else 'FAIL'
        try:
            body = r.json()
        except Exception:
            body = r.text[:200]
        results.append((icon, name, r.status_code, body))
        print(f'  [{icon}] {name} -> {r.status_code}')
        return r
    except Exception as e:
        results.append(('ERR', name, 0, str(e)))
        print(f'  [ERR]  {name} -> {e}')
        return None


# 1. ROOT
print('=== ROOT ===')
test('GET /', 'GET', 'http://127.0.0.1:8000/', 200)

# 2. AUTH - bad creds
print('\n=== AUTH ===')
test('Login bad creds', 'POST', f'{BASE}/login/access-token', 400,
     form_data={'username': 'nonexistent', 'password': 'wrong'})

# 3. SEED ADMIN
print('\n=== SEEDING ADMIN ===')
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from uuid import uuid4

db = SessionLocal()
admin = db.query(User).filter(User.staff_code == 'admin').first()
if not admin:
    admin = User(
        user_id=uuid4(), staff_code='admin', full_name='Administrator',
        email='admin@smartpresence.edu', hashed_password=get_password_hash('admin'),
        is_superuser=True, is_active=True, role='ADMIN',
    )
    db.add(admin)
    db.commit()
    print('  Admin user created')
else:
    admin.hashed_password = get_password_hash('admin')
    admin.is_superuser = True
    admin.is_active = True
    db.commit()
    print('  Admin user exists, password updated')
db.close()

# 4. LOGIN
print('\n=== AUTH (login) ===')
r = test('Login as admin', 'POST', f'{BASE}/login/access-token', 200,
         form_data={'username': 'admin', 'password': 'admin'})

if not r or r.status_code != 200:
    print('FATAL: Cannot login')
    sys.exit(1)

token = r.json()['access_token']
auth = {'Authorization': f'Bearer {token}'}
print(f'  Token: {token[:20]}...')

# 5. USERS
print('\n=== USERS ===')
test('GET /users/me', 'GET', f'{BASE}/users/me', 200, headers=auth)
test('GET /users/', 'GET', f'{BASE}/users/', 200, headers=auth)
test('GET /users/admin', 'GET', f'{BASE}/users/admin', 200, headers=auth)
test('GET /users/nonexistent', 'GET', f'{BASE}/users/nonexistent', 404, headers=auth)
test('POST /users/ (create)', 'POST', f'{BASE}/users/', 200, headers=auth,
     json_body={'staff_code': 'test-stf-1', 'full_name': 'Test Staff', 'email': 'ts@edu.com',
                'password': 'testpass123', 'role': 'STAFF', 'primary_subject': 'Math'})
test('POST /users/ (duplicate)', 'POST', f'{BASE}/users/', 400, headers=auth,
     json_body={'staff_code': 'test-stf-1', 'full_name': 'Test Staff', 'email': 'ts@edu.com', 'password': 'p'})

# 6. GROUPS
print('\n=== GROUPS ===')
test('GET /groups/', 'GET', f'{BASE}/groups/', 200, headers=auth)
test('POST /groups/', 'POST', f'{BASE}/groups/', None, headers=auth,
    json_body={'id': 'g-test-1', 'organization_id': 'org-1', 'name': 'Test Group', 'code': 'TG1'})
test('GET /groups/g-test-1', 'GET', f'{BASE}/groups/g-test-1', 200, headers=auth)
test('PATCH /groups/g-test-1', 'PATCH', f'{BASE}/groups/g-test-1', 200, headers=auth,
    json_body={'name': 'Test Group Updated'})
test('GET /groups/g-test-1/members', 'GET', f'{BASE}/groups/g-test-1/members', 200, headers=auth)

# 7. MEMBERS
print('\n=== MEMBERS ===')
test('GET /members/', 'GET', f'{BASE}/members/', 200, headers=auth)
test('GET /members/?group_id=g-test-1', 'GET', f'{BASE}/members/?group_id=g-test-1', 200, headers=auth)
test('POST /members/', 'POST', f'{BASE}/members/', None, headers=auth,
    json_body={'id': 'm-test-1', 'organization_id': 'org-1', 'name': 'Test Member',
             'role': 'MEMBER', 'group_id': 'g-test-1', 'external_id': 'TR001'})
test('GET /members/m-test-1', 'GET', f'{BASE}/members/m-test-1', 200, headers=auth)
test('GET /members/nonexistent', 'GET', f'{BASE}/members/nonexistent', 404, headers=auth)

# 9. ATTENDANCE
print('\n=== ATTENDANCE ===')
test('GET /attendance/status', 'GET', f'{BASE}/attendance/status', 200, headers=auth)
test('GET /attendance/history', 'GET', f'{BASE}/attendance/history', 200, headers=auth)
test('GET /attendance/sessions', 'GET', f'{BASE}/attendance/sessions', 200, headers=auth)
test('POST /attendance/start', 'POST', f'{BASE}/attendance/start', 200, headers=auth,
    json_body={'group_id': 'g-test-1'})
test('GET /attendance/status (active)', 'GET', f'{BASE}/attendance/status', 200, headers=auth)
test('POST /attendance/stop', 'POST', f'{BASE}/attendance/stop', 200, headers=auth)
test('POST /attendance/verify', 'POST', f'{BASE}/attendance/verify', None, headers=auth,
    json_body={'manual_present': ['m-test-1'], 'manual_absent': []})
test('POST /attendance/finalize', 'POST', f'{BASE}/attendance/finalize', None, headers=auth)
test('GET /attendance/history (after)', 'GET', f'{BASE}/attendance/history', 200, headers=auth)
test('GET /attendance/sessions (after)', 'GET', f'{BASE}/attendance/sessions', 200, headers=auth)
test('GET /attendance/history?member_id=m-test-1', 'GET', f'{BASE}/attendance/history?member_id=m-test-1', 200, headers=auth)

# 10. RECOGNITION (no file = 422, which is correct)
print('\n=== RECOGNITION ===')
test('POST /recognition/register-face (no file)', 'POST', f'{BASE}/recognition/register-face', 422, headers=auth)
test('POST /recognition/recognize (no file)', 'POST', f'{BASE}/recognition/recognize', 422, headers=auth)

# 11. AUTH PROTECTION
print('\n=== AUTH PROTECTION ===')
test('GET /users/ (no auth)', 'GET', f'{BASE}/users/', 401)
test('GET /members/ (no auth)', 'GET', f'{BASE}/members/', 401)
test('GET /groups/ (no auth)', 'GET', f'{BASE}/groups/', 401)

# 12. CLEANUP
print('\n=== CLEANUP ===')
test('DELETE /members/m-test-1', 'DELETE', f'{BASE}/members/m-test-1', 200, headers=auth)

# SUMMARY
print('\n' + '=' * 60)
passed = sum(1 for r in results if r[0] == 'PASS')
failed = sum(1 for r in results if r[0] == 'FAIL')
errors = sum(1 for r in results if r[0] == 'ERR')
total = len(results)
print(f'RESULTS: {passed} passed, {failed} failed, {errors} errors / {total} total')

if failed > 0 or errors > 0:
    print('\nFAILURES:')
    for icon, name, status, body in results:
        if icon != 'PASS':
            print(f'  [{icon}] {name} -> status={status}')
            if isinstance(body, dict):
                print(f'         {json.dumps(body)[:300]}')
            else:
                print(f'         {str(body)[:300]}')

print('\nDone.')

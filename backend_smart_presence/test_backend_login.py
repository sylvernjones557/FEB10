import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def test_login():
    url = "http://127.0.0.1:8000/api/v1/login/access-token"
    # The backend expects OAuth2PasswordRequestForm (form-data)
    data = {
        "username": "admin",
        "password": "admin"
    }
    try:
        print(f"Testing login at {url}...")
        response = requests.post(url, data=data, verify=False, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()

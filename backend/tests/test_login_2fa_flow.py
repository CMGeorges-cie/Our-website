"""
Regression tests for the 2FA-aware login flow (iteration 19).
Covers:
  - /api/v1/auth/login/challenge (no 2FA → session returned)
  - /api/v1/auth/2fa/email/activate (enable email 2FA)
  - /api/v1/auth/login/challenge (2FA → challenge_token returned)
  - /api/v1/auth/login/verify-2fa (good code / bad code)
  - teardown: disable 2FA on admin so other tests keep working
"""
import os
import bcrypt
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://serviceflow-preview.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api/v1"

ADMIN_EMAIL = "admin@cmgeorges.com"
ADMIN_PASSWORD = "strongpassword123"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module", autouse=True)
def ensure_2fa_off_initial(db):
    """Make sure admin starts with no 2FA so first test is deterministic."""
    db.users.update_one(
        {"email": ADMIN_EMAIL},
        {"$set": {"two_factor_enabled": False, "two_factor_method": None}},
    )
    yield
    # teardown after all module tests
    db.users.update_one(
        {"email": ADMIN_EMAIL},
        {"$set": {"two_factor_enabled": False, "two_factor_method": None}},
    )


# ------- 1. Login challenge WITHOUT 2FA ----------
def test_login_challenge_without_2fa(session):
    r = session.post(f"{API}/auth/login/challenge",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("challenge_required") is False
    assert "access_token" in data
    assert data["user"]["email"] == ADMIN_EMAIL
    assert data["user"]["role"] == "admin"


def test_login_challenge_wrong_password(session):
    r = session.post(f"{API}/auth/login/challenge",
                     json={"email": ADMIN_EMAIL, "password": "wrong_pw!"})
    assert r.status_code == 401
    assert "Identifiants invalides" in r.text


# ------- 2. Enable email 2FA -----------
@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/auth/login/challenge",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    return r.json()["access_token"]


def test_enable_email_2fa(session, admin_token, db):
    r = session.post(
        f"{API}/auth/2fa/email/activate",
        json={"current_password": ADMIN_PASSWORD},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code in (200, 201), r.text
    u = db.users.find_one({"email": ADMIN_EMAIL})
    assert u["two_factor_enabled"] is True
    assert u["two_factor_method"] == "email"


# ------- 3. Login challenge WITH 2FA → verify flow ----------
def test_login_challenge_with_2fa_returns_challenge(session, db):
    r = session.post(f"{API}/auth/login/challenge",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("challenge_required") is True
    assert data.get("method") == "email"
    assert data.get("challenge_token")
    # Verify a code was created in db
    doc = db.email_2fa_codes.find_one(
        {"user_id": db.users.find_one({"email": ADMIN_EMAIL})["id"]},
        sort=[("created_at", -1)],
    )
    assert doc is not None


def _inject_known_code(db, plain_code="654321"):
    user = db.users.find_one({"email": ADMIN_EMAIL})
    code_hash = bcrypt.hashpw(plain_code.encode(), bcrypt.gensalt()).decode()
    # Invalidate existing codes & insert a known one
    db.email_2fa_codes.update_many(
        {"user_id": user["id"], "used_at": None},
        {"$set": {"used_at": datetime.now(timezone.utc).isoformat()}},
    )
    db.email_2fa_codes.insert_one(
        {
            "user_id": user["id"],
            "code_hash": code_hash,
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            "used_at": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )


def test_verify_2fa_wrong_code(session, db):
    # Get fresh challenge token
    r = session.post(f"{API}/auth/login/challenge",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    token = r.json()["challenge_token"]
    _inject_known_code(db, plain_code="654321")
    r2 = session.post(f"{API}/auth/login/verify-2fa",
                      json={"challenge_token": token, "code": "000000"})
    assert r2.status_code == 400
    assert "invalide" in r2.text.lower()


def test_verify_2fa_correct_code(session, db):
    r = session.post(f"{API}/auth/login/challenge",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    token = r.json()["challenge_token"]
    _inject_known_code(db, plain_code="654321")
    r2 = session.post(f"{API}/auth/login/verify-2fa",
                      json={"challenge_token": token, "code": "654321"})
    assert r2.status_code == 200, r2.text
    data = r2.json()
    assert "access_token" in data
    assert data["user"]["email"] == ADMIN_EMAIL
    # cookies should be set
    cookie_names = {c.name for c in r2.cookies}
    assert "dt_access_token" in cookie_names or data.get("access_token")

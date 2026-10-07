"""
Mobile PWA regression + Project Photos (R2) endpoint tests.
Covers: iteration 20 request — mobile /m, project photo upload/delete, manifest/sw served.
"""
import os
import io
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
TEST_ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@cmgeorges.com")
TEST_ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "strongpassword123")


# ---------- Auth helpers ----------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/v1/auth/login/challenge",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("access_token")
    if not tok:
        pytest.skip("admin requires 2FA; cannot run authed tests")
    return tok


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- PWA static assets served from frontend origin ----------
class TestPwaAssets:
    def test_manifest_served(self):
        r = requests.get(f"{BASE_URL}/m-manifest.json", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data.get("start_url", "").startswith("/m")
        assert data.get("scope", "").startswith("/m")
        icons = data.get("icons", [])
        assert any("192" in (i.get("src") or "") for i in icons)
        assert any("512" in (i.get("src") or "") for i in icons)

    def test_service_worker_served(self):
        r = requests.get(f"{BASE_URL}/m-sw.js", timeout=10)
        assert r.status_code == 200
        assert "self" in r.text or "sw" in r.text.lower() or len(r.text) > 50

    def test_icons_served(self):
        for p in ["/m-icon-192.png", "/m-icon-512.png"]:
            r = requests.get(f"{BASE_URL}{p}", timeout=10)
            assert r.status_code == 200, f"{p} missing"
            assert r.headers.get("content-type", "").startswith("image/")


# ---------- Regression: public pages NOT redirected ----------
class TestPublicPagesRegression:
    def test_mobilier_public_200(self):
        r = requests.get(f"{BASE_URL}/mobilier", timeout=15, allow_redirects=False)
        # SPA — frontend returns index.html; must not be a redirect to /m/login
        assert r.status_code in (200, 304)
        assert "/m/login" not in (r.headers.get("Location") or "")

    def test_murs_accent_public_200(self):
        r = requests.get(f"{BASE_URL}/murs-accent", timeout=15, allow_redirects=False)
        assert r.status_code in (200, 304)
        assert "/m/login" not in (r.headers.get("Location") or "")


# ---------- Auth: invalid creds ----------
class TestMobileAuthBackend:
    def test_invalid_credentials(self):
        r = requests.post(
            f"{BASE_URL}/api/v1/auth/login/challenge",
            json={"email": TEST_ADMIN_EMAIL, "password": "wrongpass_xyz"},
            timeout=15,
        )
        assert r.status_code in (400, 401)


# ---------- Project Photos (R2) ----------
def _png_bytes(color=(200, 150, 100)):
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color).save(buf, "PNG")
    return buf.getvalue()


class TestProjectPhotos:
    _project_id = None
    _client_id = None

    @pytest.fixture(autouse=True, scope="class")
    def setup_project(self, request, auth_headers):
        # Create a TEST client + project
        c = requests.post(
            f"{BASE_URL}/api/v1/admin/clients",
            headers=auth_headers,
            json={
                "full_name": "TEST_PhotoClient",
                "email": "test_photo@example.com",
                "phone": "5145550199",
            },
            timeout=15,
        )
        assert c.status_code in (200, 201), f"client create failed: {c.status_code} {c.text}"
        client_id = c.json()["id"]

        p = requests.post(
            f"{BASE_URL}/api/v1/admin/projects",
            headers=auth_headers,
            json={
                "client_id": client_id,
                "title": "TEST_PhotoProject",
                "service_type": "manual",
            },
            timeout=15,
        )
        assert p.status_code in (200, 201), f"project create failed: {p.status_code} {p.text}"
        project_id = p.json()["id"]

        request.cls._project_id = project_id
        request.cls._client_id = client_id
        yield
        # Teardown
        requests.delete(f"{BASE_URL}/api/v1/admin/projects/{project_id}", headers=auth_headers, timeout=10)
        requests.delete(f"{BASE_URL}/api/v1/admin/clients/{client_id}", headers=auth_headers, timeout=10)

    def test_upload_photo_unknown_project_returns_404(self, auth_headers):
        files = {"files": ("x.png", _png_bytes(), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/v1/admin/projects/nonexistent-id-zzz/photos",
            headers=auth_headers,
            files=files,
            data={"caption": "TEST"},
            timeout=30,
        )
        assert r.status_code == 404

    def test_upload_requires_auth(self):
        files = {"files": ("x.png", _png_bytes(), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/v1/admin/projects/{self._project_id or 'x'}/photos",
            files=files, data={"caption": "TEST"}, timeout=15,
        )
        assert r.status_code in (401, 403)

    def test_upload_photo_and_delete_full_cycle(self, auth_headers):
        pid = self._project_id
        assert pid, "project setup must run first"
        files = {"files": ("test.png", _png_bytes(), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/v1/admin/projects/{pid}/photos",
            headers=auth_headers,
            files=files,
            data={"caption": "TEST_caption"},
            timeout=60,
        )
        # Accept 503 if R2 not configured in preview, but note it
        if r.status_code == 503:
            pytest.skip(f"R2 not configured in preview: {r.text}")
        assert r.status_code == 200, f"upload failed: {r.status_code} {r.text}"
        data = r.json()
        assert "photos" in data and len(data["photos"]) == 1
        photo = data["photos"][0]
        assert "id" in photo and "url" in photo
        assert photo["caption"] == "TEST_caption"
        assert "uploaded_at" in photo
        photo_id = photo["id"]

        # Verify project GET contains photo + timeline event
        g = requests.get(f"{BASE_URL}/api/v1/admin/projects/{pid}", headers=auth_headers, timeout=15)
        assert g.status_code == 200
        gp = g.json()
        assert any(p.get("id") == photo_id for p in gp.get("photos", []))
        assert any(ev.get("event_type") == "photo" for ev in gp.get("timeline", []))

        # Delete
        d = requests.delete(
            f"{BASE_URL}/api/v1/admin/projects/{pid}/photos/{photo_id}",
            headers=auth_headers, timeout=15,
        )
        assert d.status_code == 200
        assert d.json().get("success") is True

        # 404 on second delete
        d2 = requests.delete(
            f"{BASE_URL}/api/v1/admin/projects/{pid}/photos/{photo_id}",
            headers=auth_headers, timeout=15,
        )
        assert d2.status_code == 404

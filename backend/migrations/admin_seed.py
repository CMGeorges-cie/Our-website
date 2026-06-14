"""
Secure idempotent admin seeding on backend startup.

Rules:
  • Admin is created ONLY if no admin exists yet (first deploy).
  • A cryptographically-random TEMPORARY password is generated and emailed to
    the configured admin email (BRAND.EMAIL). It expires in 48 hours.
  • Admin must change the password on first login (forced by auth flow).
  • After the first admin exists, this migration is a no-op forever.
  • We NEVER overwrite an existing admin password from .env.
"""

import logging
import os
import secrets
import string
import uuid
from datetime import datetime, timezone, timedelta

import bcrypt
import resend

logger = logging.getLogger(__name__)

TEMP_PASSWORD_TTL_HOURS = 48


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _generate_temp_password(length: int = 16) -> str:
    """Strong random temp password — letters + digits + safe symbols."""
    alphabet = string.ascii_letters + string.digits + "!@#$%&*-_=+"
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def _send_admin_welcome_email(email: str, temp_password: str, login_url: str, brand_name: str) -> bool:
    if not resend.api_key:
        logger.warning(f"[admin_seed] RESEND_API_KEY missing — admin created but email NOT sent. temp_password={temp_password!r}")
        return False
    try:
        sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        resend.Emails.send({
            "from": f"{brand_name} <{sender}>",
            "to": [email],
            "subject": f"Compte administrateur {brand_name} — Mot de passe temporaire",
            "html": f"""
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
              <h2 style="color:#1a365d;">Bienvenue {brand_name}</h2>
              <p>Votre compte administrateur vient d'être créé.</p>
              <p><strong>Email :</strong> {email}<br/>
              <strong>Mot de passe temporaire :</strong>
              <code style="background:#f4f4f4;padding:6px 10px;border-radius:4px;font-size:16px;">{temp_password}</code></p>
              <p style="color:#c0392b;"><strong>⚠️ Ce mot de passe expire dans {TEMP_PASSWORD_TTL_HOURS}h.</strong> Vous devez le changer à votre première connexion.</p>
              <p style="text-align:center;margin:24px 0;">
                <a href="{login_url}" style="background:#d4af37;color:#1a365d;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Se connecter</a>
              </p>
              <p style="color:#666;font-size:12px;">Si vous ne reconnaissez pas cette activité, ignorez ce message et contactez le support.</p>
            </div>
            """,
        })
        return True
    except Exception as e:
        logger.error(f"[admin_seed] email send failed: {e}")
        return False


async def _ensure_brand_admin(db, brand_email: str, brand_name: str, frontend_url: str) -> dict:
    """
    Make sure the configured BRAND_EMAIL exists as an active admin user.
    Runs in addition to the first-time admin seed — useful when an existing
    admin (e.g. dev / preview) needs to be supplemented by the production
    brand email account.
    """
    existing = await db.users.find_one({"email": brand_email}, {"_id": 0})
    if existing:
        # Promote to admin if needed (idempotent)
        updates = {}
        if existing.get("role") != "admin":
            updates["role"] = "admin"
        if not existing.get("is_active", True):
            updates["is_active"] = True
        if updates:
            await db.users.update_one({"email": brand_email}, {"$set": updates})
            return {"status": "promoted", "email": brand_email, "updates": updates}
        return {"status": "exists", "email": brand_email}

    # Not in DB yet — create with temp password + email it
    temp_password = os.environ.get("INITIAL_ADMIN_PASSWORD") or _generate_temp_password()
    expires = (datetime.now(timezone.utc) + timedelta(hours=TEMP_PASSWORD_TTL_HOURS)).isoformat()
    admin = {
        "id": str(uuid.uuid4()),
        "email": brand_email,
        "full_name": f"Admin {brand_name}",
        "role": "admin",
        "password_hash": _hash(temp_password),
        "password_is_temporary": True,
        "password_must_change_before": expires,
        "password_changed_at": None,
        "two_factor_enabled": False,
        "two_factor_method": None,
        "is_active": True,
        "created_at": _now_iso(),
    }
    await db.users.insert_one(admin)
    login_url = f"{frontend_url.rstrip('/')}/admin/login"
    email_ok = await _send_admin_welcome_email(brand_email, temp_password, login_url, brand_name)
    logger.warning(
        f"[admin_seed] Brand admin created for {brand_email}. Email sent: {email_ok}. Expires: {expires}."
    )
    if not email_ok and not os.environ.get("INITIAL_ADMIN_PASSWORD"):
        logger.warning(f"[admin_seed] TEMP_PASSWORD={temp_password}")
    return {"status": "created", "email": brand_email, "email_sent": email_ok, "expires": expires}


async def run_admin_seed(db, brand_email: str, brand_name: str, frontend_url: str) -> dict:
    """
    Seed admin user idempotently. Returns a status dict.

    First run (no admin in DB): creates admin with temp password, emails it.
    Subsequent runs: ensure the BRAND_EMAIL admin exists (create or promote).
    """
    existing_admin = await db.users.find_one({"role": "admin"}, {"_id": 0})
    if existing_admin:
        # Even if some admin already exists, guarantee the brand email is also admin.
        brand_result = await _ensure_brand_admin(db, brand_email, brand_name, frontend_url)
        return {"status": "skipped", "reason": "admin_exists", "existing_email": existing_admin.get("email"), "brand_email_status": brand_result}

    # Allow override via env var; otherwise generate strong temp pwd
    temp_password = os.environ.get("INITIAL_ADMIN_PASSWORD") or _generate_temp_password()
    expires = (datetime.now(timezone.utc) + timedelta(hours=TEMP_PASSWORD_TTL_HOURS)).isoformat()

    admin = {
        "id": str(uuid.uuid4()),
        "email": brand_email,
        "full_name": f"Admin {brand_name}",
        "role": "admin",
        "password_hash": _hash(temp_password),
        "password_is_temporary": True,
        "password_must_change_before": expires,
        "password_changed_at": None,
        "two_factor_enabled": False,
        "two_factor_method": None,
        "is_active": True,
        "created_at": _now_iso(),
    }
    await db.users.insert_one(admin)

    # Try to send email; if Resend not configured, the password is logged (server logs only).
    login_url = f"{frontend_url.rstrip('/')}/admin/login"
    email_ok = await _send_admin_welcome_email(brand_email, temp_password, login_url, brand_name)

    logger.warning(
        f"[admin_seed] Admin created for {brand_email}. "
        f"Email sent: {email_ok}. Temporary password expires: {expires}."
    )
    if not email_ok and not os.environ.get("INITIAL_ADMIN_PASSWORD"):
        # Last-resort visibility for ops
        logger.warning(f"[admin_seed] TEMP_PASSWORD={temp_password}")

    return {"status": "created", "email": brand_email, "email_sent": email_ok, "expires": expires}

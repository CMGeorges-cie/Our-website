"""
Single source of truth for all Déco Touché brand information on the backend.

Rule: NEVER hardcode brand-related strings (phone, email, taxes, address...)
in Python files, email templates or PDFs. Always import from this module.

All values default to production but can be overridden via environment
variables (BRAND_*) for staging or multi-tenant deployments.
"""

import os


def _env(key: str, default: str) -> str:
    v = os.environ.get(key)
    return v if v else default


class Brand:
    # Identity
    NAME = _env("BRAND_NAME", "Déco Touché")
    LEGAL_NAME = _env("BRAND_LEGAL_NAME", "Déco Touché")
    TAGLINE = _env(
        "BRAND_TAGLINE",
        "Peinture intérieure et extérieure, rénovation légère et entretien général.",
    )

    # Contact
    EMAIL = _env("BRAND_EMAIL", "cmgeorges.cie@gmail.com")
    PHONE_DISPLAY = _env("BRAND_PHONE", "514-386-1743")
    PHONE_E164 = _env("BRAND_PHONE_E164", "+15143861743")

    # Location
    ADDRESS = _env("BRAND_ADDRESS", "Montréal & Rive-Sud, QC")
    SERVICE_AREA = _env("BRAND_SERVICE_AREA", "Montréal et la Rive-Sud")

    # Taxes
    TAX_GST = _env("BRAND_TAX_GST", "714767027RT0001")
    TAX_QST = _env("BRAND_TAX_QST", "4023795081TQ0001")

    # Public site URL
    SITE_URL = _env(
        "BRAND_SITE_URL",
        os.environ.get("FRONTEND_URL", "https://cmgeorges.ca"),
    )

    @classmethod
    def contact_line(cls) -> str:
        return f"{cls.PHONE_DISPLAY} | {cls.EMAIL}"

    @classmethod
    def header_line(cls) -> str:
        return f"{cls.ADDRESS} | {cls.PHONE_DISPLAY} | {cls.EMAIL}"


brand = Brand()

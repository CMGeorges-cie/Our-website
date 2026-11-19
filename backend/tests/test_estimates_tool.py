"""Tests unitaires de l'outil d'estimations (routers/quotes.py + services/pdf.py).

Aucun serveur ni Mongo requis : le routeur est exercé avec une fausse base
en mémoire. Couvre : heures × taux, matériaux fournisseur/client, prix à
confirmer, % d'achat/admin/magasinage, compatibilité historique et le PDF.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models import QuoteCreate, QuoteLineBase, QuotePhoto, QuoteRoom  # noqa: E402
from routers.quotes import build_quotes_router  # noqa: E402
from services.pdf import generate_quote_pdf  # noqa: E402

PRICING = {
    "taxes": {"tps_rate": 0.05, "tvq_rate": 0.09975},
    "payment_terms": {"deposit": 0.30, "milestone": 0.30, "final": 0.40},
}


class _Collection:
    def __init__(self, docs=None):
        self.docs = docs or []
        self.inserted = []

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if all(d.get(k) == v for k, v in query.items()):
                return d
        return None

    async def insert_one(self, doc):
        self.inserted.append(doc)

    async def update_one(self, query, update):
        return None


class _DB:
    def __init__(self):
        self.leads = _Collection([{"id": "lead-1", "full_name": "Test", "client_id": None}])
        self.quotes = _Collection()
        self.clients = _Collection()


async def _audit(*a, **k):
    return None


class _Req:
    client = None


def _create(payload):
    db = _DB()
    router = build_quotes_router(
        db=db, get_current_user=lambda: {}, create_audit_log=_audit,
        pricing_config=PRICING,
    )
    fn = next(
        r.endpoint for r in router.routes
        if r.path == "/admin/quotes" and "POST" in r.methods
    )
    return asyncio.run(fn(payload, _Req(), user={"id": "t"})), db


def test_estimation_complete():
    payload = QuoteCreate(
        lead_id="lead-1", contingency_percent=0, admin_percent=15,
        lines=[
            QuoteLineBase(description="Mesure", quantity=1, unit_price=49, line_type="labor"),
            QuoteLineBase(description="Pose des lattes", quantity=1, unit_price=75,
                          line_type="labor", hours=6, hourly_rate=75),
            QuoteLineBase(description="Lattes", quantity=8, unit_price=120,
                          line_type="material", source_name="Walldi"),
            QuoteLineBase(description="Panneaux sur mesure", quantity=2, unit_price=0,
                          line_type="material", source_name="Walldi",
                          price_status="a_confirmer"),
            QuoteLineBase(description="TV (client)", quantity=1, unit_price=1299,
                          line_type="material", source_type="client", source_name="Costco"),
        ],
    )
    q, _ = _create(payload)
    assert q.subtotal_labor == 49 + 450
    assert q.subtotal_material == 960
    assert q.admin_amount == 144.0
    assert q.total_hours == 6
    assert q.client_material_total == 1299
    # Le total ne contient ni l'achat du client ni le prix à confirmer.
    assert q.subtotal_before_tax == 499 + 960 + 144


def test_legacy_payload_unchanged():
    payload = QuoteCreate(
        lead_id="lead-1", contingency_percent=15,
        lines=[
            QuoteLineBase(description="Assemblage lit", quantity=2, unit_price=95, line_type="labor"),
            QuoteLineBase(description="Kit ancrage", quantity=1, unit_price=25, line_type="material"),
        ],
    )
    q, _ = _create(payload)
    assert q.admin_amount == 0  # non précisé = 0
    assert q.subtotal_before_tax == 247.25  # (190 + 25) × 1,15


def test_pdf_generation_with_new_fields():
    payload = QuoteCreate(
        lead_id="lead-1", contingency_percent=0, admin_percent=15,
        lines=[
            QuoteLineBase(description="Pose", quantity=1, unit_price=75,
                          line_type="labor", hours=2, hourly_rate=75),
            QuoteLineBase(description="Matériau", quantity=1, unit_price=100,
                          line_type="material", source_name="Renwil"),
        ],
    )
    _, db = _create(payload)
    doc = db.quotes.inserted[0]
    buf = generate_quote_pdf(doc, {"full_name": "Test"}, None)
    assert buf.getvalue().startswith(b"%PDF")
    assert len(buf.getvalue()) > 2000


def _tiny_jpeg_data_uri() -> str:
    import base64
    from io import BytesIO

    from PIL import Image

    buf = BytesIO()
    Image.new("RGB", (320, 240), (40, 40, 40)).save(buf, "JPEG", quality=80)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def _pdf_text(pdf_bytes: bytes) -> str:
    """Texte brut des flux du PDF (ReportLab : ASCII85 puis Flate)."""
    import base64
    import re
    import zlib

    out = []
    for m in re.finditer(rb"stream\r?\n(.*?)endstream", pdf_bytes, re.DOTALL):
        raw = m.group(1).strip()
        try:
            out.append(zlib.decompress(raw).decode("latin-1", "ignore"))
            continue
        except Exception:
            pass
        try:
            if raw.endswith(b"~>"):
                raw = raw[:-2]
            decoded = base64.a85decode(raw, adobe=False)
            out.append(zlib.decompress(decoded).decode("latin-1", "ignore"))
        except Exception:
            continue
    return "\n".join(out)


def test_visual_documentation_roundtrip_and_pdf():
    payload = QuoteCreate(
        lead_id="lead-1", contingency_percent=0,
        lines=[
            QuoteLineBase(description="Pose des lattes", quantity=1, unit_price=75,
                          line_type="labor", hours=6, hourly_rate=75),
        ],
        rooms=[
            QuoteRoom(name="Salon", length_ft=16, width_ft=12, height_ft=8,
                      notes="Mur télé au fond."),
        ],
        photos=[
            QuotePhoto(url=_tiny_jpeg_data_uri(), room_name="Salon",
                       caption="Mur télé actuel", kind="lieux"),
            QuotePhoto(url="/uploads/inexistant-test.jpg", room_name="Salon",
                       caption="Photo illisible (repli texte)", kind="lieux"),
            QuotePhoto(url=_tiny_jpeg_data_uri(),
                       caption="Croquis du mur d'accent", kind="croquis"),
        ],
    )
    q, db = _create(payload)
    # Aller-retour : pièces et photos sont stockées telles quelles.
    assert len(q.rooms) == 1 and q.rooms[0].name == "Salon"
    assert q.rooms[0].length_ft == 16
    assert len(q.photos) == 3
    assert q.photos[2].kind == "croquis"
    doc = db.quotes.inserted[0]
    assert doc["rooms"][0]["width_ft"] == 12
    assert doc["photos"][0]["caption"] == "Mur télé actuel"

    buf = generate_quote_pdf(doc, {"full_name": "Test"}, None)
    pdf = buf.getvalue()
    assert pdf.startswith(b"%PDF")
    text = _pdf_text(pdf)
    assert "DOCUMENTATION VISUELLE" in text
    assert "Salon" in text
    assert "CROQUIS DU PROJET" in text
    # Les images embarquées gardent un PDF raisonnable (< 1 Mo ici).
    assert len(pdf) < 1_000_000


def test_analyze_photos_not_wired():
    """Aucun fournisseur vision n'est branché : la route doit répondre 503
    avec la raison, jamais simuler une analyse."""
    from fastapi import HTTPException

    db = _DB()
    router = build_quotes_router(
        db=db, get_current_user=lambda: {}, create_audit_log=_audit,
        pricing_config=PRICING,
    )
    fn = next(
        r.endpoint for r in router.routes
        if r.path == "/admin/quotes/{quote_id}/analyze-photos" and "POST" in r.methods
    )
    try:
        asyncio.run(fn("quote-1", user={"id": "t"}))
        raise AssertionError("aurait dû lever HTTPException 503")
    except HTTPException as e:
        assert e.status_code == 503
        assert "LLM_API_KEY" in e.detail

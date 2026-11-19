"""PDF generators for quotes and invoices — extracted from server.py.

Side-effect free (no DB, no env vars). Receives all data as dicts and returns
an in-memory PDF (BytesIO). Used by:
  • server.py admin endpoints (legacy CRUD)
  • routers/quotes.py
  • routers/invoices.py
  • routers/public_signature.py (signed quote PDF)
"""
from __future__ import annotations

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    Image as RLImage,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from config.brand import Brand


# ---- Shared style helpers ---------------------------------------------------
def _build_dt_styles():
    """Return the Déco Touché paragraph stylesheet used by all PDFs."""
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="CMGHeader",
            fontSize=24,
            textColor=colors.HexColor("#1a365d"),
            spaceAfter=20,
            fontName="Helvetica-Bold",
        )
    )
    styles.add(
        ParagraphStyle(
            name="CMGSubHeader",
            fontSize=12,
            textColor=colors.HexColor("#666666"),
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CMGTitle",
            fontSize=16,
            textColor=colors.HexColor("#1a365d"),
            spaceAfter=15,
            fontName="Helvetica-Bold",
        )
    )
    styles.add(ParagraphStyle(name="CMGRight", fontSize=10, alignment=TA_RIGHT))
    return styles


def _line_items_table(lines: list[dict]) -> Table:
    """Build the standard 4-column line-items table used by quotes & invoices."""
    table_data = [["Description", "Qté", "Prix unit.", "Total"]]
    for line in lines:
        table_data.append(
            [
                line.get("description", ""),
                str(line.get("quantity", 1)),
                f"{line.get('unit_price', 0):.2f} $",
                f"{line.get('line_total', 0):.2f} $",
            ]
        )
    t = Table(table_data, colWidths=[280, 50, 80, 80])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a365d")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ]
        )
    )
    return t


def _totals_table(rows: list[list[str]]) -> Table:
    t = Table(rows, colWidths=[380, 100])
    t.setStyle(
        TableStyle(
            [
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("TEXTCOLOR", (0, -1), (-1, -1), colors.HexColor("#1a365d")),
                ("FONTSIZE", (0, -1), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#1a365d")),
            ]
        )
    )
    return t


def _info_table(rows: list[list[str]]) -> Table:
    t = Table(rows, colWidths=[100, 200])
    t.setStyle(
        TableStyle(
            [
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#666666")),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return t


def _safe_date(value, length: int = 10) -> str:
    if isinstance(value, str):
        return value[:length]
    return str(value or "")[:length]


# ---- Estimation PDF (noir et or) -------------------------------------------
_DT_BLACK = colors.HexColor("#111111")
_DT_GOLD = colors.HexColor("#C9A227")
_DT_GOLD_LIGHT = colors.HexColor("#F7F0DA")
_DT_GREY = colors.HexColor("#555555")
_DT_LINE = colors.HexColor("#D9D9D9")


def _money(value) -> str:
    try:
        s = f"{float(value):,.2f}".replace(",", " ").replace(".", ",")
        return f"{s} $"
    except (TypeError, ValueError):
        return "0,00 $"


def _qty(value) -> str:
    try:
        return f"{float(value):g}"
    except (TypeError, ValueError):
        return "1"


def _est_section_title(text: str) -> Paragraph:
    styles = getSampleStyleSheet()
    style = ParagraphStyle(
        name=f"EstTitle{text[:6]}",
        fontSize=12.5,
        leading=15,
        textColor=_DT_BLACK,
        fontName="Helvetica-Bold",
        spaceBefore=14,
        spaceAfter=6,
    )
    return Paragraph(f'<font color="#C9A227">■</font> {text}', style)


def _est_table(header: list[str], rows: list[list[str]], col_widths: list[float]) -> Table:
    data = [header] + list(rows)
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), _DT_BLACK),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#E9CE7A")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("GRID", (0, 0), (-1, -1), 0.4, _DT_LINE),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return t


# ---- Documentation visuelle (photos des lieux, mesures, croquis) -----------
def _resolve_image_bytes(url: str):
    """Octets d'une image référencée par une estimation, ou None.

    Gère les formes produites par l'outil : URL http(s) (R2 public),
    chemin local /uploads/<fichier> (repli local du routeur d'upload) et
    data URI. Tout échec retourne None : le PDF affiche alors la légende
    sans l'image, jamais d'exception.
    """
    if not url or not isinstance(url, str):
        return None
    try:
        if url.startswith("data:image"):
            import base64

            return base64.b64decode(url.split(",", 1)[1])
        if url.startswith("/uploads/"):
            import os

            base = os.path.join(
                os.path.dirname(os.path.abspath(__file__)), "..", "uploads"
            )
            path = os.path.normpath(os.path.join(base, os.path.basename(url)))
            with open(path, "rb") as fh:
                return fh.read()
        if url.startswith("http://") or url.startswith("https://"):
            import urllib.request

            req = urllib.request.Request(
                url, headers={"User-Agent": "DecoTouche-PDF/1.0"}
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                return resp.read(12 * 1024 * 1024)
    except Exception:
        return None
    return None


def _pdf_image(url: str, max_w: float = 245.0, max_h: float = 185.0):
    """Image prête pour le PDF : redimensionnée (max 1000 px) et recompressée
    en JPEG qualité 72 pour garder un PDF léger, proportions conservées.
    Retourne None si l'image est introuvable ou illisible."""
    raw = _resolve_image_bytes(url)
    if not raw:
        return None
    try:
        from PIL import Image as PILImage

        im = PILImage.open(BytesIO(raw)).convert("RGB")
        if im.width > 1000:
            im = im.resize((1000, max(1, int(im.height * 1000 / im.width))))
        buf = BytesIO()
        im.save(buf, "JPEG", quality=72, optimize=True)
        buf.seek(0)
        iw, ih = im.size
        scale = min(max_w / iw, max_h / ih, 1.0)
        img = RLImage(buf, width=iw * scale, height=ih * scale)
        img._buf_ref = buf  # garder le tampon vivant jusqu'au build
        return img
    except Exception:
        return None


def _photo_grid(photos: list, caption_style, max_w: float = 245.0, max_h: float = 185.0) -> Table:
    """Grille 2 colonnes : image + légende (pièce ou texte libre)."""
    cells = []
    for p in photos:
        img = _pdf_image(p.get("url", ""), max_w=max_w, max_h=max_h)
        caption = (p.get("caption") or "").strip()
        cell = []
        if img is not None:
            cell.append(img)
        else:
            cell.append(Paragraph("(photo non incluse au PDF)", caption_style))
        if caption:
            cell.append(Paragraph(caption, caption_style))
        cells.append(cell)
    rows = [cells[i : i + 2] for i in range(0, len(cells), 2)]
    if rows and len(rows[-1]) == 1:
        rows[-1].append("")
    t = Table(rows, colWidths=[250, 250])
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return t


def _room_measures_text(room: dict) -> str:
    """« 16 pi × 12 pi × 8 pi de haut — surface au sol ≈ 192 pi² »."""
    length, width, height = room.get("length_ft"), room.get("width_ft"), room.get("height_ft")
    parts = []
    dims = [f"{float(v):g} pi" for v in (length, width) if v]
    if dims:
        parts.append(" × ".join(dims))
    if height:
        parts.append(f"{float(height):g} pi de haut")
    text = " — ".join(parts)
    if length and width:
        area = float(length) * float(width)
        area_txt = f"{area:,.0f}".replace(",", " ")
        text += f" — surface au sol ≈ {area_txt} pi²"
    return text


def _visual_documentation(quote: dict, body_style, small_style) -> list:
    """Section « Documentation visuelle » du PDF : pour chaque pièce, ses
    mesures puis ses photos; photos sans pièce regroupées; croquis du
    projet à la fin. Retourne [] si l'estimation n'a ni pièce ni photo."""
    rooms = quote.get("rooms") or []
    photos = quote.get("photos") or []
    if not rooms and not photos:
        return []

    elements = [_est_section_title("DOCUMENTATION VISUELLE")]
    elements.append(
        Paragraph(
            "Photos des lieux et mesures prises lors de la visite, et croquis "
            "du projet proposé.",
            small_style,
        )
    )
    elements.append(Spacer(1, 4))

    site_photos = [p for p in photos if p.get("kind") != "croquis"]
    sketches = [p for p in photos if p.get("kind") == "croquis"]

    used = set()
    for room in rooms:
        name = (room.get("name") or "").strip()
        elements.append(
            Paragraph(
                f"<b>{name or 'Pièce'}</b>",
                ParagraphStyle(
                    name=f"RoomTitle{name[:8]}", fontSize=10.5, leading=13,
                    fontName="Helvetica-Bold", spaceBefore=8, spaceAfter=2,
                ),
            )
        )
        measures = _room_measures_text(room)
        if measures:
            elements.append(Paragraph(f"Mesures : {measures}", body_style))
        if (room.get("notes") or "").strip():
            elements.append(Paragraph(str(room["notes"]), small_style))
        room_photos = [
            p for p in site_photos
            if (p.get("room_name") or "").strip().lower() == name.lower() and name
        ]
        for p in room_photos:
            used.add(id(p))
        if room_photos:
            elements.append(_photo_grid(room_photos, small_style))

    leftovers = [p for p in site_photos if id(p) not in used]
    if leftovers:
        if rooms:
            elements.append(
                Paragraph(
                    "<b>Autres photos des lieux</b>",
                    ParagraphStyle(
                        name="RoomTitleAutres", fontSize=10.5, leading=13,
                        fontName="Helvetica-Bold", spaceBefore=8, spaceAfter=2,
                    ),
                )
            )
        elements.append(_photo_grid(leftovers, small_style))

    if sketches:
        elements.append(_est_section_title("CROQUIS DU PROJET"))
        for p in sketches:
            img = _pdf_image(p.get("url", ""), max_w=490.0, max_h=320.0)
            if img is not None:
                elements.append(img)
            else:
                elements.append(Paragraph("(croquis non inclus au PDF)", small_style))
            if (p.get("caption") or "").strip():
                elements.append(Paragraph(str(p["caption"]), small_style))
            elements.append(Spacer(1, 6))

    return elements


def generate_quote_pdf(quote: dict, lead: dict, client: dict = None) -> BytesIO:
    """Generate the Déco Touché estimation PDF (noir et or).

    Main-d'œuvre et matériaux toujours séparés. Les achats du client et les
    prix « à confirmer » sont affichés mais jamais inclus dans le total.
    Compatible avec les anciennes soumissions (champs absents = valeurs 0).
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=50,
        leftMargin=50,
        topMargin=42,
        bottomMargin=42,
    )
    styles = getSampleStyleSheet()
    body = ParagraphStyle(name="EstBody", fontSize=10, leading=13.5)
    small = ParagraphStyle(name="EstSmall", fontSize=8.5, leading=11.5, textColor=_DT_GREY)
    elements = []

    # --- Bandeau noir et or ---
    header = Table(
        [
            [
                Paragraph(
                    '<font color="#E9CE7A" size="20"><b>DÉCO TOUCHÉ</b></font>',
                    ParagraphStyle(name="EstBandName", leading=24),
                ),
                Paragraph(
                    '<font color="#FFFFFF" size="9">ESTIMATION</font>',
                    ParagraphStyle(name="EstBandRight", alignment=TA_RIGHT, leading=12),
                ),
            ],
            [
                Paragraph(
                    f'<font color="#FFFFFF" size="8.5">Montréal &amp; Rive-Sud | {Brand.PHONE_DISPLAY} | {Brand.EMAIL}</font>',
                    ParagraphStyle(name="EstBandSub", leading=11),
                ),
                Paragraph(
                    f'<font color="#E9CE7A" size="8.5">Réf. {str(quote.get("id", ""))[:8].upper()}</font>',
                    ParagraphStyle(name="EstBandRef", alignment=TA_RIGHT, leading=11),
                ),
            ],
        ],
        colWidths=[340, 150],
    )
    header.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), _DT_BLACK),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, 0), 10),
                ("BOTTOMPADDING", (0, -1), (-1, -1), 10),
                ("LINEBELOW", (0, -1), (-1, -1), 2.5, _DT_GOLD),
            ]
        )
    )
    elements.append(header)
    elements.append(Spacer(1, 14))

    # --- Infos + client ---
    elements.append(
        _info_table(
            [
                ["Date :", _safe_date(quote.get("created_at", ""))],
                ["Valide jusqu'au :", _safe_date(quote.get("valid_until", ""))],
            ]
        )
    )
    client_name = (client or {}).get("full_name") or lead.get("full_name", "N/A")
    client_email = (client or {}).get("email") or lead.get("email", "")
    client_phone = (client or {}).get("phone") or lead.get("phone", "")
    client_address = (client or {}).get("address") or lead.get("address", "")
    if lead.get("city"):
        client_address = f"{client_address}, {lead['city']}".strip(", ")
    client_lines = [f"<b>{client_name}</b>"]
    for v in (client_email, client_phone, client_address):
        if v:
            client_lines.append(str(v))
    elements.append(_est_section_title("CLIENT"))
    elements.append(Paragraph("<br/>".join(client_lines), body))
    elements.append(Spacer(1, 6))

    lines = quote.get("lines", []) or []
    labor_lines = [l for l in lines if l.get("line_type") == "labor"]
    material_lines = [
        l for l in lines if l.get("line_type") == "material" and l.get("source_type") != "client"
    ]
    client_lines_mat = [
        l for l in lines if l.get("line_type") == "material" and l.get("source_type") == "client"
    ]

    # --- Main-d'œuvre (toujours séparée) ---
    if labor_lines:
        elements.append(_est_section_title("MAIN-D'ŒUVRE"))
        rows = []
        for l in labor_lines:
            hours = l.get("hours")
            duration = f"{hours:g} h" if hours else "—"
            rows.append(
                [
                    l.get("description", ""),
                    duration,
                    _money(l.get("line_total", 0)),
                ]
            )
        elements.append(_est_table(["Description", "Durée estimée", "Total"], rows, [330, 70, 90]))
        elements.append(
            Paragraph(
                f"Sous-total main-d'œuvre : <b>{_money(quote.get('subtotal_labor', 0))}</b>",
                ParagraphStyle(name="EstSub", fontSize=9.5, alignment=TA_RIGHT, spaceBefore=4),
            )
        )

    # --- Matériaux fournis par Déco Touché ---
    if material_lines:
        elements.append(_est_section_title("MATÉRIAUX ET PRODUITS"))
        rows = []
        for l in material_lines:
            source = l.get("source_name") or "Fournisseur"
            if l.get("price_status") == "a_confirmer":
                rows.append(
                    [
                        l.get("description", ""),
                        source,
                        _qty(l.get("quantity", 1)),
                        "À confirmer",
                        "—",
                    ]
                )
            else:
                rows.append(
                    [
                        l.get("description", ""),
                        source,
                        _qty(l.get("quantity", 1)),
                        _money(l.get("unit_price", 0)),
                        _money(l.get("line_total", 0)),
                    ]
                )
        elements.append(
            _est_table(
                ["Description", "Source", "Qté", "Prix unit.", "Total"],
                rows,
                [215, 95, 35, 70, 75],
            )
        )
        elements.append(
            Paragraph(
                f"Sous-total matériaux : <b>{_money(quote.get('subtotal_material', 0))}</b>",
                ParagraphStyle(name="EstSub2", fontSize=9.5, alignment=TA_RIGHT, spaceBefore=4),
            )
        )
        if any(l.get("price_status") == "a_confirmer" for l in material_lines):
            elements.append(
                Paragraph(
                    "Les prix marqués « À confirmer » ne sont pas inclus dans le total. "
                    "Ils vous seront confirmés avant le début des travaux, jamais après.",
                    small,
                )
            )

    # --- Achats par le client (indicatif, hors total) ---
    if client_lines_mat:
        elements.append(_est_section_title("À ACHETER PAR LE CLIENT"))
        elements.append(
            Paragraph(
                "Ces articles sont achetés directement par vous. Les prix sont donnés "
                "à titre indicatif seulement et ne font pas partie du total de cette estimation.",
                small,
            )
        )
        rows = []
        for l in client_lines_mat:
            rows.append(
                [
                    l.get("description", ""),
                    l.get("source_name") or "Au choix du client",
                    _qty(l.get("quantity", 1)),
                    _money(l.get("unit_price", 0)),
                    _money(l.get("line_total", 0)),
                ]
            )
        elements.append(
            _est_table(
                ["Description", "Magasin suggéré", "Qté", "Prix indicatif", "Total indicatif"],
                rows,
                [215, 95, 35, 70, 75],
            )
        )
        elements.append(
            Paragraph(
                f"Total indicatif des achats par le client : <b>{_money(quote.get('client_material_total', 0))}</b> (non inclus ci-dessous)",
                ParagraphStyle(name="EstSub3", fontSize=9.5, alignment=TA_RIGHT, spaceBefore=4),
            )
        )

    # --- Totaux ---
    elements.append(Spacer(1, 12))
    totals_rows = [
        ["Sous-total main-d'œuvre :", _money(quote.get("subtotal_labor", 0))],
        ["Sous-total matériaux :", _money(quote.get("subtotal_material", 0))],
    ]
    if quote.get("admin_amount"):
        totals_rows.append(
            [
                f"Achat, administration et magasinage ({quote.get('admin_percent', 0):g} %) :",
                _money(quote.get("admin_amount", 0)),
            ]
        )
    if quote.get("delivery_fee"):
        totals_rows.append(["Livraison :", _money(quote.get("delivery_fee", 0))])
    if quote.get("urgency_fee"):
        totals_rows.append(["Frais d'urgence :", _money(quote.get("urgency_fee", 0))])
    if quote.get("contingency_amount"):
        totals_rows.append(
            [
                f"Imprévu ({quote.get('contingency_percent', 0):g} %) :",
                _money(quote.get("contingency_amount", 0)),
            ]
        )
    totals_rows += [
        ["Sous-total avant taxes :", _money(quote.get("subtotal_before_tax", 0))],
        ["TPS (5 %) :", _money(quote.get("tps_amount", 0))],
        ["TVQ (9,975 %) :", _money(quote.get("tvq_amount", 0))],
        ["TOTAL :", _money(quote.get("total_with_tax", 0))],
    ]
    t = Table(totals_rows, colWidths=[380, 110])
    t.setStyle(
        TableStyle(
            [
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("BACKGROUND", (0, -1), (-1, -1), _DT_GOLD_LIGHT),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, -1), (-1, -1), 12.5),
                ("LINEABOVE", (0, -1), (-1, -1), 1.5, _DT_GOLD),
                ("TOPPADDING", (0, -1), (-1, -1), 7),
                ("BOTTOMPADDING", (0, -1), (-1, -1), 7),
            ]
        )
    )
    elements.append(t)
    elements.append(Spacer(1, 16))

    # --- Modalités de paiement ---
    elements.append(_est_section_title("MODALITÉS DE PAIEMENT"))
    elements.append(
        Paragraph(
            f"• Dépôt à la signature : {_money(quote.get('deposit_amount', 0))}<br/>"
            f"• À mi-projet : {_money(quote.get('milestone_amount', 0))}<br/>"
            f"• À la fin des travaux : {_money(quote.get('final_amount', 0))}",
            body,
        )
    )

    # --- Notes ---
    if quote.get("notes"):
        elements.append(_est_section_title("NOTES"))
        elements.append(Paragraph(str(quote["notes"]).replace("\n", "<br/>"), body))

    # --- Documentation visuelle (photos des lieux, mesures, croquis) ---
    elements.extend(_visual_documentation(quote, body, small))

    # --- Mentions obligatoires (ton simple et humain) ---
    elements.append(_est_section_title("BON À SAVOIR"))
    validity_days = quote.get("validity_days", 30)
    mentions = (
        "• Cette estimation est approximative : le prix des matériaux et les quantités "
        "peuvent changer selon ce qu'on trouve sur place. Le prix final vous est toujours "
        "confirmé avant le début des travaux.<br/>"
        "• Visite de mesure : 49 $ + taxes. Si vous réalisez le projet avec nous, "
        "ce montant est déduit à 100 % de votre facture.<br/>"
        "• Les montants sont en dollars canadiens. La TPS et la TVQ s'ajoutent au "
        "sous-total, comme indiqué dans les totaux ci-dessus.<br/>"
        f"• Cette estimation est valide jusqu'au {_safe_date(quote.get('valid_until', ''))} "
        f"({validity_days} jours)."
    )
    elements.append(Paragraph(mentions, body))

    # --- Pied de page ---
    elements.append(Spacer(1, 22))
    elements.append(
        Paragraph(
            f"Merci de votre confiance !<br/><font color=\"#555555\" size=\"8.5\">"
            f"{Brand.NAME} | {Brand.PHONE_DISPLAY} | {Brand.EMAIL} | "
            f"TPS : {Brand.TAX_GST} | TVQ : {Brand.TAX_QST}</font>",
            ParagraphStyle(name="EstFoot", alignment=1, leading=12),
        )
    )

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generate_invoice_pdf(invoice: dict, client: dict) -> BytesIO:
    """Generate the Déco Touché invoice PDF."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=50,
        leftMargin=50,
        topMargin=50,
        bottomMargin=50,
    )
    styles = _build_dt_styles()
    elements = []

    # Header
    elements.append(Paragraph("🦁 Déco Touché", styles["CMGHeader"]))
    elements.append(
        Paragraph(
            f"Montréal & Rive-Sud | {Brand.PHONE_DISPLAY} | {Brand.EMAIL}",
            styles["CMGSubHeader"],
        )
    )
    elements.append(Spacer(1, 20))

    # Invoice Info
    elements.append(Paragraph("FACTURE", styles["CMGTitle"]))
    due_str = _safe_date(invoice.get("due_date", "")) if invoice.get("due_date") else "N/A"
    elements.append(
        _info_table(
            [
                ["Numéro:", invoice.get("invoice_number", "")],
                ["Date:", _safe_date(invoice.get("created_at", ""))],
                ["Échéance:", due_str],
                ["Statut:", invoice.get("status", "draft").upper()],
            ]
        )
    )
    elements.append(Spacer(1, 20))

    # Client Info
    elements.append(Paragraph("FACTURER À", styles["CMGTitle"]))
    elements.append(
        Paragraph(
            f"<b>{client.get('full_name', 'N/A')}</b><br/>"
            f"{client.get('email', '')}<br/>"
            f"{client.get('phone', '')}<br/>"
            f"{client.get('address', '')}",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 20))

    # Line Items
    elements.append(Paragraph("DÉTAILS", styles["CMGTitle"]))
    elements.append(_line_items_table(invoice.get("lines", [])))
    elements.append(Spacer(1, 20))

    # Totals
    totals_rows = [
        ["Sous-total:", f"{invoice.get('subtotal', 0):.2f} $"],
        ["TPS (5%):", f"{invoice.get('tps_amount', 0):.2f} $"],
        ["TVQ (9.975%):", f"{invoice.get('tvq_amount', 0):.2f} $"],
        ["TOTAL:", f"{invoice.get('total', 0):.2f} $"],
    ]
    if invoice.get("amount_paid", 0) > 0:
        totals_rows.append(["Montant payé:", f"-{invoice.get('amount_paid', 0):.2f} $"])
        totals_rows.append(["SOLDE DÛ:", f"{invoice.get('balance_due', 0):.2f} $"])
    elements.append(_totals_table(totals_rows))
    elements.append(Spacer(1, 20))

    # Payment Info
    elements.append(Paragraph("MÉTHODES DE PAIEMENT", styles["CMGTitle"]))
    elements.append(
        Paragraph(
            f"• Virement Interac: {Brand.EMAIL}<br/>"
            f"• Comptant<br/>"
            f"• Chèque à l'ordre de {Brand.NAME}",
            styles["Normal"],
        )
    )

    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("Merci de votre confiance!", styles["CMGSubHeader"]))

    doc.build(elements)
    buffer.seek(0)
    return buffer

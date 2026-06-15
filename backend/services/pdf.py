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


# ---- Public generators ------------------------------------------------------
def generate_quote_pdf(quote: dict, lead: dict, client: dict = None) -> BytesIO:
    """Generate the Déco Touché quote PDF."""
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

    # Quote Info
    elements.append(Paragraph("SOUMISSION", styles["CMGTitle"]))
    elements.append(
        _info_table(
            [
                ["Date:", _safe_date(quote.get("created_at", ""))],
                ["Valide jusqu'au:", _safe_date(quote.get("valid_until", ""))],
                ["Référence:", quote.get("id", "")[:8]],
            ]
        )
    )
    elements.append(Spacer(1, 20))

    # Client Info
    elements.append(Paragraph("CLIENT", styles["CMGTitle"]))
    client_name = client.get("full_name") if client else lead.get("full_name", "N/A")
    client_email = client.get("email") if client else lead.get("email", "N/A")
    client_phone = client.get("phone") if client else lead.get("phone", "N/A")
    client_address = (
        client.get("address", lead.get("address", "")) if client else lead.get("address", "")
    )
    elements.append(
        Paragraph(
            f"<b>{client_name}</b><br/>{client_email}<br/>{client_phone}<br/>{client_address}",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 20))

    # Line Items
    elements.append(Paragraph("DÉTAILS", styles["CMGTitle"]))
    elements.append(_line_items_table(quote.get("lines", [])))
    elements.append(Spacer(1, 20))

    # Totals
    elements.append(
        _totals_table(
            [
                ["Sous-total:", f"{quote.get('subtotal_before_contingency', 0):.2f} $"],
                [
                    f"Contingence ({quote.get('contingency_percent', 15)}%):",
                    f"{quote.get('contingency_amount', 0):.2f} $",
                ],
                ["TPS (5%):", f"{quote.get('tps_amount', 0):.2f} $"],
                ["TVQ (9.975%):", f"{quote.get('tvq_amount', 0):.2f} $"],
                ["TOTAL:", f"{quote.get('total_with_tax', 0):.2f} $"],
            ]
        )
    )
    elements.append(Spacer(1, 20))

    # Payment Terms
    elements.append(Paragraph("MODALITÉS DE PAIEMENT", styles["CMGTitle"]))
    payment_text = (
        f"• Dépôt à la signature: {quote.get('deposit_amount', 0):.2f} $ (30%)<br/>"
        f"• À mi-projet: {quote.get('milestone_amount', 0):.2f} $ (30%)<br/>"
        f"• À la fin des travaux: {quote.get('final_amount', 0):.2f} $ (40%)"
    )
    elements.append(Paragraph(payment_text, styles["Normal"]))
    elements.append(Spacer(1, 20))

    # Notes
    if quote.get("notes"):
        elements.append(Paragraph("NOTES", styles["CMGTitle"]))
        elements.append(Paragraph(quote["notes"], styles["Normal"]))
        elements.append(Spacer(1, 20))

    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("Merci de votre confiance!", styles["CMGSubHeader"]))
    elements.append(
        Paragraph(
            "Déco Touché - Votre partenaire pour tous vos projets",
            styles["CMGSubHeader"],
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

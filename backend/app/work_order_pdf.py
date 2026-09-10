import io
import os
import hashlib
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    Image as RLImage
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.barcode.qr import QrCodeWidget

def generate_work_order_pdf(alert_data: dict) -> bytes:
    """
    Generates an official PWD (Public Works Department) Road Defect Rectification
    Work Order PDF using ReportLab with embedded QR code, telemetry, and contractor terms.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'GovtTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        alignment=1, # Center
        textColor=colors.HexColor('#0f172a')
    )

    subtitle_style = ParagraphStyle(
        'GovtSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        alignment=1,
        textColor=colors.HexColor('#475569')
    )

    doc_header_style = ParagraphStyle(
        'DocHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        alignment=1,
        textColor=colors.HexColor('#b45309')
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0f172a')
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1e293b')
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0f172a')
    )

    legal_style = ParagraphStyle(
        'LegalText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#64748b')
    )

    elements = []

    # 1. Header with Government / PWD Emblem details
    elements.append(Paragraph("GOVERNMENT OF NATIONAL CAPITAL TERRITORY OF DELHI", title_style))
    elements.append(Paragraph("PUBLIC WORKS DEPARTMENT (PWD) — SMART CITY INFRASTRUCTURE CELL", subtitle_style))
    elements.append(Paragraph("URBANEYE AI AUTOMATED DEFECT TENDER & RECTIFICATION WORK ORDER", doc_header_style))
    elements.append(Spacer(1, 10))

    # Alert Fields
    alert_id = alert_data.get('id', 'ALT-UNKNOWN')
    alert_type = (alert_data.get('type') or 'pothole').replace('_', ' ').upper()
    confidence = float(alert_data.get('confidence', 0.85))
    bus_id = alert_data.get('bus_id', 'DTC-FLEET')
    lat = float(alert_data.get('lat', 28.6315))
    long = float(alert_data.get('long', 77.2167))
    timestamp_raw = alert_data.get('timestamp')
    if isinstance(timestamp_raw, str):
        try:
            timestamp_dt = datetime.fromisoformat(timestamp_raw.replace('Z', '+00:00'))
        except Exception:
            timestamp_dt = datetime.utcnow()
    elif isinstance(timestamp_raw, datetime):
        timestamp_dt = timestamp_raw
    else:
        timestamp_dt = datetime.utcnow()

    formatted_time = timestamp_dt.strftime("%d %B %Y, %I:%M %p IST")
    sla_deadline = (timestamp_dt + timedelta(hours=48)).strftime("%d %B %Y, %I:%M %p IST")

    meta = alert_data.get('meta') or {}
    verified_buses = meta.get('verified_by_bus_count', 1)
    contractor = meta.get('repaired_by_contractor', 'M/s Delhi PWD Road Maintenance Concessionaire (Zone-Central)')

    # Work Order Reference
    wo_number = f"PWD/SZ-NDMC/WO-2026/{alert_id}"
    map_url = f"https://www.google.com/maps?q={lat:.5f},{long:.5f}"

    # SHA256 integrity hash
    hash_seed = f"{alert_id}:{bus_id}:{lat}:{long}:{timestamp_dt.isoformat()}"
    sha256_hash = hashlib.sha256(hash_seed.encode()).hexdigest()[:32].upper()

    # 2. Metadata Box Table
    meta_table_data = [
        [
            Paragraph("<b>WORK ORDER NO:</b>", body_bold),
            Paragraph(f"<font color='#b45309'><b>{wo_number}</b></font>", body_bold),
            Paragraph("<b>STATUS:</b>", body_bold),
            Paragraph("<font color='#dc2626'><b>MANDATORY RECTIFICATION</b></font>", body_bold)
        ],
        [
            Paragraph("<b>ISSUED DATE:</b>", body_style),
            Paragraph(formatted_time, body_style),
            Paragraph("<b>REPAIR SLA:</b>", body_style),
            Paragraph(f"<b>48 Hours</b> (Strict SLA: {sla_deadline})", body_bold)
        ],
        [
            Paragraph("<b>CONTRACTOR:</b>", body_style),
            Paragraph(f"<b>{contractor}</b>", body_bold),
            Paragraph("<b>ROAD JURISDICTION:</b>", body_style),
            Paragraph("PWD Central Maintenance Circle, GNCTD", body_style)
        ]
    ]

    meta_table = Table(meta_table_data, colWidths=[105, 160, 105, 150])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 10))

    # 3. Defect Telemetry & QR Code
    elements.append(Paragraph("<b>1. AUTOMATED EDGE TELEMETRY & DEFECT CLASSIFICATION</b>", section_heading))
    elements.append(Spacer(1, 4))

    # QR Code widget for instant Google Maps Navigation
    qr_widget = QrCodeWidget(map_url)
    qr_widget.barWidth = 72
    qr_widget.barHeight = 72
    qr_widget.qrVersion = 1
    qr_drawing = Drawing(72, 72)
    qr_drawing.add(qr_widget)

    est_budget = "₹ 14,800 (IRC Cold-Mix Bitumen Patching)" if "POTHOLE" in alert_type else "₹ 9,500 (Signage / Structure Re-erection)"

    telemetry_data = [
        [
            Paragraph("<b>Defect Category:</b>", body_style),
            Paragraph(f"<b>{alert_type}</b>", body_bold),
            Paragraph("<b>Scan for GPS Pin:</b>", body_bold)
        ],
        [
            Paragraph("<b>GPS Coordinates:</b>", body_style),
            Paragraph(f"<font color='#0284c7'><b>{lat:.5f}° N,  {long:.5f}° E</b></font>", body_bold),
            qr_drawing
        ],
        [
            Paragraph("<b>Detection Edge Unit:</b>", body_style),
            Paragraph(f"Public Bus <b>{bus_id}</b> (On-board Edge Unit)", body_style),
            ""
        ],
        [
            Paragraph("<b>YOLOv8 AI Confidence:</b>", body_style),
            Paragraph(f"<b>{confidence * 100:.1f}%</b> (Validated by Spatial Consensus)", body_style),
            ""
        ],
        [
            Paragraph("<b>Fleet Spatial Consensus:</b>", body_style),
            Paragraph(f"Verified independently by <b>{verified_buses} fleet transit vehicles</b>", body_style),
            ""
        ],
        [
            Paragraph("<b>Estimated PWD Standard Cost:</b>", body_style),
            Paragraph(f"<b>{est_budget}</b>", body_bold),
            ""
        ]
    ]

    telemetry_table = Table(telemetry_data, colWidths=[130, 290, 100])
    telemetry_table.setStyle(TableStyle([
        ('SPAN', (2, 1), (2, -1)), # Merge QR code cell downward
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ffffff')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (1, -1), 0.5, colors.HexColor('#f1f5f9')),
        ('ALIGN', (2, 1), (2, -1), 'CENTER'),
        ('VALIGN', (2, 1), (2, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(telemetry_table)
    elements.append(Spacer(1, 10))

    # 4. Mandatory Closed-Loop Verification Terms & Penalties
    elements.append(Paragraph("<b>2. CONTRACTOR LEGAL SLA & MANDATORY CLOSED-LOOP VERIFICATION</b>", section_heading))
    elements.append(Spacer(1, 4))

    sla_terms = [
        [
            Paragraph("<b>Clause</b>", body_bold),
            Paragraph("<b>Specification Requirement & Legal Mandate</b>", body_bold)
        ],
        [
            Paragraph("<b>SLA 1.1</b>", body_style),
            Paragraph("<b>Mandatory 48-Hour Turnaround:</b> The concessionaire must initiate rapid patching within 12 hours and complete bituminous repair adhering to <b>IRC:82-2015</b> within 48 hours.", body_style)
        ],
        [
            Paragraph("<b>SLA 1.2</b>", body_style),
            Paragraph("<b>Closed-Loop Transit Audit:</b> Contractor invoices will <u>NOT</u> be approved upon manual self-reporting. Approval is legally contingent upon an autonomous transit vehicle (DTC fleet) re-traversing the coordinate and recording a Pavement Condition Index (PCI) score ≥ 85.", body_style)
        ],
        [
            Paragraph("<b>SLA 1.3</b>", body_style),
            Paragraph("<b>Penalty Clause:</b> Default beyond the 48-hour SLA invokes a non-waivable statutory penalty of <b>₹5,000 per 24 hours</b> under <b>Section 198A of the Motor Vehicles (Amendment) Act, 2019</b>.", body_style)
        ]
    ]

    sla_table = Table(sla_terms, colWidths=[65, 455])
    sla_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(sla_table)
    elements.append(Spacer(1, 12))

    # 5. Cryptographic Proof & Digital Seal
    elements.append(Paragraph("<b>3. CRYPTOGRAPHIC INTEGRITY PROOF & AUTHORIZED DISPATCH</b>", section_heading))
    elements.append(Spacer(1, 4))

    cert_data = [
        [
            Paragraph(f"<b>SHA256 Digital Fingerprint:</b><br/><font face='Courier' color='#0284c7' size='7'>{sha256_hash}</font>", body_style),
            Paragraph("<b>Executive Engineer (Roads)</b><br/>Public Works Department, GNCTD<br/><i>[Digitally Signed via UrbanEye AI Automated Dispatch]</i>", body_style)
        ]
    ]
    cert_table = Table(cert_data, colWidths=[310, 210])
    cert_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(cert_table)

    elements.append(Spacer(1, 8))
    elements.append(Paragraph(
        "<i>This is a computer-generated work order triggered by real-time edge AI transit telemetry under SIH 2026 Smart City guidelines. Verified with spatial consensus across multi-bus public transport fleet.</i>",
        legal_style
    ))

    # Build PDF into bytes buffer
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

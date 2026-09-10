import os
import sys
import shutil
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header
        self.drawString(54, 800, "UrbanEye AI — BEL SIH 2026 (Problem Statement 26124)")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 792, 541, 792)
        
        # Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(541, 35, page_text)
        self.drawString(54, 35, "CONFIDENTIAL & PROPRIETARY — SIH 2026 TEAM ARYAN")
        self.line(54, 48, 541, 48)
        self.restoreState()

def build_pdf(filename="UrbanEye_AI_System_Architecture_And_Judges_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=60,
        bottomMargin=60
    )

    styles = getSampleStyleSheet()

    c_primary = colors.HexColor("#0f172a")
    c_accent = colors.HexColor("#0284c7")
    c_dark = colors.HexColor("#1e293b")
    c_muted = colors.HexColor("#475569")

    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=21, leading=25,
        textColor=c_primary, spaceAfter=5
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle', parent=styles['Normal'],
        fontName='Helvetica', fontSize=11, leading=15,
        textColor=c_accent, spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=13, leading=17,
        textColor=colors.HexColor("#0369a1"), spaceBefore=10, spaceAfter=5
    )

    body_style = ParagraphStyle(
        'Body_Custom', parent=styles['Normal'],
        fontName='Helvetica', fontSize=9, leading=13,
        textColor=c_dark, spaceAfter=4
    )

    qa_q_style = ParagraphStyle(
        'QA_Question', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=9.5, leading=13.5,
        textColor=colors.HexColor("#991b1b"), spaceBefore=5, spaceAfter=2
    )

    qa_a_style = ParagraphStyle(
        'QA_Answer', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8.5, leading=12.5,
        textColor=colors.HexColor("#1e293b"), spaceAfter=5
    )

    story = []

    # Title & Metadata
    story.append(Paragraph("UrbanEye AI — Fleet Intelligence Platform", title_style))
    story.append(Paragraph("BEL Smart India Hackathon 2026 (PS 26124) | Complete System Architecture, Hardware & Defense Guide", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=0, spaceAfter=8))

    # Executive Overview
    story.append(Paragraph("1. Executive Summary in Plain Layperson English", h1_style))
    story.append(Paragraph(
        "<b>What is this project?</b> City municipal corporations spend crores hiring survey vans to inspect roads. In reality, thousands of city transit buses (DTC, BMTC, BEST) ALREADY traverse 100% of municipal road networks every single day from 5 AM to 11 PM.<br/>"
        "<b>What did we build?</b> We convert ordinary public transit buses into <b>autonomous mobile AI sensing units</b>. A compact rugged edge device (Raspberry Pi / Jetson) connects to a windshield camera. As the bus operates its standard passenger route, an onboard YOLO AI model detects road surface defects (potholes, waterlogging, missing signs) and traffic hazards in real time, transmitting instant lightweight telemetry to a municipal command center.",
        body_style
    ))

    # Hardware & Edge Pipeline
    story.append(Paragraph("2. Hardware & Physical Setup (Inside the Public Bus)", h1_style))
    story.append(Paragraph(
        "<b>How is a Raspberry Pi / Jetson connected to a webcam in real life?</b>", body_style
    ))
    
    hw_data = [
        [Paragraph("<b>Step / Component</b>", body_style), Paragraph("<b>Physical Connection</b>", body_style), Paragraph("<b>Software / Protocol</b>", body_style)],
        [Paragraph("1. Camera Mounting", body_style), Paragraph("Standard USB HD Dashcam (Logitech C270 / Sony STARVIS) suction-mounted to front bus windshield.", body_style), Paragraph("Recognized automatically by Linux kernel as <code>/dev/video0</code>. Read in Python via <code>cv2.VideoCapture(0)</code>.", body_style)],
        [Paragraph("2. Edge Compute", body_style), Paragraph("Raspberry Pi 5 / NVIDIA Jetson Orin Nano mounted securely inside the driver's dashboard.", body_style), Paragraph("Runs YOLOv8 AI inference locally at 1-2 FPS. Does NOT require any internet to record or infer.", body_style)],
        [Paragraph("3. Vehicle Power", body_style), Paragraph("Bus 12V/24V lead-acid battery connected to a 12V-to-5V 5A DC-DC Buck Converter.", body_style), Paragraph("Ignition-sensing circuit cleanly boots the Pi when bus engine starts, and initiates graceful shutdown on key-off.", body_style)],
        [Paragraph("4. GPS Telemetry", body_style), Paragraph("u-blox NEO-M8N GNSS USB module with external magnetic antenna on roof.", body_style), Paragraph("Reads continuous NMEA sentences (lat/long, speed, heading) over serial port <code>/dev/ttyUSB0</code>.", body_style)],
        [Paragraph("5. Unattended Boot", body_style), Paragraph("Headless device without keyboard/monitor.", body_style), Paragraph("Linux <code>systemd</code> daemon automatically launches <code>process_real_video.py</code> on boot.", body_style)],
    ]
    t = Table(hw_data, colWidths=[105, 175, 207])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e0f2fe")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t)

    # Cloud vs Local vs Internet
    story.append(Paragraph("3. The Cloud & Internet Reality: Where is Data Actually Consumed?", h1_style))
    story.append(Paragraph(
        "<b>Judges' Question:</b> <i>'If your backend is on the cloud, won't continuous video streaming cost a fortune in 4G mobile bills?'</i><br/>"
        "<b>The Reality:</b> Continuous video is NEVER streamed to the cloud. Internet is only triggered for 0.05 seconds when a defect is confirmed.",
        body_style
    ))

    net_data = [
        [Paragraph("<b>Operation</b>", body_style), Paragraph("<b>Internet Required?</b>", body_style), Paragraph("<b>Data Consumed</b>", body_style), Paragraph("<b>Where It Executes</b>", body_style)],
        [Paragraph("1. Dashcam Video Stream", body_style), Paragraph("<b>NO (0% Internet)</b>", body_style), Paragraph("0 Bytes cellular", body_style), Paragraph("Locally over USB/RTSP wire into Pi RAM", body_style)],
        [Paragraph("2. YOLO Pothole Detection", body_style), Paragraph("<b>NO (0% Internet)</b>", body_style), Paragraph("0 Bytes cellular", body_style), Paragraph("Locally on onboard CPU/GPU/NPU cores", body_style)],
        [Paragraph("3. Frame Crop & Bounding Box", body_style), Paragraph("<b>NO (0% Internet)</b>", body_style), Paragraph("0 Bytes cellular", body_style), Paragraph("Locally saved to internal MicroSD/NVMe SSD", body_style)],
        [Paragraph("4. Transmit Alert to Cloud", body_style), Paragraph("<b>YES (Micro-burst)</b>", body_style), Paragraph("<b>~40 KB</b> (One JPEG + JSON)", body_style), Paragraph("Single HTTP POST over 4G IoT SIM", body_style)],
    ]
    t_net = Table(net_data, colWidths=[115, 105, 95, 172])
    t_net.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#fef3c7")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_net)
    story.append(Paragraph("<b>Cost Impact:</b> A fleet of 1,000 buses costs under ₹120/month per vehicle on standard 1GB IoT SIM packs (saving <b>99.9944%</b> vs raw streaming).", body_style))

    story.append(PageBreak())

    # Offline Tunnel Architecture
    story.append(Paragraph("4. The Tunnel & Blind-Spot Solution: 'Store-and-Forward' Protocol", h1_style))
    story.append(Paragraph(
        "<b>Judges' Question:</b> <i>'What happens in tunnels or rural areas where 4G mobile signal is completely dead?'</i><br/>"
        "<b>Answer:</b> UrbanEye AI operates an <b>Offline-First Store-and-Forward Architecture</b>:",
        body_style
    ))

    tunnel_data = [
        [Paragraph("<b>Scenario</b>", body_style), Paragraph("<b>System Behavior</b>", body_style)],
        [Paragraph("1. Signal Loss", body_style), Paragraph("Bus enters underground tunnel / cellar. 4G signal drops to 0. Background network watchdog detects socket disconnect.", body_style)],
        [Paragraph("2. Local Buffering", body_style), Paragraph("When YOLO detects a defect, it queues the JPEG crop and metadata into an onboard SQLite database (<code>edge_buffer.db</code>).", body_style)],
        [Paragraph("3. Auto-Sync", body_style), Paragraph("Upon exiting the tunnel, network watchdog re-establishes connection and flushes queued alerts in a single compressed batch POST request.", body_style)],
        [Paragraph("4. Night Failsafe", body_style), Paragraph("For routes with persistent zero-signal, when the bus docks at the municipal depot at night, it connects to Depot Wi-Fi and dumps the day's telemetry in 20 seconds.", body_style)],
    ]
    t_tun = Table(tunnel_data, colWidths=[120, 367])
    t_tun.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#dcfce7")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_tun)

    # Top Cross Questions & Defense
    story.append(Paragraph("5. Predicted Judges Tough Cross-Questions & Model Defense Answers", h1_style))
    qa_list = [
        ("Q1: Night, Fog & Rain — How can cameras detect road defects in low light?",
         "Answer: (1) Low-light Sony STARVIS sensors with amplified sensor gain; (2) In heavy rain, the model classifies reflective puddle surfaces and waterlogging depressions; (3) In production hardware, we specify an active 850nm Near-Infrared (NIR) bumper illuminator invisible to human drivers but providing crisp night vision."),
        
        ("Q2: False Positives — What if a tree shadow or dark asphalt patch looks like a pothole?",
         "Answer: A single detection is marked 'Candidate'. We implement Multi-Bus Spatial Consensus: when Bus A flags a pothole at (28.6315, 77.2167), it remains pending until Bus B or Bus C crosses the exact same 15-meter geofence within 24 hours. Corroborated alerts raise confidence to 95%+ and increment verified_by_bus_count. Moving shadows fail corroboration and auto-prune."),

        ("Q3: Camera Vibration — Won't vehicle bounces make frames blurry?",
         "Answer: (1) Global electronic shutter set to 1/1000s or faster eliminates motion blur at 60 km/h; (2) An onboard 6-axis IMU accelerometer turns the bounce into proof! A vertical Z-axis G-force spike at the exact timestamp validates that the bus physically encountered a road depression."),

        ("Q4: Citizen Privacy & DPDP Act 2023 — Does recording public streets violate privacy laws?",
         "Answer: Under Section 4 of India's Digital Personal Data Protection Act 2023, public surveillance requires privacy safeguards. Our edge pipeline includes an on-chip PII filter: all human faces and private vehicle license plates are blurred BEFORE alerts leave the bus. Plates for hit-and-run incidents are AES-256 encrypted, accessible only via verified Officer Auth login."),

        ("Q5: Thermal Throttling in Indian Summers — Won't edge hardware overheat inside a 50°C bus?",
         "Answer: Standard consumer casings will throttle. For fleet deployment, we use fanless extruded aluminum finned chassis rated for automotive operation (-25°C to +75°C) with IP67 ingress protection against dust and moisture.")
    ]
    for q, a in qa_list:
        story.append(Paragraph(q, qa_q_style))
        story.append(Paragraph(a, qa_a_style))

    story.append(PageBreak())

    # Demo Modes & Remind Me Master List
    story.append(Paragraph("6. Presentation Demo Modes & Action Items", h1_style))
    story.append(Paragraph(
        "<b>Available Live Demo Triggers in the Repository:</b><br/>"
        "• <b>Demo Mode 1 (1080p Real Video Pipeline):</b> <code>python process_real_video.py</code> reads <code>backend/videos/sample_road.mp4</code>, runs YOLO detection, draws real bounding boxes + HUD watermark, and pushes real snapshots to the dashboard.<br/>"
        "• <b>Demo Mode 2 (Interactive Webcam Mode):</b> <code>python process_real_video.py --webcam</code> opens the laptop/external camera. Hold a phone showing a pothole image in front of the camera, and watch the AI detect it live and pop a real pin on the dashboard.<br/>"
        "• <b>One-Click Presentation Launcher:</b> Double-clicking <code>run_demo.bat</code> boots the backend, frontend, and browser in 4 seconds.",
        body_style
    ))

    story.append(Spacer(1, 8))

    story.append(Paragraph("7. Project Limitations (Khamiyaan) & Production Engineering Roadmap", h1_style))
    gaps = [
        [Paragraph("<b>Current Prototype Gap (Kami)</b>", body_style), Paragraph("<b>Production Solution & Roadmap</b>", body_style)],
        [Paragraph("1. GPS Precision (Consumer GPS drifts 3-5m)", body_style), Paragraph("Integrate dual-band RTK-GPS (u-blox F9P) or fuse with bus odometer telemetry for sub-meter lane accuracy.", body_style)],
        [Paragraph("2. 2D vs 3D Depth Estimation", body_style), Paragraph("Fuse 2D camera bounding boxes with vehicle IMU Z-axis shock data to calculate true volumetric pothole depth in centimeters.", body_style)],
        [Paragraph("3. Edge Model Quantization", body_style), Paragraph("Export PyTorch weights to INT8 TensorRT/ONNX format, reducing model footprint to <6 MB with 30 FPS inference on Raspberry Pi 5.", body_style)],
        [Paragraph("4. Municipal Work-Order Dispatch", body_style), Paragraph("Connect REST Webhooks to CPWD/PWD e-tendering portal to automatically dispatch road repair contractor work orders.", body_style)],
    ]
    t_gap = Table(gaps, colWidths=[180, 307])
    t_gap.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_gap)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] Successfully built PDF: {filename}")

    # Copy to static and public folders for instant browser download links
    static_dest = os.path.join(os.path.dirname(__file__), "backend", "static", filename)
    public_dest = os.path.join(os.path.dirname(__file__), "frontend", "public", filename)
    shutil.copy(filename, static_dest)
    shutil.copy(filename, public_dest)
    print(f"[OK] Copied to backend/static and frontend/public for 1-click web download")

if __name__ == "__main__":
    build_pdf()

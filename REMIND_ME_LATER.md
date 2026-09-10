# 📌 UrbanEye AI — "Remind Me Later" Master Memory Tracker

*Ye file user ki saari specifically marked baatein, demo options, aur future implementation checklist ko track karti hai. Jab bhi user bole **"remind me"**, ye list point-wise present karni hai.*

---

## 🎯 1. Interactive Demo Modes
- [ ] **Webcam Live Demo Mode**:
  - Command: `python process_real_video.py --webcam`
  - Purpose: Laptop ya external webcam ke samne phone me pothole ki photo dikha kar live instant bounding box aur dashboard alert trigger karna. Judges ke samne 100% live proof ke liye.
- [ ] **Sample Dashcam Video Mode (Option 1)**:
  - Command: `python process_real_video.py`
  - Location: `backend/videos/dashcam_road.mp4` (MIT DriveSeg 1080p forward dashcam)
  - Purpose: 1-command se real video scan karke real captured frames ko dashboard par pop karna.

---

## 🛠️ 2. Hardware & Edge (Raspberry Pi / Jetson)
- [ ] **Raspberry Pi Webcam Connection**:
  - USB Webcam ya CSI Ribbon Camera (`/dev/video0`)
  - Auto-start on bus ignition via Linux `systemd` service (`urbaneye-edge.service`)
  - DC-DC 12V/24V to 5V 5A step-down buck converter powering
- [ ] **Edge Offline Resilience (Store-and-Forward)**:
  - SQLite local buffer `edge_buffer.db` for tunnel/no-network zones
  - Auto-sync queue when 4G network reconnects or night Depot Wi-Fi sync

---

## 🔍 3. Identified Project Gaps (Khamiyaan) & Future Fixes
- [ ] **Pothole Depth Estimation**: Single camera only measures 2D (width/length). Fusing with MPU-6050 Accelerometer Z-axis G-force spike to estimate volumetric depth.
- [ ] **GPS Precision**: Moving from consumer GPS (3-5m drift) to RTK-GPS or bus odometer dead-reckoning.
- [ ] **Model Quantization on Edge**: Converting `yolov8n.pt` to ONNX / INT8 TensorRT for 30 FPS inference on low-power Pi/Jetson hardware.
- [ ] **DPDP Act 2023 Privacy**: Face and license plate edge blurring filter before transmission to cloud.

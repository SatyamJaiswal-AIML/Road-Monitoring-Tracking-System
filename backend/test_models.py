import cv2, numpy as np, os
from ultralytics import YOLO

print('=' * 55)
print('  UrbanEye AI — OpenCV + YOLO Model Test')
print('=' * 55)

# ── Load models
print('\n[1] Loading models...')
vehicle_model = YOLO('yolov8n.pt')
pothole_model  = YOLO(os.path.join('weights', 'pothole_yolov8.pt'))
print('    Vehicle model : yolov8n.pt          LOADED')
print('    Pothole model : pothole_yolov8.pt   LOADED')
print('    Pothole classes:', pothole_model.names)

# ── Build synthetic road frame
print('\n[2] Generating synthetic road frame (640x480)...')
frame = np.zeros((480, 640, 3), dtype=np.uint8)
frame[200:, :]  = (45, 42, 40)       # dark asphalt
frame[:200, :]  = (100, 110, 85)     # sky
cv2.rectangle(frame, (315, 200), (325, 480), (220, 200, 50), -1)  # lane marking

# Potholes
cv2.ellipse(frame, (200, 380), (80, 45), 0, 0, 360, (8, 8, 8), -1)
cv2.ellipse(frame, (450, 340), (45, 25), 15, 0, 360, (12, 12, 12), -1)
cv2.ellipse(frame, (100, 300), (25, 15), 0, 0, 360, (15, 15, 15), -1)

# Car
cv2.rectangle(frame, (380, 210), (500, 270), (60, 90, 180), -1)
cv2.rectangle(frame, (395, 195), (490, 215), (60, 90, 180), -1)

cv2.imwrite('test_road_frame.jpg', frame)
print('    Saved test_road_frame.jpg')

# ── Vehicle detection
print('\n[3] Running YOLOv8n VEHICLE detection...')
res_v  = vehicle_model(frame, verbose=False, conf=0.25)
boxes_v = res_v[0].boxes
print(f'    Detections: {len(boxes_v)}')
for b in boxes_v:
    cls_name = vehicle_model.names[int(b.cls[0])]
    conf = float(b.conf[0])
    x1,y1,x2,y2 = [int(v) for v in b.xyxy[0]]
    print(f'    -> {cls_name:12s}  conf={conf:.2f}  bbox=({x1},{y1},{x2},{y2})')

# ── Pothole detection
print('\n[4] Running YOLOv8 POTHOLE detection...')
res_p  = pothole_model(frame, verbose=False, conf=0.15)
boxes_p = res_p[0].boxes
print(f'    Detections: {len(boxes_p)}')
for b in boxes_p:
    conf = float(b.conf[0])
    x1,y1,x2,y2 = [int(v) for v in b.xyxy[0]]
    area_pct = ((x2-x1)*(y2-y1)) / (640*480) * 100
    sev = 3 if area_pct > 4.5 else (2 if area_pct > 1.5 else 1)
    label = {1:'Low', 2:'Medium', 3:'CRITICAL'}[sev]
    print(f'    -> pothole  conf={conf:.2f}  area={area_pct:.1f}%  severity=Level {sev} ({label})')

# ── OpenCV Laplacian depth
print('\n[5] OpenCV Laplacian depth scoring...')
gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
lap  = cv2.Laplacian(gray, cv2.CV_64F)
print(f'    Full frame Laplacian variance: {lap.var():.2f}')
for name, y0 in [('Left lane', 320), ('Center', 370), ('Right lane', 420)]:
    roi = frame[y0-20:y0+20, 50:590]
    lap_roi = cv2.Laplacian(cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY), cv2.CV_64F)
    score = min(lap_roi.var() / 1000, 1.0)
    print(f'    {name:12s}: depth_score={score:.3f}')

print('\n' + '=' * 55)
print('  RESULT SUMMARY')
print('=' * 55)
print(f'  OpenCV        : OK  (v{cv2.__version__})')
print(f'  YOLO Vehicle  : OK  ({len(boxes_v)} detection(s) on synthetic frame)')
print(f'  YOLO Pothole  : OK  ({len(boxes_p)} detection(s) on synthetic frame)')
if len(boxes_p) == 0:
    print('\n  NOTE: 0 potholes on synthetic frame is normal.')
    print('  The model was trained on real road photos.')
    print('  Use live camera or video upload for real detections.')
print('=' * 55)

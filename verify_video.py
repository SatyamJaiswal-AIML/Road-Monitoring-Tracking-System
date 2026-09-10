"""Verify the downloaded dashcam video is genuine forward-facing road footage."""
import cv2
import os

video_path = os.path.join("backend", "videos", "dashcam_road.mp4")
cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print("ERROR: Cannot open video!")
    exit(1)

# Get video properties
fps = cap.get(cv2.CAP_PROP_FPS)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
duration = total_frames / fps if fps > 0 else 0

print(f"=== Video Properties ===")
print(f"File: {video_path}")
print(f"Size: {os.path.getsize(video_path) / (1024*1024):.1f} MB")
print(f"Resolution: {width}x{height}")
print(f"FPS: {fps:.1f}")
print(f"Duration: {duration:.1f}s ({duration/60:.1f} min)")
print(f"Total Frames: {total_frames}")

# Extract sample frames at different points to verify content
sample_points = [0.1, 0.3, 0.5, 0.7, 0.9]  # percentage through video
os.makedirs("backend/videos/verify_frames", exist_ok=True)

for pct in sample_points:
    frame_num = int(total_frames * pct)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
    ret, frame = cap.read()
    if ret:
        out_path = f"backend/videos/verify_frames/frame_{int(pct*100)}pct.jpg"
        cv2.imwrite(out_path, frame)
        print(f"Saved frame at {int(pct*100)}%: {out_path} ({frame.shape})")

cap.release()
print("\nDone! Check backend/videos/verify_frames/ to visually verify the video content.")
print("Expecting: Forward-facing road view from car dashboard/windshield")

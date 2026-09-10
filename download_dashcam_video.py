"""Search Pexels for forward-facing driving road videos and download the best one."""
import requests
import os
import sys

API_KEY = "563492ad6f91700001000001b268c39b3ff04e1e8b09f7f44c25c3c3"
HEADERS = {"Authorization": API_KEY}

# Search for forward-facing driving videos
queries = [
    "dashcam driving road city",
    "car windshield view driving traffic",
    "driving road POV forward",
    "car dashboard view road"
]

best_video = None
best_file = None

for q in queries:
    print(f"\n--- Searching: '{q}' ---")
    r = requests.get(
        "https://api.pexels.com/videos/search",
        params={"query": q, "per_page": 5, "size": "medium", "orientation": "landscape"},
        headers=HEADERS,
    )
    if r.status_code != 200:
        print(f"  Error: {r.status_code}")
        continue
    
    data = r.json()
    for v in data.get("videos", []):
        duration = v.get("duration", 0)
        vid_id = v.get("id")
        url = v.get("url", "")
        print(f"  ID={vid_id}, duration={duration}s, url={url}")
        
        # Prefer videos between 10-120 seconds
        if 10 <= duration <= 120:
            # Find the best quality file (HD preferred)
            for vf in v.get("video_files", []):
                w = vf.get("width", 0)
                h = vf.get("height", 0)
                link = vf.get("link", "")
                quality = vf.get("quality", "")
                print(f"    -> {quality} {w}x{h}: {link[:80]}...")
                
                if w >= 1280 and (best_file is None or w > best_file.get("width", 0)):
                    best_video = v
                    best_file = vf
            
            if best_video:
                break
    
    if best_video:
        break

if not best_video or not best_file:
    print("\nNo suitable video found!")
    sys.exit(1)

print(f"\n=== BEST VIDEO ===")
print(f"ID: {best_video['id']}")
print(f"URL: {best_video['url']}")
print(f"Duration: {best_video['duration']}s")
print(f"Download: {best_file['link']}")
print(f"Resolution: {best_file.get('width')}x{best_file.get('height')}")

# Download it
out_path = os.path.join(os.path.dirname(__file__), "backend", "videos", "dashcam_road.mp4")
os.makedirs(os.path.dirname(out_path), exist_ok=True)

print(f"\nDownloading to {out_path}...")
resp = requests.get(best_file["link"], stream=True)
total = int(resp.headers.get("content-length", 0))
downloaded = 0

with open(out_path, "wb") as f:
    for chunk in resp.iter_content(chunk_size=1024 * 1024):
        f.write(chunk)
        downloaded += len(chunk)
        if total:
            pct = downloaded * 100 // total
            print(f"  {downloaded // (1024*1024)} MB / {total // (1024*1024)} MB ({pct}%)")

file_size = os.path.getsize(out_path)
print(f"\nDone! File size: {file_size / (1024*1024):.1f} MB")
print(f"Saved to: {out_path}")

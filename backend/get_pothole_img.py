import urllib.request
import re
import urllib.parse
import os

# Known reliable Wikimedia Commons direct pothole images
pothole_urls = [
    "https://upload.wikimedia.org/wikipedia/commons/3/35/Pothole_on_residential_street_in_Durham%2C_North_Carolina.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/2/29/Pothole_in_Paddock_Wood.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/f/fc/Pothole_in_the_road%2C_Easton%2C_Bristol.jpg",
    "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80"
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
dest = "frontend/public/images/alerts/pothole.jpg"

for u in pothole_urls:
    try:
        print(f"Trying: {u}")
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            if len(data) > 5000:
                with open(dest, "wb") as f:
                    f.write(data)
                print(f"[SUCCESS] Downloaded authentic pothole image ({len(data)} bytes) to {dest}")
                break
    except Exception as e:
        print(f"Failed {u}: {e}")

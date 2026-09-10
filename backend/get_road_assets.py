import urllib.request
import re
import urllib.parse
import os

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def search_and_download(query, dest_path):
    print(f"Searching for: {query}...")
    encoded = urllib.parse.quote(query)
    search_url = f"https://html.duckduckgo.com/html/?q={encoded}"
    try:
        req = urllib.request.Request(search_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
        
        # Find urls
        links = re.findall(r'uddg=([^&"\']+)', html)
        for link in links:
            raw_url = urllib.parse.unquote(link)
            if any(raw_url.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png']):
                print(f"Candidate: {raw_url}")
                try:
                    r2 = urllib.request.Request(raw_url, headers=headers)
                    with urllib.request.urlopen(r2, timeout=8) as img_resp:
                        data = img_resp.read()
                        if len(data) > 10000:
                            with open(dest_path, "wb") as out:
                                out.write(data)
                            print(f"[SUCCESS] Downloaded {dest_path} ({len(data)/1024:.1f} KB)")
                            return True
                except Exception as e:
                    print(f"Failed candidate: {e}")
    except Exception as err:
        print(f"Search failed: {err}")
    return False

# Target 1: Missing Crossing (Zebra crossing on asphalt road)
search_and_download("zebra crossing road asphalt filetype:jpg", "frontend/public/images/alerts/missing_crossing.jpg")

# Target 2: Missing / Damaged Signboard (Traffic sign on road)
search_and_download("traffic sign on street pole filetype:jpg", "frontend/public/images/alerts/missing_signboard.jpg")

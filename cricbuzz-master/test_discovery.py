import urllib.request
import re

def test_dynamic_discovery():
    url = "https://m.cricbuzz.com/live-cricket-scores"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            
        # 1. Find all match blocks (<a> tags)
        # Using a broad pattern to catch match items
        match_links = re.findall(r'<a[^>]*href=\"([^\"]*)\"[^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL)
        
        for link, content in match_links:
            if "Karachi Kings" in content:
                print(f"FOUND KK MATCH!")
                print(f"URL: {link}")
                
                # Try to extract scores from content
                # Example: <div class="cb-min-bat-rw">Karachi Kings 150/6 (20)</div>
                score_patterns = re.findall(r"(\d+/\d+|\d+-\d+|\d+)\s*\((\d+\.?\d*)\)", content)
                print(f"Scores found in block: {score_patterns}")
                
                # Identify opponent
                # Content usually lists both teams
                return True
        
        print("Karachi Kings match not found on live page.")
        return False
        
    except Exception as e:
        print(f"Research Error: {e}")
        return False

if __name__ == "__main__":
    test_dynamic_discovery()

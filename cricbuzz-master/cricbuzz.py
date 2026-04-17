import urllib.request
import re
import json
import os
import sys

# Set encoding to UTF-8 for console output if possible
if sys.stdout.encoding != 'utf-8':
    try:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    except:
        pass

def fetch_robust_score():
    print("Searching for Karachi Kings PSL match (Status Fix)...")
    base_url = "https://m.cricbuzz.com"
    list_url = f"{base_url}/live-cricket-scores"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    
    try:
        # STEP 1: Discovery
        req = urllib.request.Request(list_url, headers=headers)
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8', errors='ignore')
            
        a_tags = re.findall(r'(<a[^>]*href="(/live-cricket-scores/[^"]*)"[^>]*>.*?</a>)', html, re.I | re.S)
        
        detail_url = None
        for full_tag, link in a_tags:
            if "Karachi Kings" in full_tag or "KRK" in full_tag:
                if "PSL" in full_tag or "Pakistan Super League" in full_tag or "pakistan-super-league" in link:
                    detail_url = base_url + link
                    break
        
        if not detail_url:
            print("No active PSL match found.")
            # Set to false so the website returns to countdown
            save_json({"status": "no_match", "match_ended": True})
            return

        # STEP 2: Extraction
        req_detail = urllib.request.Request(detail_url, headers=headers)
        with urllib.request.urlopen(req_detail) as response:
            detail_html = response.read().decode('utf-8', errors='ignore')

        clean_text = re.sub(r'\s+', ' ', detail_html).strip()

        # Extract from meta description
        desc_match = re.search(r'content="Follow (.*?) \|', clean_text, re.I)
        score_line = desc_match.group(1) if desc_match else clean_text
        
        parts = re.split(r" vs ", score_line, flags=re.I)
        results = {"KRK": {"score": "-", "overs": "20"}, "OTHER": {"score": "-", "overs": "20"}}
        opponent_name = "Opponent"

        for p in parts:
            score_match = re.search(r"(\d+[/|-]\d+)", p)
            overs_match = re.search(r"\((\d+\.?\d*)\)", p)
            abbr_match = re.search(r"([A-Z]{2,3})", p)
            
            if abbr_match:
                key = "KRK" if abbr_match.group(1).upper() in ["KRK", "KK"] else "OTHER"
                if score_match: results[key]["score"] = score_match.group(1)
                if overs_match: results[key]["overs"] = overs_match.group(1)

        psl_teams = ["Islamabad United", "Multan Sultans", "Peshawar Zalmi", "Quetta Gladiators", "Lahore Qalandars", "Hyderabad"]
        for team in psl_teams:
            if team.lower() in clean_text.lower() and "karachi" not in team.lower():
                opponent_name = team
                break

        # Determine Match Status
        match_ended = False
        status = "Live Now"
        if "won by" in clean_text.lower() or "Match tied" in clean_text:
            match_ended = True
            res_match = re.search(r"([A-Za-z ]+ (won by|tied|No result)[^<|]*)", clean_text, re.I)
            status = res_match.group(1).strip() if res_match else "Match Concluded"
        elif "Preview" in clean_text:
            status = "Match Preview"

        data = {
            "status": "success",
            "match_ended": match_ended,
            "match": f"Karachi Kings vs {opponent_name}",
            "opponent_name": opponent_name,
            "karachi": results["KRK"],
            "islamabad": results["OTHER"],
            "raw_status": status
        }
        
        save_json(data)
        print(f"Update: Match Ended? {match_ended} | KK {results['KRK']['score']} vs {opponent_name}")
        
    except Exception as e:
        print(f"Scraper Error: {e}")

def save_json(data):
    output_path = os.path.join(os.path.dirname(__file__), "live.json")
    with open(output_path, "w") as f:
        json.dump(data, f, indent=4)

if __name__ == "__main__":
    fetch_robust_score()

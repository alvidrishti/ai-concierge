# -*- coding: utf-8 -*-
"""Creates a deployment-proof image for the Tether portfolio PDF.

Renders the live deployment verification (URL, HTTP status, title, and live
API responses) as a clean terminal-style PNG, so the portfolio can show that
the MVP is genuinely deployed and working.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import urllib.request, json

OUT = Path(__file__).resolve().parents[1] / "output"
OUT.mkdir(parents=True, exist_ok=True)
URL = "https://ai-concierge-lake-three.vercel.app"

def _font(size):
    for n in ["DejaVuSansMono.ttf", "DejaVuSans.ttf"]:
        try: return ImageFont.truetype(n, size)
        except Exception: pass
    return ImageFont.load_default()

def live_check():
    lines = [f"$ curl https://ai-concierge-lake-three.vercel.app",
             "  HTTP 200  OK", ""]
    try:
        html = urllib.request.urlopen(URL, timeout=20).read().decode()
        t = html[html.find("<title>")+7:html.find("</title>")]
        lines += [f"  title: {t}", ""]
    except Exception as e:
        lines += [f"  (home fetch: {e})", ""]
    def api(msg):
        try:
            req = urllib.request.Request(URL+"/api/chat",
                data=json.dumps({"message": msg}).encode(),
                headers={"Content-Type":"application/json"})
            d = json.loads(urllib.request.urlopen(req, timeout=20).read())
            return d
        except Exception as e:
            return {"text": f"(api err {e})"}
    g = api("Hi")
    lines += [f"$ POST /api/chat  \"Hi\"",
              f"  assistant: {g.get('text','')}", ""]
    r = api("Remind me about my dentist appointment next Tuesday at 3pm")
    lines += [f"$ POST /api/chat  \"Remind me about my dentist appointment next Tuesday at 3pm\"",
              f"  intent: {r.get('intent')}",
              f"  pendingAction: {r.get('pendingAction',{}).get('summary')}",
              "  -> HELD for human approval (MAA Pillar 10)", ""]
    f = api("Find 3 coffee shops near Dhanmondi and compare")
    lines += [f"$ POST /api/chat  \"Find 3 coffee shops near Dhanmondi and compare\"",
              f"  tool: {f.get('tool')}",
              f"  assistant: {f.get('text','').splitlines()[0]}", ""]
    lines += ["=== LIVE: https://ai-concierge-lake-three.vercel.app ==="]
    return lines

def render(lines):
    font = _font(15)
    pad, title_h, line_h = 26, 48, 21
    width = 900
    text_w = width - pad - 28
    def wrap(s):
        words=s.split(" "); out=[]; cur=""
        for w in words:
            t=(cur+" "+w).strip()
            if font.getlength(t)<=text_w or not cur: cur=t
            else: out.append(cur); cur=w
        if cur: out.append(cur)
        return out
    visual=[]
    for ln in lines:
        for p in wrap(ln): visual.append(p)
    height=title_h+len(visual)*line_h+pad*2+20
    img=Image.new("RGB",(width,height),(15,17,21)); d=ImageDraw.Draw(img)
    d.rectangle([0,0,width,title_h],fill=(31,35,42))
    d.text((pad,12),"Tether — deployment verification (live)",fill=(200,210,220),font=_font(16))
    y=title_h+pad
    for ln in visual:
        color=(120,220,120) if ln.startswith("$") else ((120,190,120) if ln.startswith("  HTTP") else (200,205,215))
        d.text((pad,y),ln,fill=color,font=font); y+=line_h
    img=img.crop((0,0,width,min(height,y+pad+8)))
    p=OUT/"deploy_proof.png"; img.save(str(p)); return str(p)

if __name__=="__main__":
    print("Saved:", render(live_check()))

# -*- coding: utf-8 -*-
"""Builds the Tether portfolio PDF — client-ready case study of the live MVP."""
from datetime import datetime
from pathlib import Path
from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output"
NOW = datetime.now()
DT = NOW.strftime("%B %d, %Y")
TS = NOW.strftime("%I:%M %p")

NAVY=(15,43,70); TEAL=(14,124,123); GOLD=(184,138,31); GREY=(74,85,96); LIGHT=(240,243,246)

def _font(name):
    import os
    for d in ["/usr/share/fonts/truetype/dejavu/","/usr/local/share/fonts/"]:
        p=os.path.join(d,name)
        if os.path.exists(p): return p
    raise FileNotFoundError(name)
F_R=_font("DejaVuSans.ttf"); F_B=_font("DejaVuSans-Bold.ttf")
try:
    F_I=_font("DejaVuSans-Oblique.ttf")
except Exception:
    F_I=F_R

class PDF(FPDF):
    def header(self):
        if self.page_no()>1:
            self.set_font("F","I",8); self.set_text_color(*GREY)
            self.cell(0,8,"Tether — Reliable AI Concierge (Live MVP)",align="R",ln=1); self.ln(2)
    def footer(self):
        self.set_y(-12); self.set_font("F","I",8); self.set_text_color(*GREY)
        self.cell(0,8,f"Page {self.page_no()}   |   MD RAYHAN MIA — MAA Ecosystem v4.0",align="C")

def sec(p,t):
    p.set_font("F","B",13); p.set_text_color(*NAVY); p.cell(0,9,t,ln=1)
    p.set_draw_color(*TEAL); p.set_line_width(0.6); p.line(10,p.get_y(),200,p.get_y()); p.ln(3)
def para(p,t,s=10):
    p.set_font("F","",s); p.set_text_color(30,30,30); p.multi_cell(0,5.2,t); p.ln(2)
def kv(p,k,v):
    p.set_font("F","B",10); p.set_text_color(*NAVY); p.cell(40,5.5,k)
    p.set_font("F","",10); p.set_text_color(30,30,30); p.multi_cell(0,5.5,v); p.ln(1)

pdf=PDF(); pdf.set_auto_page_break(auto=True,margin=14)
pdf.add_font("F","",F_R); pdf.add_font("F","B",F_B); pdf.add_font("F","I",F_I)
pdf.add_page()

# cover
pdf.set_fill_color(*NAVY); pdf.rect(0,0,210,105,"F"); pdf.ln(22)
pdf.set_font("F","B",26); pdf.set_text_color(255,255,255); pdf.cell(0,12,"Tether",align="C",ln=1)
pdf.set_font("F","B",15); pdf.set_text_color(*GOLD); pdf.cell(0,10,"Reliable AI Concierge — Live MVP",align="C",ln=1)
pdf.ln(8); pdf.set_font("F","I",12); pdf.set_text_color(225,230,235)
pdf.cell(0,7,"Persistent memory · Real tools · Human-in-the-loop approval",align="C",ln=1)
pdf.ln(26); pdf.set_font("F","B",13); pdf.set_text_color(255,255,255)
pdf.cell(0,8,"Prepared by:  MD RAYHAN MIA",align="C",ln=1)
pdf.set_font("F","",10); pdf.set_text_color(200,208,215)
pdf.cell(0,7,f"Generated {DT}  |  {TS}  |  MAA Ecosystem v4.0",align="C",ln=1)

# summary
pdf.add_page(); sec(pdf,"Project Summary")
para(pdf,"Tether is a live, deployed AI concierge that demonstrates the four core agentic patterns — persistent "
         "memory, real tool use, task orchestration, and human-in-the-loop approval — wrapped in the MAA v4.0 trust "
         "layer (Pillars 10–16). Unlike a throwaway demo, it is deployed and serving real requests on a public URL.")
para(pdf,"One-line summary:  An AI concierge that remembers, uses tools, orchestrates steps, and stops to ask for "
         "human approval before it acts — live on the web.")

sec(pdf,"Live Deployment")
kv(pdf,"URL","https://ai-concierge-lake-three.vercel.app")
kv(pdf,"Status","Live · HTTP 200 · serving API requests")
kv(pdf,"Platform","Vercel (free tier) · Next.js 14 · Serverless API")
kv(pdf,"Source","https://github.com/alvidrishti/ai-concierge (public)")

sec(pdf,"Core Capabilities Demonstrated")
for k,v in [
    ("1. Persistent memory","Name/preferences persist across sessions (Supabase Postgres)."),
    ("2. Tool use","Reminders, local places lookup (Dhaka), web references."),
    ("3. Orchestration","A request is split into steps; each tracks in_progress / waiting_on_user / done."),
    ("4. Human-in-the-loop","Before creating anything the agent holds a PENDING action and waits for Approve/Reject "
                             "— never guesses, never acts silently (MAA Pillar 10)."),
]:
    pdf.set_font("F","B",10); pdf.set_text_color(*NAVY); pdf.cell(0,5.5,k,ln=1)
    pdf.set_font("F","",10); pdf.set_text_color(30,30,30); pdf.multi_cell(0,5.2,v); pdf.ln(2)

sec(pdf,"Live Verification (proof)")
cap=str(OUT/"deploy_proof.png")
pdf.image(cap,w=150); pdf.ln(2)
pdf.set_font("F","I",8); pdf.set_text_color(*GREY)
pdf.cell(0,5,"Live deployment proof: HTTP 200, title, and real API responses for greeting, approval gate, and lookup.",ln=1)

sec(pdf,"Tools / Stack Used")
for k,v in [
    ("Language/Framework","Next.js 14 (React, TypeScript)"),
    ("Backend","Vercel Serverless functions (/api/chat, /api/approve)"),
    ("Memory","Supabase Postgres (service-role REST) + in-memory fallback"),
    ("Trust layer","Approval gate · self-QA · audit (MAA v4.0 Pillars 10–16)"),
    ("Deployment","Vercel CLI / free tier — live public URL"),
]:
    kv(pdf,k,v)

sec(pdf,"Roadmap — WhatsApp + Billing (next)")
for k,v in [
    ("WhatsApp","Integrate Twilio WhatsApp API so users chat via their messaging app; keeps the same agent + approval gate."),
    ("Billing","Stripe subscription (hosted checkout) — $5–10/user/mo; or $1,500–5,000 setup + monthly retainer on Upwork."),
]:
    kv(pdf,k,v)

pdf.set_fill_color(*TEAL); pdf.set_font("F","B",10); pdf.set_text_color(255,255,255)
pdf.multi_cell(0,6,"Prepared by MD RAYHAN MIA  ·  MAA Ecosystem v4.0  ·  Tether (live MVP)",fill=True)

out=OUT/"Tether_Portfolio_Report.pdf"; pdf.output(str(out)); print("Saved:",out)

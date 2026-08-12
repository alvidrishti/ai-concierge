"use client";
// MAN — Professional Life Dashboard (main screen after login)
// Finance (monthly income/expense/har-lab with red/green), dhar/dhon ledger,
// daily plan, and a minimized chat button. Everything is a visible module.

import React, { useEffect, useState } from "react";
import { tr, LANGS, detectLang, saveLang, Lang } from "@/lib/i18n";

type Section = "finance" | "debts" | "plans" | "hotels" | "bookings" | "invoices" | "profile";

export default function LifeDashboard({ onOpenChat, onOpenDaily }: {
  onOpenChat: () => void;
  onOpenDaily: () => void;
}) {
  const [sec, setSec] = useState<Section>("finance");
  const [lang, setLang] = useState<Lang>(detectLang());
  const [msg, setMsg] = useState("");
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const today = new Date().toISOString().slice(0, 10);

  // finance
  const [fin, setFin] = useState<any[]>([]);
  const [finSum, setFinSum] = useState<any>(null);
  const [finType, setFinType] = useState<"income" | "expense">("expense");
  const [finCat, setFinCat] = useState("food");
  const [finAmt, setFinAmt] = useState("");
  const [finNote, setFinNote] = useState("");

  // debts
  const [debts, setDebts] = useState<any[]>([]);
  const [debtSum, setDebtSum] = useState<any>(null);
  const [dDir, setDDir] = useState<"lent" | "borrowed">("lent");
  const [dPerson, setDPerson] = useState("");
  const [dAmt, setDAmt] = useState("");
  const [dDate, setDDate] = useState("");
  const [dReason, setDReason] = useState("");

  // plans
  const [plans, setPlans] = useState<any[]>([]);
  const [planTitle, setPlanTitle] = useState("");

  // profile
  const [profile, setProfile] = useState<any>({});

  const [dirty, setDirty] = useState(0);

  async function api(path: string, opts?: any) {
    const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
    return r.json();
  }
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  async function loadAll() {
    const [fd, dd, pd, pf] = await Promise.all([
      api("/api/finance"), api("/api/debts"), api("/api/plans?date=" + today), api("/api/profile"),
    ]);
    if (fd.records) { setFin(fd.records); setFinSum(fd.summary); }
    if (dd.debts) { setDebts(dd.debts); setDebtSum(dd.summary); }
    if (pd.plans) setPlans(pd.plans);
    if (pd.profile) setProfile(pd.profile);
    else if (pf.profile) setProfile(pf.profile);
  }
  useEffect(() => { loadAll(); }, [dirty]);

  async function addFin() {
    const amt = parseFloat(finAmt);
    if (!isFinite(amt) || amt <= 0) { flash("Valid amount required"); return; }
    const d = await api("/api/finance", { method: "POST", body: JSON.stringify({ type: finType, category: finCat, amount: amt, note: finNote || undefined }) });
    if (d.ok) { flash("Added ✓"); setFinAmt(""); setFinNote(""); setDirty(dirty + 1); }
    else flash(d.error || "Error");
  }
  async function delFin(id: string) {
    const d = await api("/api/finance?id=" + id, { method: "DELETE" });
    if (d.ok) setDirty(dirty + 1);
  }

  async function addDebt() {
    const amt = parseFloat(dAmt);
    if (!isFinite(amt) || amt <= 0 || !dPerson.trim()) { flash("Person + amount required"); return; }
    const d = await api("/api/debts", { method: "POST", body: JSON.stringify({ direction: dDir, person: dPerson, amount: amt, date: dDate || today, reason: dReason }) });
    if (d.ok) { flash("Recorded ✓"); setDPerson(""); setDAmt(""); setDReason(""); setDirty(dirty + 1); }
    else flash(d.error || "Error");
  }
  async function settleDebt(id: string) {
    await api("/api/debts", { method: "PATCH", body: JSON.stringify({ id, action: "returned" }) });
    setDirty(dirty + 1);
  }

  async function addPlan() {
    if (!planTitle.trim()) { flash("Task required"); return; }
    await api("/api/plans", { method: "POST", body: JSON.stringify({ date: today, title: planTitle, category: "task" }) });
    setPlanTitle(""); setDirty(dirty + 1);
  }

  // Monthly finance summary with har-lab (red/green)
  const monthIncome = (finSum?.byCategory ? fin.filter((r) => r.type === "income" && (r.created_at || "").startsWith(month)).reduce((s, r) => s + Number(r.amount), 0) : 0);
  const monthExpense = fin.filter((r) => r.type === "expense" && (r.created_at || "").startsWith(month)).reduce((s, r) => s + Number(r.amount), 0);
  const harLabh = monthIncome - monthExpense;
  const isProfit = harLabh >= 0;

  // total balance (all time)
  const totalIncome = fin.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount), 0);
  const totalExpense = fin.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0);
  const totalBalance = totalIncome - totalExpense;

  const fmt = (n: number) => "৳" + (Math.round(n * 100) / 100).toLocaleString("en-IN");

  const nav: { id: Section; label: string; icon: string }[] = [
    { id: "finance", label: tr("nav_finance", lang), icon: "💰" },
    { id: "debts", label: tr("nav_debts", lang), icon: "🤝" },
    { id: "plans", label: tr("nav_plans", lang), icon: "📅" },
    { id: "invoices", label: tr("nav_invoices", lang), icon: "🧾" },
    { id: "hotels", label: tr("nav_hotels", lang), icon: "🏨" },
    { id: "bookings", label: tr("nav_bookings", lang), icon: "🛎️" },
    { id: "profile", label: tr("nav_profile", lang), icon: "👤" },
  ];

  return (
    <div className="dash">
      <div className="dash-top">
        <div className="dash-title">{tr("dash_title", lang)}</div>
        <div className="lang-switch">
          {LANGS.map((l) => (
            <button key={l.id} className={`lang-btn ${lang === l.id ? "active" : ""}`}
              onClick={() => { setLang(l.id); saveLang(l.id); }}>
              {l.native}
            </button>
          ))}
        </div>
        <span className="dash-welcome">{profile.full_name ? tr("welcome", lang) + ", " + profile.full_name.split(" ")[0] : ""}</span>
        {msg && <div className="dash-msg">{msg}</div>}
      </div>

      <div className="dash-nav">
        {nav.map((n) => (
          <button key={n.id} className={`dash-tab ${sec === n.id ? "active" : ""}`} onClick={() => setSec(n.id)}>
            {n.icon} {n.label}
          </button>
        ))}
        <button className="dash-tab" onClick={onOpenChat}>💬 {tr("nav_chat", lang)}</button>
        <button className="dash-tab" onClick={onOpenDaily}>🏠 {tr("nav_daily", lang)}</button>
      </div>

      <div className="dash-body">
        {/* ============ FINANCE (main) ============ */}
        {sec === "finance" && (
          <div className="dash-section">
            {/* Big summary cards */}
            <div className="fin-overview">
              <div className="fin-card income">
                <div className="fin-card-label">{tr("month_income", lang)}</div>
                <div className="fin-card-num">{fmt(monthIncome)}</div>
              </div>
              <div className="fin-card expense">
                <div className="fin-card-label">{tr("month_expense", lang)}</div>
                <div className="fin-card-num">{fmt(monthExpense)}</div>
              </div>
              <div className={`fin-card ${isProfit ? "good" : "bad"}`}>
                <div className="fin-card-label">{tr("har_labh", lang)}</div>
                <div className="fin-card-num">{isProfit ? "+" : "−"}{fmt(Math.abs(harLabh))}</div>
                <div className="fin-card-sub">{isProfit ? tr("good_profit", lang) : tr("risk_loss", lang)}</div>
              </div>
              <div className="fin-card">
                <div className="fin-card-label">{tr("total_balance", lang)}</div>
                <div className="fin-card-num" style={{ color: totalBalance >= 0 ? "var(--man-success)" : "var(--man-danger)" }}>
                  {totalBalance >= 0 ? "+" : "−"}{fmt(Math.abs(totalBalance))}
                </div>
              </div>
            </div>

            {/* add form */}
            <div className="dash-form-col" style={{ marginTop: 14 }}>
              <div className="dash-form-row">
                <div className="seg">
                  <button className={finType === "expense" ? "seg-on" : ""} onClick={() => { setFinType("expense"); setFinCat("food"); }}>Khoroch</button>
                  <button className={finType === "income" ? "seg-on" : ""} onClick={() => { setFinType("income"); setFinCat("freelance_income"); }}>Income</button>
                </div>
                <select className="dash-input" value={finCat} onChange={(e) => setFinCat(e.target.value)}>
                  {(finType === "income" ? ["freelance_income","salary","grant","other_income"] : ["food","transport","rent","internet","electricity","tools","medical","family","other_expense"]).map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                </select>
                <input className="dash-input" style={{ width: 100 }} placeholder="Taka" inputMode="decimal" value={finAmt} onChange={(e) => setFinAmt(e.target.value)} />
                <input className="dash-input grow" placeholder="Note (optional)" value={finNote} onChange={(e) => setFinNote(e.target.value)} />
                <button className="dash-btn" onClick={addFin}>Add</button>
              </div>
            </div>

            {/* recent records */}
            <h4>Recent</h4>
            <div className="dash-list">
              {fin.length === 0 && <p className="dash-empty">No records yet. Add your first income/expense above.</p>}
              {fin.slice(0, 15).map((r) => (
                <div key={r.id} className="dash-item">
                  <span className={`fin-type ${r.type}`}>{r.type === "income" ? "↑" : "↓"}</span>
                  <span className="dash-item-title">{r.category.replace(/_/g, " ")}{r.note ? " — " + r.note : ""}</span>
                  <span className={`fin-amt ${r.type}`}>{r.type === "income" ? "+" : "-"}{fmt(Number(r.amount))}</span>
                  <button className="dash-del" onClick={() => delFin(r.id)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ DHAR / DHON ============ */}
        {sec === "debts" && (
          <div className="dash-section">
            <h3>{tr("debts_title", lang)}</h3>
            <p className="dash-lead">{tr("debts_lead", lang)}</p>
            <div className="fin-overview" style={{ marginBottom: 12 }}>
              <div className="fin-card"><div className="fin-card-label">{tr("dhar_deya", lang)}</div><div className="fin-card-num" style={{ color: "var(--man-danger)" }}>{fmt(debtSum?.totalLent || 0)}</div></div>
              <div className="fin-card"><div className="fin-card-label">{tr("dhar_neya", lang)}</div><div className="fin-card-num" style={{ color: "var(--man-success)" }}>{fmt(debtSum?.totalBorrowed || 0)}</div></div>
            </div>
            <div className="dash-form-col" style={{ marginBottom: 12 }}>
              <div className="dash-form-row">
                <div className="seg">
                  <button className={dDir === "lent" ? "seg-on" : ""} onClick={() => setDDir("lent")}>{tr("lent_btn", lang)}</button>
                  <button className={dDir === "borrowed" ? "seg-on" : ""} onClick={() => setDDir("borrowed")}>{tr("borrow_btn", lang)}</button>
                </div>
              </div>
              <div className="dash-form-row">
                <input className="dash-input grow" placeholder={tr("person_label", lang)} value={dPerson} onChange={(e) => setDPerson(e.target.value)} />
                <input className="dash-input" style={{ width: 100 }} placeholder="Taka" inputMode="decimal" value={dAmt} onChange={(e) => setDAmt(e.target.value)} />
              </div>
              <div className="dash-form-row">
                <input className="dash-input" type="date" value={dDate} onChange={(e) => setDDate(e.target.value)} />
                <input className="dash-input grow" placeholder={tr("reason_label", lang)} value={dReason} onChange={(e) => setDReason(e.target.value)} />
                <button className="dash-btn" onClick={addDebt}>{tr("add", lang)}</button>
              </div>
            </div>
            <h4>{tr("records", lang)}</h4>
            <div className="dash-list">
              {debts.length === 0 && <p className="dash-empty">No dhar records yet.</p>}
              {debts.map((d) => (
                <div key={d.id} className="dash-item">
                  <span className={`dash-debt-dir ${d.direction}`}>{d.direction === "lent" ? "→" : "←"}</span>
                  <span className="dash-item-title"><b>{d.person}</b> · {d.date || "–"}{d.reason ? " · " + d.reason : ""}</span>
                  <span className={`fin-amt ${d.direction === "lent" ? "expense" : "income"}`}>{fmt(Number(d.amount))}</span>
                  {d.status === "open" ? (
                    <button className="dash-btn small" onClick={() => settleDebt(d.id)}>{d.direction === "lent" ? "Paisa pelsi" : "Ferot diyechi"}</button>
                  ) : <span className="ok">✓ returned</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ DAILY PLAN ============ */}
        {sec === "plans" && (
          <div className="dash-section">
            <h3>{tr("todays_plan", lang)} — {today}</h3>
            <div className="dash-form-row">
              <input className="dash-input grow" placeholder="Add a task for today" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPlan()} />
              <button className="dash-btn" onClick={addPlan}>{tr("add", lang)}</button>
            </div>
            <div className="dash-list">
              {plans.length === 0 && <p className="dash-empty">{tr("nothing_planned", lang)}</p>}
              {plans.map((p) => (
                <div key={p.id} className={`dash-item ${p.done ? "done" : ""}`}>
                  <span className="dash-item-time">{p.time || "–"}</span>
                  <span className="dash-item-title">{p.title}</span>
                  <button className="dash-check" onClick={() => { api("/api/plans", { method: "PATCH", body: JSON.stringify({ action: "toggle", id: p.id, done: !p.done }) }).then(() => setDirty(dirty + 1)); }}>{p.done ? "☑" : "☐"}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ INVOICES ============ */}
        {sec === "invoices" && (
          <div className="dash-section">
            <h3>Invoices & Bills</h3>
            <p className="dash-lead">Create customer bills & download PDF. (Full editor in Daily Life → Invoices.)</p>
            <button className="dash-btn" onClick={onOpenDaily}>Open invoice editor</button>
          </div>
        )}

        {/* ============ HOTELS ============ */}
        {sec === "hotels" && (
          <div className="dash-section">
            <h3>Hotels & Resorts</h3>
            <p className="dash-lead">List or browse properties. (Full editor in Daily Life → Hotels.)</p>
            <button className="dash-btn" onClick={onOpenDaily}>Manage hotels</button>
          </div>
        )}

        {/* ============ BOOKINGS ============ */}
        {sec === "bookings" && (
          <div className="dash-section">
            <h3>My Bookings</h3>
            <p className="dash-lead">Manage your stays in Daily Life → Bookings.</p>
            <button className="dash-btn" onClick={onOpenDaily}>Open bookings</button>
          </div>
        )}

        {/* ============ PROFILE ============ */}
        {sec === "profile" && (
          <div className="dash-section">
            <h3>Profile</h3>
            <p className="dash-lead">Edit name, address, account type in Daily Life → Profile.</p>
            <button className="dash-btn" onClick={onOpenDaily}>Edit profile</button>
          </div>
        )}
      </div>
    </div>
  );
}

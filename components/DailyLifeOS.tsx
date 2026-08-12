"use client";
// MAN — Personal Daily Life OS (web build, Phase 4 interim)
// Five primary tabs: TODAY · MONEY · PLAN · MAN · MORE.
// AI is the intelligence layer (MAN tab) — never the whole interface.
// All data is the authenticated user's own, fetched server-side via session.

import React, { useEffect, useState, useCallback } from "react";
import { ManMark } from "@/components/ManLogo";

type Tab = "today" | "money" | "plan" | "man" | "more";

interface FinRec { id: string; type: "income" | "expense"; category: string; amount: number; note?: string; created_at: string; }
interface DebtRec { id: string; direction: "lent" | "borrowed"; person: string; amount: number; date?: string; reason?: string; status: string; }
interface PlanRec { id: string; date: string; time?: string; title: string; category?: string; done: boolean; note?: string; }
interface MemItem { key: string; value: string; }
interface NoteRec { id: string; title: string; body?: string; category?: string; pinned: boolean; }
interface RepRec { id: string; debt_id: string; amount: number; date?: string; note?: string; }

// Finance categories accepted by the backend lib (kept aligned to avoid drift).
const INCOME_CATS = ["salary", "service_charge", "freelance_income", "grant", "other_income"];
const EXPENSE_CATS = ["rent", "electricity", "internet", "transport", "food", "tools", "marketing", "education", "medical", "family", "other_expense"];

const greeting = () => {
  const h = new Date().getHours();
  const bn = h < 5 ? "শুভ রাত্রি" : h < 12 ? "শুভ সকাল" : h < 16 ? "শুভ দুপুর" : h < 19 ? "শুভ সন্ধ্যা" : "শুভ রাত্রি";
  return bn;
};
const taka = (n: number) => "৳" + (n ?? 0).toLocaleString("en-IN");
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function DailyLifeOS({ auth, onOpenChat, onLogout }: {
  auth: { id: string; name: string; role: string };
  onOpenChat: () => void;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>("today");
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const flash = (t: string, x: string) => { setMsg({ type: t, text: x }); setTimeout(() => setMsg(null), 3000); };

  // TODAY data
  const [fin, setFin] = useState<FinRec[]>([]);
  const [debts, setDebts] = useState<DebtRec[]>([]);
  const [plans, setPlans] = useState<PlanRec[]>([]);
  const [mem, setMem] = useState<MemItem[]>([]);
  const [notes, setNotes] = useState<NoteRec[]>([]);
  const [reps, setReps] = useState<RepRec[]>([]);
  const [today, setToday] = useState<any>(null);

  // MONEY inputs
  const [fType, setFType] = useState<"income" | "expense">("expense");
  const [fCat, setFCat] = useState("food");
  const [fAmt, setFAmt] = useState("");
  const [fNote, setFNote] = useState("");
  const [dDir, setDDir] = useState<"lent" | "borrowed">("lent");
  const [dPerson, setDPerson] = useState("");
  const [dAmt, setDAmt] = useState("");
  const [dReason, setDReason] = useState("");

  // PLAN inputs
  const [pTitle, setPTitle] = useState("");
  const [pTime, setPTime] = useState("");
  const [pCat, setPCat] = useState("task");
  const [nTitle, setNTitle] = useState("");
  const [nBody, setNBody] = useState("");

  // MORE
  const [caps, setCaps] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [fbCat, setFbCat] = useState("general");
  const [fbMsg, setFbMsg] = useState("");

  const api = async (path: string, opts?: any) => {
    const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
    return r.json();
  };

  const load = useCallback(async () => {
    const [fd, dd, pd, md, nd, rd] = await Promise.all([
      api("/api/finance"), api("/api/debts"), api("/api/plans?date=" + todayStr()), api("/api/memory"),
      api("/api/notes"), api("/api/repayments"),
    ]);
    if (fd.records) setFin(fd.records);
    if (dd.debts) setDebts(dd.debts);
    if (pd.plans) setPlans(pd.plans);
    if (md.memory) setMem(md.memory);
    if (nd.notes) setNotes(nd.notes);
    if (rd.repayments) setReps(rd.repayments);
    const t = await api("/api/today");
    if (t.ok) setToday(t);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab !== "more") return;
    api("/api/capabilities").then((d) => d.capabilities && setCaps(d.capabilities));
    api("/api/profile").then((d) => d.profile && setProfile(d.profile));
  }, [tab]);

  // summary
  const income = fin.filter((f) => f.type === "income").reduce((s, f) => s + Number(f.amount), 0);
  const expense = fin.filter((f) => f.type === "expense").reduce((s, f) => s + Number(f.amount), 0);
  const month = todayStr().slice(0, 7);
  const mIncome = fin.filter((f) => f.type === "income" && f.created_at.startsWith(month)).reduce((s, f) => s + Number(f.amount), 0);
  const mExpense = fin.filter((f) => f.type === "expense" && f.created_at.startsWith(month)).reduce((s, f) => s + Number(f.amount), 0);
  const savings = mIncome - mExpense;
  const lent = debts.filter((d) => d.direction === "lent" && d.status === "open").reduce((s, d) => s + Number(d.amount), 0);
  const borrowed = debts.filter((d) => d.direction === "borrowed" && d.status === "open").reduce((s, d) => s + Number(d.amount), 0);
  const todayTasks = plans.filter((p) => !p.done);
  const todayExpense = fin.filter((f) => f.type === "expense" && f.created_at.startsWith(todayStr())).reduce((s, f) => s + Number(f.amount), 0);
  const todayIncome = fin.filter((f) => f.type === "income" && f.created_at.startsWith(todayStr())).reduce((s, f) => s + Number(f.amount), 0);

  const addFin = async () => {
    const amt = parseFloat(fAmt);
    if (!amt || amt <= 0) { flash("err", "Valid amount dite hobe"); return; }
    const d = await api("/api/finance", { method: "POST", body: JSON.stringify({ type: fType, category: fCat, amount: amt, note: fNote }) });
    if (d.record) { flash("ok", "Record added"); setFAmt(""); setFNote(""); await load(); }
    else flash("err", d.error || "Fail hoyeche");
  };
  const delFin = async (id: string) => { await api("/api/finance?id=" + id, { method: "DELETE" }); await load(); };

  const addDebt = async () => {
    const amt = parseFloat(dAmt);
    if (!amt || amt <= 0 || !dPerson.trim()) { flash("err", "Person o valid amount dite hobe"); return; }
    const d = await api("/api/debts", { method: "POST", body: JSON.stringify({ direction: dDir, person: dPerson, amount: amt, reason: dReason }) });
    if (d.debt) { flash("ok", "Debt saved"); setDPerson(""); setDAmt(""); setDReason(""); await load(); }
    else flash("err", d.error || "Fail hoyeche");
  };
  const settleDebt = async (id: string, action: string) => { await api("/api/debts", { method: "PATCH", body: JSON.stringify({ id, action }) }); await load(); };

  const addPlan = async () => {
    if (!pTitle.trim()) { flash("err", "Title dite hobe"); return; }
    const d = await api("/api/plans", { method: "POST", body: JSON.stringify({ date: todayStr(), time: pTime, title: pTitle, category: pCat }) });
    if (d.plan) { flash("ok", "Plan added"); setPTitle(""); setPTime(""); await load(); }
  };
  const togglePlan = async (id: string, done: boolean) => { await api("/api/plans", { method: "PATCH", body: JSON.stringify({ action: "toggle", id, done }) }); await load(); };
  const delPlan = async (id: string) => { await api("/api/plans?id=" + id, { method: "DELETE" }); await load(); };

  const delMem = async (key: string) => { await api("/api/memory?key=" + encodeURIComponent(key), { method: "DELETE" }); await load(); };

  const addNote = async () => {
    if (!nTitle.trim()) { flash("err", "Note title dite hobe"); return; }
    const d = await api("/api/notes", { method: "POST", body: JSON.stringify({ title: nTitle, body: nBody }) });
    if (d.note) { flash("ok", "Note saved"); setNTitle(""); setNBody(""); await load(); }
    else flash("err", d.error || "Fail hoyeche");
  };
  const delNote = async (id: string) => { await api("/api/notes?id=" + id, { method: "DELETE" }); await load(); };

  const addRep = async (debtId: string, amount: string) => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { flash("err", "Valid amount dite hobe"); return; }
    const d = await api("/api/repayments", { method: "POST", body: JSON.stringify({ debt_id: debtId, amount: amt }) });
    if (d.repayment) { flash("ok", "Repayment recorded"); await load(); }
    else flash("err", d.error || "Fail hoyeche");
  };

  const sendFeedback = async () => {
    if (!fbMsg.trim()) { flash("err", "Message dite hobe"); return; }
    const d = await api("/api/feedback", { method: "POST", body: JSON.stringify({ category: fbCat, message: fbMsg }) });
    if (d.ok) { flash("ok", "Feedback pathano hoyeche — dhonyobad!"); setFbMsg(""); }
    else flash("err", d.error || "Fail hoyeche");
  };

  return (
    <div className="os" style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "var(--man-bg)" }}>
      <style>{`
        .os .os-top { display:flex; align-items:center; gap:10px; padding:14px 18px; border-bottom:1px solid var(--man-border); background:var(--man-bg-2); }
        .os .os-brand { flex:1; display:flex; align-items:center; gap:10px; }
        .os .os-brand b { font-size:1.05rem; letter-spacing:-0.01em; }
        .os .os-brand span { font-size:.72rem; color:var(--man-text-muted); }
        .os .os-name { color:var(--man-primary); font-weight:600; font-size:.82rem; }
        .os .os-btn { background:none; border:1px solid var(--man-border); color:var(--man-text-muted); padding:7px 12px; border-radius:var(--radius-sm); cursor:pointer; font-size:.8rem; }
        .os .os-btn:hover { color:var(--man-text); border-color:var(--man-border-strong); }
        .os .os-tabs { display:flex; gap:4px; padding:10px 14px; background:var(--man-bg-2); border-bottom:1px solid var(--man-border); }
        .os .os-tab { flex:1; text-align:center; padding:11px 0; border:none; background:none; color:var(--man-text-muted); font-weight:600; font-size:.86rem; letter-spacing:.02em; cursor:pointer; border-radius:var(--radius-md); transition:all var(--speed) var(--ease); }
        .os .os-tab:hover { color:var(--man-text); background:var(--man-hover); }
        .os .os-tab.on { background:var(--man-grad); color:#0a0a0f; }
        .os .os-body { flex:1; overflow-y:auto; padding:20px 18px 28px; }
        .os .os-card { background:var(--man-surface); border:1px solid var(--man-border); border-radius:var(--radius-md); padding:16px 18px; margin-bottom:14px; }
        .os .os-card h3 { font-size:.76rem; text-transform:uppercase; letter-spacing:.1em; color:var(--man-text-muted); margin-bottom:12px; }
        .os .os-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; }
        .os .stat { background:var(--man-surface-2); border-radius:var(--radius-sm); padding:12px; }
        .os .stat .l { font-size:.7rem; color:var(--man-text-dim); text-transform:uppercase; letter-spacing:.06em; }
        .os .stat .v { font-size:1.25rem; font-weight:700; margin-top:4px; }
        .os .os-greet { font-size:1.4rem; font-weight:700; letter-spacing:-.01em; }
        .os .os-sub { color:var(--man-text-muted); margin-top:4px; font-size:.86rem; }
        .os .os-insight { background:linear-gradient(135deg,#102a4a,#14273f); border:1px solid var(--man-border-strong); }
        .os .os-insight b { color:var(--man-primary-2); }
        .os .row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
        .os input,.os select { padding:11px 12px; border-radius:var(--radius-sm); border:1px solid var(--man-border); background:var(--man-surface-2); color:var(--man-text); font-size:14px; min-width:0; }
        .os input:focus,.os select:focus { outline:none; border-color:var(--man-primary); }
        .os .in { flex:1; min-width:140px; }
        .os .os-cta { padding:11px 16px; border:none; border-radius:var(--radius-sm); background:var(--man-grad); color:#0a0a0f; font-weight:600; cursor:pointer; font-size:.86rem; }
        .os .os-ghost { padding:9px 12px; border:none; border-radius:var(--radius-sm); background:var(--man-hover); color:var(--man-text-muted); cursor:pointer; font-size:.78rem; }
        .os .os-ghost:hover { color:var(--man-text); }
        .os .os-list { list-style:none; margin-top:10px; }
        .os .os-list li { display:flex; align-items:center; gap:10px; padding:10px 4px; border-bottom:1px solid var(--man-border); }
        .os .os-list li:last-child { border-bottom:none; }
        .os .os-list .g { flex:1; }
        .os .os-list .t { font-size:.72rem; color:var(--man-text-dim); }
        .os .pill { font-size:.66rem; padding:3px 8px; border-radius:var(--radius-pill); background:var(--man-hover); color:var(--man-text-muted); }
        .os .del { background:none; border:none; color:var(--man-text-dim); cursor:pointer; font-size:.8rem; }
        .os .del:hover { color:var(--man-danger); }
        .os .done { text-decoration:line-through; color:var(--man-text-dim); }
        .os .os-flash { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); padding:10px 18px; border-radius:var(--radius-pill); font-size:.82rem; z-index:50; background:var(--man-surface-2); border:1px solid var(--man-border-strong); }
        .os .os-flash.ok { color:var(--man-success); }
        .os .os-flash.err { color:var(--man-danger); }
        .os .os-empty { color:var(--man-text-dim); font-size:.85rem; padding:6px 0; }
        .os .os-man { text-align:center; padding:30px 10px; }
        .os .os-man p { color:var(--man-text-muted); margin-top:6px; font-size:.9rem; max-width:420px; margin-inline:auto; }
        .os .os-man .os-cta { margin-top:18px; font-size:1rem; padding:14px 28px; border-radius:var(--radius-md); }
        .os .cap { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--man-border); font-size:.82rem; }
        .os .cap .st { font-size:.66rem; padding:2px 8px; border-radius:var(--radius-pill); }
        .os .cap .av { background:rgba(46,125,50,.2); color:#66bb6a; }
        .os .cap .pl { background:rgba(110,168,255,.15); color:#6ea8ff; }
        .os .cap .pr { background:rgba(212,175,55,.15); color:var(--man-primary-2); }
        .os .cap .re { background:rgba(255,152,0,.12); color:#ffb74d; }
        .os .cap .na { background:rgba(198,40,40,.12); color:#ef5350; }
        .os .man-link { color:var(--man-primary-2); text-decoration:none; }
        .os .man-link:hover { text-decoration:underline; }
        @media (max-width:600px){ .os .os-grid{grid-template-columns:repeat(2,1fr);} }
      `}</style>

      {/* top bar */}
      <div className="os-top">
        <div className="os-brand">
          <ManMark size={30} />
          <div>
            <b>MAN</b>
            <div style={{ display: "flex", gap: 8 }}><span>Personal Life Intelligence</span><span className="os-name">{auth?.name}</span></div>
          </div>
        </div>
        <button className="os-btn" onClick={onLogout}>Log out</button>
      </div>

      {/* tabs */}
      <nav className="os-tabs" aria-label="Primary">
        {(["today", "money", "plan", "man", "more"] as Tab[]).map((t) => (
          <button key={t} className={`os-tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>
            {t === "today" ? "TODAY" : t === "money" ? "MONEY" : t === "plan" ? "PLAN" : t === "man" ? "MAN" : "MORE"}
          </button>
        ))}
      </nav>

      <div className="os-body">
        {msg && <div className={`os-flash ${msg.type}`}>{msg.text}</div>}

        {/* ============ TODAY ============ */}
        {tab === "today" && (
          <>
            <div className="os-card">
              <div className="os-greet">{greeting()}, {auth?.name?.split("_").join(" ")} 👋</div>
              <div className="os-sub">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
            </div>

            <div className="os-card">
              <h3>Today snapshot</h3>
              <div className="os-grid">
                <div className="stat"><div className="l">Income today</div><div className="v" style={{ color: "var(--man-success)" }}>{taka(todayIncome)}</div></div>
                <div className="stat"><div className="l">Expense today</div><div className="v" style={{ color: "var(--man-danger)" }}>{taka(todayExpense)}</div></div>
                <div className="stat"><div className="l">This month savings</div><div className="v" style={{ color: savings >= 0 ? "var(--man-success)" : "var(--man-danger)" }}>{taka(savings)}</div></div>
                <div className="stat"><div className="l">Lent out</div><div className="v">{taka(lent)}</div></div>
              </div>
            </div>

            <div className="os-card">
              <h3>Your tasks today</h3>
              {todayTasks.length === 0 ? <div className="os-empty">Aaj kono kaj thik kora hoyni. Bhalo din!</div> : (
                <ul className="os-list">
                  {todayTasks.map((p) => (
                    <li key={p.id}>
                      <input type="checkbox" checked={!!p.done} onChange={() => togglePlan(p.id, !p.done)} />
                      <div className="g"><span className={p.done ? "done" : ""}>{p.title}</span><div className="t">{p.time || "no time"} · {p.category}</div></div>
                      <button className="del" onClick={() => delPlan(p.id)}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="os-card">
              <h3>Debts</h3>
              {debts.length === 0 ? <div className="os-empty">Kono dhar/dhon nei.</div> : (
                <ul className="os-list">
                  {debts.filter((d) => d.status === "open").map((d) => (
                    <li key={d.id}>
                      <div className="g"><b>{d.person}</b> <span className="pill">{d.direction === "lent" ? "lent" : "borrowed"}</span>
                        <div className="t">{d.reason || ""}</div></div>
                      <div className="v" style={{ fontWeight: 600 }}>{taka(d.amount)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="os-card os-insight">
              <h3 style={{ color: "var(--man-primary-2)" }}>MAN insight</h3>
              {today?.insight ? <div>{today.insight}</div> : <div>MONEY tab-e income/expense add korun — tahole MAN insight dekhate parbe.</div>}
            </div>

            {notes.length > 0 && (
              <div className="os-card">
                <h3>Notes</h3>
                <ul className="os-list">
                  {notes.slice(0, 5).map((n) => (
                    <li key={n.id}>
                      <div className="g"><b>{n.title}</b><div className="t">{n.body || ""}</div></div>
                      {n.pinned && <span className="pill">pinned</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* ============ MONEY ============ */}
        {tab === "money" && (
          <>
            <div className="os-card">
              <h3>Overview</h3>
              <div className="os-grid">
                <div className="stat"><div className="l">Total income</div><div className="v" style={{ color: "var(--man-success)" }}>{taka(income)}</div></div>
                <div className="stat"><div className="l">Total expense</div><div className="v" style={{ color: "var(--man-danger)" }}>{taka(expense)}</div></div>
                <div className="stat"><div className="l">Balance</div><div className="v">{taka(income - expense)}</div></div>
                <div className="stat"><div className="l">Lent · Borrowed</div><div className="v">{taka(lent)} · {taka(borrowed)}</div></div>
              </div>
            </div>

            <div className="os-card">
              <h3>Add income / expense</h3>
              <div className="row">
                <select value={fType} onChange={(e) => setFType(e.target.value as any)}>
                  <option value="expense">Expense</option><option value="income">Income</option>
                </select>
                <select value={fCat} onChange={(e) => setFCat(e.target.value)}>
                  {(fType === "income" ? INCOME_CATS : EXPENSE_CATS).map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                </select>
                <input className="in" type="number" placeholder="Amount (BDT)" value={fAmt} onChange={(e) => setFAmt(e.target.value)} />
                <input className="in" placeholder="Note (optional)" value={fNote} onChange={(e) => setFNote(e.target.value)} />
                <button className="os-cta" onClick={addFin}>Add</button>
              </div>
            </div>

            <div className="os-card">
              <h3>Recent records</h3>
              {fin.length === 0 ? <div className="os-empty">Kono record nei.</div> : (
                <ul className="os-list">
                  {fin.slice(0, 10).map((f) => (
                    <li key={f.id}>
                      <div className="g"><b>{f.category.replace(/_/g, " ")}</b> <span className="pill">{f.type}</span><div className="t">{f.note || f.created_at.slice(0, 10)}</div></div>
                      <div className="v" style={{ fontWeight: 600, color: f.type === "income" ? "var(--man-success)" : "var(--man-danger)" }}>{f.type === "income" ? "+" : "-"}{taka(f.amount)}</div>
                      <button className="del" onClick={() => delFin(f.id)}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="os-card">
              <h3>Debts / Dhar-Dhon</h3>
              <div className="row" style={{ marginBottom: 10 }}>
                <select value={dDir} onChange={(e) => setDDir(e.target.value as any)}>
                  <option value="lent">I lent (দিলাম)</option><option value="borrowed">I borrowed (নিলাম)</option>
                </select>
                <input className="in" placeholder="Person" value={dPerson} onChange={(e) => setDPerson(e.target.value)} />
                <input className="in" type="number" placeholder="Amount" value={dAmt} onChange={(e) => setDAmt(e.target.value)} />
                <input className="in" placeholder="Reason (optional)" value={dReason} onChange={(e) => setDReason(e.target.value)} />
                <button className="os-cta" onClick={addDebt}>Add</button>
              </div>
              {debts.length === 0 ? <div className="os-empty">Kono debt nei.</div> : (
                <ul className="os-list">
                  {debts.map((d) => {
                    const paid = reps.filter((r) => r.debt_id === d.id).reduce((s, r) => s + Number(r.amount), 0);
                    const remaining = Math.max(0, Number(d.amount) - paid);
                    return (
                      <li key={d.id}>
                        <div className="g"><b>{d.person}</b> <span className="pill">{d.direction}</span><span className="pill">{d.status}</span><div className="t">{d.reason || ""}</div></div>
                        <div className="v" style={{ fontWeight: 600 }}>{taka(d.amount)}</div>
                        {d.status === "open" && (
                          <>
                            <span className="pill">left {taka(remaining)}</span>
                            <input
                              style={{ width: 84, padding: "6px 8px" }}
                              type="number"
                              placeholder="repay"
                              onKeyDown={(e) => { if (e.key === "Enter") addRep(d.id, (e.target as HTMLInputElement).value); }}
                              onBlur={(e) => { if (e.target.value) { addRep(d.id, e.target.value); e.target.value = ""; } }}
                            />
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {reps.length > 0 && (
                <div style={{ marginTop: 12, fontSize: ".78rem", color: "var(--man-text-dim)" }}>
                  Recent repayments: {reps.slice(0, 4).map((r) => <span key={r.id} className="pill" style={{ marginLeft: 4 }}>{taka(r.amount)}</span>)}
                </div>
              )}
            </div>
          </>
        )}

        {/* ============ PLAN ============ */}
        {tab === "plan" && (
          <>
            <div className="os-card">
              <h3>Add to today plan</h3>
              <div className="row">
                <input className="in" placeholder="Task / title (Bangla or English)" value={pTitle} onChange={(e) => setPTitle(e.target.value)} />
                <input type="time" value={pTime} onChange={(e) => setPTime(e.target.value)} />
                <select value={pCat} onChange={(e) => setPCat(e.target.value)}>
                  {["task", "work", "health", "errand", "family", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button className="os-cta" onClick={addPlan}>Add</button>
              </div>
            </div>

            <div className="os-card">
              <h3>Today plan</h3>
              {plans.length === 0 ? <div className="os-empty">Aaj-er plan khali. Upore add korun.</div> : (
                <ul className="os-list">
                  {plans.map((p) => (
                    <li key={p.id}>
                      <input type="checkbox" checked={!!p.done} onChange={() => togglePlan(p.id, !p.done)} />
                      <div className="g"><span className={p.done ? "done" : ""}>{p.title}</span><div className="t">{p.time || "no time"} · {p.category}</div></div>
                      <button className="del" onClick={() => delPlan(p.id)}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="os-card">
              <h3>MAN planning tip</h3>
              <div className="os-sub">Natural language-e bolte paren, jemon: &ldquo;আগামীকাল সকাল ৮টায় বাজারে যেতে হবে&rdquo; — MAN tab-e gie oi bhabe bolle MAN structured plan banie dite pare.</div>
            </div>

            <div className="os-card">
              <h3>Notes</h3>
              <div className="row" style={{ marginBottom: 10 }}>
                <input className="in" placeholder="Note title" value={nTitle} onChange={(e) => setNTitle(e.target.value)} />
                <input className="in" placeholder="Body (optional)" value={nBody} onChange={(e) => setNBody(e.target.value)} />
                <button className="os-cta" onClick={addNote}>Add</button>
              </div>
              {notes.length === 0 ? <div className="os-empty">Kono note nei.</div> : (
                <ul className="os-list">
                  {notes.map((n) => (
                    <li key={n.id}>
                      <div className="g"><b>{n.title}</b><div className="t">{n.body || ""}</div></div>
                      {n.pinned && <span className="pill">pinned</span>}
                      <button className="del" onClick={() => delNote(n.id)}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {/* ============ MAN ============ */}
        {tab === "man" && (
          <div className="os-card os-man">
            <ManMark size={54} />
            <h2 style={{ marginTop: 10 }}>MAN AI</h2>
            <p>MAN apnar nijer data bujhe — khOrch, dhar, plan, notes, memory. Jiggesh korun: &ldquo;এই মাসে আমার খরচ কেন বেশি?&rdquo;, &ldquo;কার কাছে আমার টাকা পাওনা?&rdquo;, &ldquo;আগামীকাল আমার কী কী কাজ আছে?&rdquo;</p>
            <p style={{ fontSize: ".78rem", color: "var(--man-text-dim)" }}>MAN shudhu actual data diyei answer kore — data na thakle bole dey. Fake data create kore na.</p>
            <button className="os-cta" onClick={onOpenChat}>Open MAN conversation →</button>
          </div>
        )}

        {/* ============ MORE ============ */}
        {tab === "more" && (
          <>
            <div className="os-card">
              <h3>Your account</h3>
              <div className="os-sub">Name: <b>{auth?.name}</b> · Role: {auth?.role} · Plan: free</div>
              {profile && <div className="os-sub" style={{ marginTop: 4 }}>{profile.full_name && `Full name: ${profile.full_name}`}{profile.district && ` · ${profile.district}`}</div>}
            </div>

            <div className="os-card">
              <h3>Memory (what MAN remembers)</h3>
              {mem.length === 0 ? <div className="os-empty">Kono memory nei.</div> : (
                <ul className="os-list">
                  {mem.map((m) => (
                    <li key={m.key}>
                      <div className="g"><b>{m.key}</b><div className="t">{m.value}</div></div>
                      <button className="del" onClick={() => delMem(m.key)}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="os-card">
              <h3>Feedback</h3>
              <div className="row">
                <select value={fbCat} onChange={(e) => setFbCat(e.target.value)}>
                  {["bug", "feature_request", "ux_issue", "missing_capability", "general"].map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                </select>
                <input className="in" placeholder="Apnar message…" value={fbMsg} onChange={(e) => setFbMsg(e.target.value)} />
                <button className="os-cta" onClick={sendFeedback}>Send</button>
              </div>
            </div>

            <div className="os-card">
              <h3>Capabilities</h3>
              {caps.map((c) => (
                <div className="cap" key={c.id}>
                  <span>{c.name}</span>
                  <span className={`st ${c.status === "available" ? "av" : c.status === "future_pro" ? "pr" : c.status === "coming" ? "pl" : c.status === "requires_credential" ? "re" : "na"}`}>
                    {c.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { renderMarkdown } from "@/lib/markdown";
import { createVoice, VoiceController } from "@/lib/voice";
import ManLogo, { ManMark } from "@/components/ManLogo";

interface Msg { role: "user" | "assistant"; text: string; provider?: string; pendingAction?: any; }
interface MemItem { key: string; value: string; created_at?: string; }
interface Thread { id: string; title: string | null; updated_at?: string; }

const QUICK = [
  "Who made you?",
  "What can you do?",
  "Tell me about MD Rayhan Mia",
  "Remember that I prefer Bangla",
  "What do you remember about me?",
];

// ---- inline icons ----
const MicIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><line x1="12" y1="19" x2="12" y2="22"/></svg>);
const SendIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>);
const SpeakerIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>);
const MuteIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>);
const MemoryIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/></svg>);
const ChartIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>);
const LogoutIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>);
const PlusIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>);
const CopyIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>);
const RetryIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.7L3 8"/><path d="M3 3v5h5"/></svg>);
const MenuIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>);
const XIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>);
const CheckIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>);

export default function Page() {
  const [auth, setAuth] = useState<null | { id: string; name: string; role: string }>(null);
  const [view, setView] = useState<"login" | "chat">("login");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [memories, setMemories] = useState<MemItem[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [adminUsage, setAdminUsage] = useState<any>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [speakOn, setSpeakOn] = useState(false);
  const [loginMsg, setLoginMsg] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);

  // conversations (Phase 1)
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const voiceRef = useRef<VoiceController | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(t: string) => void>(() => {});
  const abortRef = useRef<AbortController | null>(null);
  const [loginName, setLoginName] = useState("");
  const [loginPass, setLoginPass] = useState("");

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages, loading, voiceStatus]);

  // restore session + voice + threads
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me");
        const d = await r.json();
        if (d.authenticated) {
          setAuth({ id: d.user.id, name: d.user.name, role: d.user.role });
          setView("chat");
          setMemories(d.memory || []);
          // onboarding per user (localStorage keyed by userId)
          if (!localStorage.getItem("man_onboarded_" + d.user.id)) setShowOnboarding(true);
        }
      } catch { /* offline */ }
      const v = createVoice((t) => { setVoiceStatus(""); sendRef.current(t); });
      if (v) { voiceRef.current = v; setVoiceSupported(true); }
      await loadThreads();
    })();
  }, []);

  async function loadThreads() {
    try {
      const r = await fetch("/api/conversations");
      const d = await r.json();
      setThreads(d.threads || []);
    } catch { /* ignore */ }
  }

  async function newChat() {
    setMessages([]); setActiveThread(null); setDrawerOpen(false);
  }

  async function openThread(t: Thread) {
    setDrawerOpen(false);
    const r = await fetch("/api/conversations/action", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "messages", threadId: t.id }) });
    const d = await r.json();
    setMessages((d.messages || []).map((m: any) => ({ role: m.role, text: m.content })));
    setActiveThread(t.id);
  }

  async function renameThread(t: Thread) {
    const title = prompt("Rename conversation", t.title || "");
    if (!title) return;
    await fetch("/api/conversations/action", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename", threadId: t.id, title }) });
    loadThreads();
  }

  async function deleteThread(t: Thread) {
    if (!confirm(`Delete "${t.title}"?`)) return;
    await fetch("/api/conversations/action", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", threadId: t.id }) });
    if (activeThread === t.id) { setMessages([]); setActiveThread(null); }
    loadThreads();
  }

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", text: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    setVoiceStatus("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/chat", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), threadId: activeThread }),
        signal: ctrl.signal });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", text: data.error || "Error." }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", text: data.text, provider: data.provider, pendingAction: data.pendingAction }]);
        if (data.threadId && data.threadId !== "new") { setActiveThread(data.threadId); }
        loadThreads();
        if (speakOn && data.text) { setVoiceStatus("speaking"); voiceRef.current?.speak(data.text); setTimeout(() => setVoiceStatus(""), 2500); }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") setMessages((m) => [...m, { role: "assistant", text: "Network error. Please try again." }]);
    } finally {
      setLoading(false); abortRef.current = null;
    }
  }, [loading, speakOn, activeThread]);
  sendRef.current = send;

  function stopGenerating() { abortRef.current?.abort(); setLoading(false); }

  async function regenerate(i: number) {
    // find the last user message before this assistant message and re-send
    const lastUser = [...messages.slice(0, i)].reverse().find((m) => m.role === "user");
    if (lastUser) { setMessages((m) => m.slice(0, i)); await send(lastUser.text); }
  }

  async function copyText(text: string, i: number) {
    try { await navigator.clipboard.writeText(text); } catch { /* fallback */ }
    setCopied(i); setTimeout(() => setCopied(null), 1500);
  }

  async function login() {
    if (!loginName.trim() || !loginPass) { setLoginMsg("Please enter a name and password."); return; }
    setLoginMsg("");
    const isAdmin = loginName.trim().toLowerCase() === "admin";
    const res = await fetch("/api/auth/login", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: loginName.trim(), password: loginPass, isAdmin }) });
    const d = await res.json();
    if (!res.ok) { setLoginMsg(d.error || "Login failed."); return; }
    setAuth({ id: d.userId, name: d.name, role: d.role });
    setView("chat");
    setInput("");
    if (!localStorage.getItem("man_onboarded_" + d.userId)) { setShowOnboarding(true); setOnboardStep(0); }
    loadThreads();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuth(null); setView("login"); setMessages([]); setMemories([]); setThreads([]);
  }

  async function refreshMemory() {
    const r = await fetch("/api/memory"); const d = await r.json();
    setMemories(d.memory || []);
  }
  async function deleteMemory(key?: string) {
    const q = key ? `?key=${encodeURIComponent(key)}` : "";
    await fetch(`/api/memory${q}`, { method: "DELETE" });
    refreshMemory();
  }
  async function loadAdminUsage() {
    const r = await fetch("/api/usage"); const d = await r.json();
    setAdminUsage(d); setShowAdmin(true);
  }

  async function decide(id: string, approved: boolean) {
    await fetch("/api/approve", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, approved }) });
    setMessages((m) => [...m, { role: "assistant", text: approved ? "✅ Approved — action saved." : "❌ Rejected — nothing saved." }]);
  }

  // ============ LOGIN ============
  if (view === "login") {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo"><ManLogo size={56} /></div>
          <h1>Personal AI Intelligence Agent</h1>
          <p className="auth-sub">A private intelligence companion created by MD RAYHAN MIA.</p>
          <div className="auth-field">
            <label htmlFor="login-name">Name</label>
            <input id="login-name" value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="Your name" autoComplete="username" />
          </div>
          <div className="auth-field">
            <label htmlFor="login-pass">Password</label>
            <input id="login-pass" type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} placeholder="••••••••" autoComplete="current-password" />
          </div>
          {loginMsg && <div className="auth-err" role="alert">{loginMsg}</div>}
          <button className="auth-btn" onClick={login}>Continue</button>
          <p className="auth-footer">Created by MD RAYHAN MIA<br/>Rangpur, Bangladesh</p>
        </div>
      </div>
    );
  }

  // ============ ONBOARDING (Phase 6) ============
  if (showOnboarding && auth) {
    const steps = [
      { t: "Chat with MAN", d: "Ask anything — MAN answers with real AI models." },
      { t: "Talk by voice", d: "Use the microphone to speak, and MAN can speak replies." },
      { t: "Memory", d: "Tell MAN to remember something and it will — only what you ask." },
    ];
    const s = steps[onboardStep];
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo"><ManLogo size={56} /></div>
          <h1>Welcome to MAN.</h1>
          <p className="auth-sub">Your personal AI intelligence agent.</p>
          <div className="onboard-box">
            <div className="onboard-title">{s.t}</div>
            <div className="onboard-desc">{s.d}</div>
            <div className="onboard-dots">{steps.map((_, i) => <span key={i} className={`dot ${i === onboardStep ? "active" : ""}`} />)}</div>
          </div>
          <button className="auth-btn" onClick={() => {
            if (onboardStep < steps.length - 1) setOnboardStep(onboardStep + 1);
            else { localStorage.setItem("man_onboarded_" + auth.id, "1"); setShowOnboarding(false); }
          }}>{onboardStep < steps.length - 1 ? "Next" : "Continue"}</button>
          <button className="skip-btn" onClick={() => { localStorage.setItem("man_onboarded_" + auth.id, "1"); setShowOnboarding(false); }}>Skip</button>
        </div>
      </div>
    );
  }

  // ============ CHAT ============
  const sidebar = (
    <div className="conv-sidebar">
      <button className="new-chat" onClick={newChat}><PlusIcon /> New Chat</button>
      {threads.length === 0 && <p className="muted" style={{ padding: "12px 4px", fontSize: 12 }}>No conversations yet.</p>}
      <div className="conv-list">
        {threads.map((t) => (
          <div key={t.id} className={`conv-item ${activeThread === t.id ? "active" : ""}`} onClick={() => openThread(t)}>
            <span className="conv-title">{t.title || "Chat"}</span>
            <span className="conv-actions" onClick={(e) => e.stopPropagation()}>
              <button title="Rename" aria-label="Rename conversation" onClick={() => renameThread(t)}>✎</button>
              <button title="Delete" aria-label="Delete conversation" onClick={() => deleteThread(t)}>🗑</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="app">
      <header className="topbar">
        <button className="icon-btn menu" aria-label="Conversations" onClick={() => setDrawerOpen((s) => !s)}>
          {drawerOpen ? <XIcon /> : <MenuIcon />}
        </button>
        <div className="brand">
          <ManMark size={34} />
          <div><div className="brand-name">MAN</div><div className="brand-sub">Personal AI Intelligence Agent</div></div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" title="Memory" aria-label="What MAN remembers"
            onClick={() => { setShowMemory((s) => !s); if (!showMemory) refreshMemory(); }}>
            <MemoryIcon /><span>Memory{memories.length ? ` (${memories.length})` : ""}</span>
          </button>
          {auth?.role === "admin" && (
            <button className="icon-btn" title="System" aria-label="Admin system status" onClick={loadAdminUsage}>
              <ChartIcon /><span>System</span>
            </button>
          )}
          <button className="icon-btn" title="Logout" aria-label="Log out" onClick={logout}><LogoutIcon /><span>Logout</span></button>
        </div>
      </header>

      {drawerOpen && (<div className="drawer-scrim" onClick={() => setDrawerOpen(false)} />)}
      <div className={`drawer ${drawerOpen ? "open" : ""}`}>{sidebar}</div>

      <div className="layout">
        <aside className="desktop-sidebar">{sidebar}</aside>

        <main className="main-col">
          {/* Memory center (Phase 3) */}
          {showMemory && (
            <aside className="panel" aria-live="polite">
              <div className="panel-title">Memory Center</div>
              {memories.length === 0 && <p className="muted">Nothing yet — tell MAN to remember something.</p>}
              {memories.map((m) => (
                <div key={m.key} className="mem-row">
                  <span><b>{m.key}:</b> {m.value}
                    {m.created_at && <span className="muted" style={{ display: "block", fontSize: 11 }}>{new Date(m.created_at).toLocaleString()}</span>}
                  </span>
                  <button className="mini" aria-label={`Delete memory ${m.key}`} onClick={() => deleteMemory(m.key)}>×</button>
                </div>
              ))}
              {memories.length > 0 && (
                confirmClear ? (
                  <div className="clear-confirm">
                    <span>Clear all memories?</span>
                    <button className="approve" onClick={async () => { await deleteMemory(); setConfirmClear(false); }}>Clear</button>
                    <button className="reject" onClick={() => setConfirmClear(false)}>Cancel</button>
                  </div>
                ) : (
                  <button className="ghost danger" onClick={() => setConfirmClear(true)}>Clear all</button>
                )
              )}
            </aside>
          )}

          {/* Admin system + usage dashboard (Phase 8/9) */}
          {showAdmin && adminUsage && (
            <aside className="panel">
              <div className="panel-title">MAN System</div>
              <div className="sys-grid">
                <span>AI Router <b className={adminUsage.system?.ai_router === "ok" ? "ok" : "warn"}>{adminUsage.system?.ai_router === "ok" ? "✓" : "!"}</b></span>
                <span>Database <b className={adminUsage.system?.database === "ok" ? "ok" : "warn"}>{adminUsage.system?.database === "ok" ? "✓" : "!"}</b></span>
                <span>Authentication <b className="ok">✓</b></span>
                <span>Memory <b className="ok">✓</b></span>
                <span>Voice <b className="ok">✓</b></span>
                <span>Rate Limit <b className="ok">✓</b></span>
              </div>
              <div className="panel-title" style={{ marginTop: 12 }}>Usage</div>
              <div className="sys-grid">
                <span>Messages today <b>{adminUsage.messagesToday ?? 0}</b></span>
                <span>Voice use <b>{adminUsage.voiceUsage ?? 0}</b></span>
                <span>Fallbacks <b>{adminUsage.fallbackCount ?? 0}</b></span>
                <span>Errors <b>{adminUsage.errors ?? 0}</b></span>
              </div>
              <div className="panel-title" style={{ marginTop: 12 }}>Providers</div>
              <div className="provider-list">
                {(adminUsage.provider_status || []).map((p: any) => (
                  <div key={p.name} className="provider-row">
                    <span>{p.name}</span><span className={p.status === "configured" ? "ok" : "dim"}>{p.status === "configured" ? "configured" : "not configured"}</span>
                  </div>
                ))}
              </div>
            </aside>
          )}

          <div className="chat" ref={chatRef}>
            {messages.length === 0 && (
              <div className="welcome">
                {voiceSupported ? (
                  <div className={`voice-orb ${voiceStatus === "listening" ? "listening" : voiceStatus === "speaking" ? "speaking" : ""}`} aria-live="polite"><MicIcon /></div>
                ) : (<div className="welcome-logo"><ManLogo size={56} /></div>)}
                <h2>Hello. I&apos;m MAN.</h2>
                <p className="lead">Your personal AI intelligence agent.</p>
                <p className="hint">Ask me anything, talk to me by voice, or ask about MD RAYHAN MIA.</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.role === "assistant" && (<div className="man-avatar"><ManMark size={28} /></div>)}
                <div className="msg-body">
                  <div className="bubble" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
                  {m.provider && (<div className="provider-tag"><span className="dot"></span>{m.provider}</div>)}
                  {m.pendingAction && (
                    <div className="approval" role="group" aria-label="Approval required">
                      <div className="approval-title">🔒 Approval required</div>
                      <div className="approval-detail">{m.pendingAction.summary}</div>
                      <div className="btn-row">
                        <button className="approve" onClick={() => decide(m.pendingAction.id, true)}>Approve</button>
                        <button className="reject" onClick={() => decide(m.pendingAction.id, false)}>Reject</button>
                      </div>
                    </div>
                  )}
                  {/* message controls (Phase 2) */}
                  <div className="msg-controls">
                    <button title="Copy" aria-label="Copy message" onClick={() => copyText(m.text, i)}>
                      {copied === i ? <CheckIcon /> : <CopyIcon />}{copied === i ? "Copied" : ""}
                    </button>
                    {m.role === "assistant" && <button title="Regenerate" aria-label="Regenerate response" onClick={() => regenerate(i)}><RetryIcon /></button>}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="msg assistant">
                <div className="man-avatar"><ManMark size={28} /></div>
                <div className="msg-body">
                  <div className="bubble typing"><span></span><span></span><span></span></div>
                  <button className="stop-btn" onClick={stopGenerating}>Stop</button>
                </div>
              </div>
            )}
          </div>

          {messages.length === 0 && (
            <div className="quick">{QUICK.map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}</div>
          )}

          <div className="composer">
            <div className="input-row">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder={voiceStatus === "listening" ? "Listening…" : "Message MAN…"}
                aria-label="Message MAN" />
              {voiceSupported && (
                <button className={`mic-btn ${voiceStatus === "listening" ? "listening" : voiceStatus === "speaking" ? "speaking" : ""}`}
                  title={voiceStatus === "listening" ? "Stop listening" : "Talk to MAN"}
                  aria-label={voiceStatus === "listening" ? "Stop voice input" : "Start voice input"} aria-live="polite"
                  onClick={() => {
                    if (voiceRef.current) {
                      if (voiceStatus === "listening") { voiceRef.current.stop(); setVoiceStatus(""); }
                      else { setVoiceStatus("listening"); voiceRef.current.start(); }
                    }
                  }}><MicIcon /></button>
              )}
              <button className="mic-btn" title={speakOn ? "Mute replies" : "Speak replies"} aria-label={speakOn ? "Turn off spoken replies" : "Turn on spoken replies"}
                onClick={() => setSpeakOn((s) => !s)}>{speakOn ? <SpeakerIcon /> : <MuteIcon />}</button>
              <button className="composer-btn" title="Send" aria-label="Send message" onClick={() => send(input)} disabled={loading || !input.trim()}><SendIcon /></button>
            </div>
            {voiceStatus === "listening" && (<div className="voice-status" role="status"><span className="pulse-dot"></span>Listening…</div>)}
            {voiceStatus === "speaking" && (<div className="voice-status" role="status"><span className="pulse-dot"></span>Speaking…</div>)}
            {loading && (<div className="voice-status" role="status"><span className="pulse-dot"></span>Thinking…</div>)}
            <div className="footer-hint">MAN · Personal AI Intelligence Agent · Created by MD RAYHAN MIA</div>
          </div>
        </main>
      </div>
    </div>
  );
}

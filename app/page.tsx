"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { renderMarkdown } from "@/lib/markdown";
import { createVoice, VoiceController } from "@/lib/voice";
import ManLogo, { ManMark } from "@/components/ManLogo";

interface Msg { role: "user" | "assistant"; text: string; provider?: string; pendingAction?: any; }
interface MemItem { key: string; value: string; }

const QUICK = [
  "Who made you?",
  "What can you do?",
  "Tell me about MD Rayhan Mia",
  "Remind me about my dentist appointment next Tuesday",
  "Find 3 coffee shops near Dhanmondi",
];

// inline icons (no external dependency)
const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);
const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" />
  </svg>
);
const SpeakerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" />
  </svg>
);
const MuteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4V5z" /><line x1="22" y1="9" x2="16" y2="15" /><line x1="16" y1="9" x2="22" y2="15" />
  </svg>
);
const MemoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01" />
  </svg>
);
const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" />
  </svg>
);
const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
  </svg>
);

export default function Page() {
  const [auth, setAuth] = useState<null | { id: string; name: string; role: string }>(null);
  const [view, setView] = useState<"login" | "chat">("login");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [memories, setMemories] = useState<MemItem[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  const [adminUsage, setAdminUsage] = useState<any>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState(""); // '' | listening | speaking
  const [speakOn, setSpeakOn] = useState(false);
  const [loginMsg, setLoginMsg] = useState("");
  const voiceRef = useRef<VoiceController | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(t: string) => void>(() => {});

  const [loginName, setLoginName] = useState("");
  const [loginPass, setLoginPass] = useState("");

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages, loading, voiceStatus]);

  // restore session + voice availability
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me");
        const d = await r.json();
        if (d.authenticated) {
          setAuth({ id: d.user.id, name: d.user.name, role: d.user.role });
          setView("chat");
          setMemories(d.memory || []);
          if (d.conversation?.length) {
            setMessages(d.conversation.map((c: any) => ({ role: c.role, text: c.content })));
          }
        }
      } catch { /* offline */ }
      const v = createVoice((t) => { setVoiceStatus(""); sendRef.current(t); });
      if (v) { voiceRef.current = v; setVoiceSupported(true); }
    })();
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", text: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    setVoiceStatus("");
    try {
      const res = await fetch("/api/chat", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }) });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", text: data.error || "Error." }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", text: data.text, provider: data.provider, pendingAction: data.pendingAction }]);
        if (speakOn && data.text) {
          setVoiceStatus("speaking");
          voiceRef.current?.speak(data.text);
          setTimeout(() => setVoiceStatus(""), 2500);
        }
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [loading, speakOn]);
  sendRef.current = send;

  async function login() {
    if (!loginName.trim() || !loginPass) { setLoginMsg("Please enter a name and password."); return; }
    setLoginMsg("");
    // Admin privileges are determined server-side. The UI never exposes an
    // "admin" control; the creator logs in by name and the server gates admin.
    // The name "admin" is a UI convention that asks the server to attempt an
    // admin session (still gated server-side against ADMIN_PASS, fail-closed).
    const isAdmin = loginName.trim().toLowerCase() === "admin";
    const res = await fetch("/api/auth/login", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: loginName.trim(), password: loginPass, isAdmin }) });
    const d = await res.json();
    if (!res.ok) { setLoginMsg(d.error || "Login failed."); return; }
    setAuth({ id: d.userId, name: d.name, role: d.role });
    setView("chat");
    setInput("");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuth(null); setView("login"); setMessages([]); setMemories([]);
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
    setAdminUsage(d);
  }
  async function decide(id: string, approved: boolean) {
    await fetch("/api/approve", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, approved }) });
    setMessages((m) => [...m, { role: "assistant", text: approved ? "✅ Approved — action saved." : "❌ Rejected — nothing saved." }]);
  }

  // ---------- LOGIN ----------
  if (view === "login") {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo"><ManLogo size={56} /></div>
          <h1>Personal AI Intelligence Agent</h1>
          <p className="auth-sub">A private intelligence companion created by MD RAYHAN MIA.</p>

          <div className="auth-field">
            <label htmlFor="login-name">Name</label>
            <input id="login-name" value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder="Your name" autoComplete="username" />
          </div>
          <div className="auth-field">
            <label htmlFor="login-pass">Password</label>
            <input id="login-pass" type="password" value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="••••••••" autoComplete="current-password" />
          </div>

          {loginMsg && <div className="auth-err" role="alert">{loginMsg}</div>}

          <button className="auth-btn" onClick={login}>Continue</button>

          <p className="auth-footer">Created by MD RAYHAN MIA<br/>Rangpur, Bangladesh</p>
        </div>
      </div>
    );
  }

  // ---------- CHAT ----------
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <ManMark size={34} />
          <div>
            <div className="brand-name">MAN</div>
            <div className="brand-sub">Personal AI Intelligence Agent</div>
          </div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" title="Memory"
            aria-label="What MAN remembers"
            onClick={() => { setShowMemory((s) => !s); if (!showMemory) refreshMemory(); }}>
            <MemoryIcon /><span>Memory{memories.length ? ` (${memories.length})` : ""}</span>
          </button>
          {auth?.role === "admin" && (
            <button className="icon-btn" title="Usage" aria-label="Admin usage"
              onClick={() => { setAdminUsage(null); loadAdminUsage(); }}>
              <ChartIcon /><span>Usage</span>
            </button>
          )}
          <button className="icon-btn" title="Logout" aria-label="Log out" onClick={logout}>
            <LogoutIcon /><span>Logout</span>
          </button>
        </div>
      </header>

      {(showMemory || adminUsage) && (
        <aside className="panel" aria-live="polite">
          {showMemory && (
            <div>
              <div className="panel-title">What MAN remembers</div>
              {memories.length === 0 && <p className="muted">Nothing yet — MAN learns from your conversations.</p>}
              {memories.map((m) => (
                <div key={m.key} className="mem-row">
                  <span><b>{m.key}:</b> {m.value}</span>
                  <button className="mini" aria-label={`Delete memory ${m.key}`}
                    onClick={() => deleteMemory(m.key)}>×</button>
                </div>
              ))}
              {memories.length > 0 && <button className="ghost" onClick={() => deleteMemory()}>Clear all</button>}
            </div>
          )}
          {adminUsage && (
            <div>
              <div className="panel-title">Usage (admin)</div>
              <p className="muted">Providers: {JSON.stringify(adminUsage.providers)}</p>
              <p className="muted">Per user: {JSON.stringify(adminUsage.byUser)}</p>
              <p className="muted">Errors: {adminUsage.errors}</p>
            </div>
          )}
        </aside>
      )}

      <div className="chat" ref={chatRef}>
        {messages.length === 0 && (
          <div className="welcome">
            {voiceSupported ? (
              <div className={`voice-orb ${voiceStatus === "listening" ? "listening" : voiceStatus === "speaking" ? "speaking" : ""}`}
                aria-live="polite">
                <MicIcon />
              </div>
            ) : (
              <div className="welcome-logo"><ManLogo size={56} /></div>
            )}
            <h2>Hello. I&apos;m MAN.</h2>
            <p className="lead">Your personal AI intelligence agent.</p>
            <p className="hint">Ask me anything, talk to me by voice, or ask about MD RAYHAN MIA.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === "assistant" && (
              <div className="man-avatar"><ManMark size={28} /></div>
            )}
            <div className="msg-body">
              <div className="bubble" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
              {m.provider && (
                <div className="provider-tag"><span className="dot"></span>{m.provider}</div>
              )}
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
            </div>
          </div>
        ))}

        {loading && (
          <div className="msg assistant">
            <div className="man-avatar"><ManMark size={28} /></div>
            <div className="msg-body"><div className="bubble typing"><span></span><span></span><span></span></div></div>
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <div className="quick">
          {QUICK.map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}
        </div>
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
              aria-label={voiceStatus === "listening" ? "Stop voice input" : "Start voice input"}
              aria-live="polite"
              onClick={() => {
                if (voiceRef.current) {
                  if (voiceStatus === "listening") { voiceRef.current.stop(); setVoiceStatus(""); }
                  else { setVoiceStatus("listening"); voiceRef.current.start(); }
                }
              }}>
              <MicIcon />
            </button>
          )}
          <button className="mic-btn" title={speakOn ? "Mute replies" : "Speak replies"}
            aria-label={speakOn ? "Turn off spoken replies" : "Turn on spoken replies"}
            onClick={() => setSpeakOn((s) => !s)}>
            {speakOn ? <SpeakerIcon /> : <MuteIcon />}
          </button>
          <button className="composer-btn" title="Send" aria-label="Send message"
            onClick={() => send(input)} disabled={loading || !input.trim()}>
            <SendIcon />
          </button>
        </div>

        {voiceStatus === "listening" && (
          <div className="voice-status" role="status"><span className="pulse-dot"></span>Listening…</div>
        )}
        {voiceStatus === "speaking" && (
          <div className="voice-status" role="status"><span className="pulse-dot"></span>Speaking…</div>
        )}

        <div className="footer-hint">MAN · Personal AI Intelligence Agent · Created by MD RAYHAN MIA</div>
      </div>
    </div>
  );
}

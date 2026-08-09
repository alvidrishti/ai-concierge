"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { renderMarkdown } from "@/lib/markdown";
import { createVoice, VoiceController } from "@/lib/voice";

interface Msg { role: "user" | "assistant"; text: string; provider?: string; pendingAction?: any; }
interface MemItem { key: string; value: string; }

const QUICK = [
  "Who made you?",
  "What can you do?",
  "Remind me about my dentist appointment next Tuesday at 3pm",
  "Find 3 coffee shops near Dhanmondi",
  "Tell me about MD Rayhan Mia",
];

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
  const [voiceStatus, setVoiceStatus] = useState("");
  const [speakOn, setSpeakOn] = useState(false);
  const [loginMsg, setLoginMsg] = useState("");
  const voiceRef = useRef<VoiceController | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // login form
  const [loginName, setLoginName] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages, loading]);

  // restore session + voice availability
  useEffect(() => {
    (async () => {
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
      const v = createVoice((t) => { setVoiceStatus(""); send(t); });
      if (v) { voiceRef.current = v; setVoiceSupported(true); }
    })();
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", text: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }) });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", text: data.error || "Error." }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", text: data.text, provider: data.provider, pendingAction: data.pendingAction }]);
        if (speakOn) voiceRef.current?.speak(data.text);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [loading, speakOn]);

  async function login() {
    if (!loginName || !loginPass) { setLoginMsg("Enter name and password"); return; }
    setLoginMsg("");
    const res = await fetch("/api/auth/login", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: loginName, password: loginPass, isAdmin }) });
    const d = await res.json();
    if (!res.ok) { setLoginMsg(d.error || "login failed"); return; }
    setAuth({ id: d.userId, name: d.name, role: d.role });
    setView("chat");
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

  if (view === "login") {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="brand-mark">MAN</div>
          <h1>Personal AI Intelligence Agent</h1>
          <p className="auth-sub">Created by MD Rayhan Mia · Rangpur, Bangladesh</p>
          <input value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="Name" />
          <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="Password" onKeyDown={(e)=>e.key==="Enter"&&login()} />
          <label className="admin-toggle"><input type="checkbox" checked={isAdmin} onChange={(e)=>setIsAdmin(e.target.checked)} /> Admin login</label>
          {loginMsg && <div className="auth-err">{loginMsg}</div>}
          <button onClick={login}>Enter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark small">MAN</span>
          <div>
            <div className="brand-name">MAN — Personal AI Intelligence Agent</div>
            <div className="brand-sub">by MD Rayhan Mia · Rangpur, Bangladesh</div>
          </div>
        </div>
        <div className="top-actions">
          <button onClick={() => { setShowMemory((s) => !s); if (!showMemory) refreshMemory(); }} className="ghost">🧠 Memory {memories.length ? `(${memories.length})` : ""}</button>
          {auth?.role === "admin" && <button onClick={() => { setAdminUsage(null); loadAdminUsage(); }} className="ghost">📊 Usage</button>}
          <button onClick={logout} className="ghost">Logout</button>
        </div>
      </header>

      {(showMemory || adminUsage) && (
        <aside className="panel">
          {showMemory && (
            <div>
              <div className="panel-title">🧠 What MAN remembers</div>
              {memories.length === 0 && <p className="muted">Nothing yet.</p>}
              {memories.map((m) => (
                <div key={m.key} className="mem-row">
                  <span><b>{m.key}:</b> {m.value}</span>
                  <button className="mini" onClick={() => deleteMemory(m.key)}>×</button>
                </div>
              ))}
              {memories.length > 0 && <button className="ghost" onClick={() => deleteMemory()}>Clear all</button>}
            </div>
          )}
          {adminUsage && (
            <div>
              <div className="panel-title">📊 Usage (admin)</div>
              <p className="muted">Providers: {JSON.stringify(adminUsage.providers)}</p>
              <p className="muted">Per user: {JSON.stringify(adminUsage.byUser)}</p>
              <p className="muted">Errors: {adminUsage.errors}</p>
            </div>
          )}
        </aside>
      )}

      <div className="chat" ref={chatRef}>
        {messages.length === 0 && (
          <div className="msg assistant">
            <div className="bubble">
              <div className="typing-bubble">Hello! I'm <b>MAN</b> — your personal AI intelligence agent. I remember your preferences, use real tools, and I always ask before I act. How can I help?</div>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
            {m.provider && <div className="tool-tag">⚡ {m.provider}</div>}
            {m.pendingAction && (
              <div className="approval">
                <div className="approval-title">🔒 Approval required</div>
                <div className="approval-detail">{m.pendingAction.summary}</div>
                <div className="btn-row">
                  <button className="approve" onClick={() => decide(m.pendingAction.id, true)}>Approve</button>
                  <button className="reject" onClick={() => decide(m.pendingAction.id, false)}>Reject</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && <div className="msg assistant"><div className="bubble typing"><span></span><span></span><span></span></div></div>}
      </div>

      <div className="quick">
        {QUICK.map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}
      </div>

      <div className="input-row">
        {voiceSupported && (
          <button className="mic" title="Voice input" onClick={() => {
            if (voiceRef.current) {
              if (voiceStatus === "listening") { voiceRef.current.stop(); setVoiceStatus(""); }
              else { setVoiceStatus("listening"); voiceRef.current.start(); }
            }
          }}>{voiceStatus === "listening" ? "🔴" : "🎤"}</button>
        )}
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder={voiceStatus === "listening" ? "Listening…" : "Message MAN…"} />
        <button onClick={() => send(input)} disabled={loading}>Send</button>
        <button className="mic" title="Speak replies" onClick={() => setSpeakOn((s) => !s)}>
          {speakOn ? "🔊" : "🔇"}
        </button>
      </div>
      {voiceStatus === "listening" && <div className="hint">Listening… speak now, or press the mic to stop.</div>}
      <div className="hint">MAN · Multi-user · Private · Voice + text · MD Rayhan Mia</div>
    </div>
  );
}

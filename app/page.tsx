"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  text: string;
  intent?: string;
  tool?: string;
  pendingAction?: any | null;
  pending?: any[];
}

const QUICK = [
  "Remind me about my dentist appointment next Tuesday at 3pm",
  "Find 3 coffee shops near Dhanmondi and compare",
  "I need to reschedule something — handle it",
  "Call me Ray",
  "What's on my schedule?",
  "help",
];

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", text: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.text, intent: data.intent, tool: data.tool, pendingAction: data.pendingAction },
      ]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", text: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  async function decide(id: string, approved: boolean) {
    await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, approved }),
    });
    // append confirmation
    setMessages((m) => [
      ...m,
      { role: "assistant", text: approved ? `✅ Approved — action saved.` : `❌ Rejected — nothing was saved.` },
    ]);
  }

  return (
    <div className="app">
      <div className="header">
        <h1>🤖 Tether — Reliable AI Concierge</h1>
        <div className="sub">Persistent memory · Real tools · Human-in-the-loop approval (MAA v4.0)</div>
        <span className="badge">Trust layer: approval gate · self-QA · audit</span>
      </div>

      <div className="chat" ref={chatRef}>
        {messages.length === 0 && (
          <div className="msg assistant">
            <div className="bubble">
              Hi! I'm your AI concierge. I remember your preferences, use real tools (reminders, local lookup),
              and — importantly — I stop and ask you before I act, instead of guessing.
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">
              {m.text}
              {m.tool && <span className="tool-tag">🛠 tool: {m.tool}</span>}
              {m.pendingAction && (
                <div className="approval">
                  <div className="approval-title">🔒 Approval required — {m.pendingAction.summary}</div>
                  <div className="approval-detail">{m.pendingAction.detail}</div>
                  <div className="btn-row">
                    <button className="approve" onClick={() => decide(m.pendingAction.id, true)}>Approve</button>
                    <button className="reject" onClick={() => decide(m.pendingAction.id, false)}>Reject</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="msg assistant"><div className="bubble">…</div></div>}
      </div>

      <div className="quick">
        {QUICK.map((q) => (
          <button key={q} onClick={() => send(q)}>{q}</button>
        ))}
      </div>

      <div className="input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Type a request…"
        />
        <button onClick={() => send(input)} disabled={loading}>Send</button>
      </div>
      <div className="hint">MVP demo — memory persists with Supabase; approval gate before every action.</div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { renderMarkdown } from "@/lib/markdown";
import { createVoice, VoiceController } from "@/lib/voice";
import ManLogo, { ManMark } from "@/components/ManLogo";
import ManSplash from "@/components/ManSplash";
import DailyLife from "@/components/DailyLife";
import LifeDashboard from "@/components/LifeDashboard";
import {
  IconPlus, IconSearch, IconWeather, IconMap, IconCalculator, IconClock,
  IconMemory, IconExport, IconMic, IconSend, IconSettings, IconLogout,
  IconMenu, IconX, IconEdit, IconTrash, IconCopy, IconRefresh, IconStop,
  IconGlobe, IconCheck, IconMessage, IconSparkle,
  IconFeedback, IconStar, IconSparkles, IconCalendar,
} from "@/components/icons";

interface Msg { role: "user" | "assistant"; text: string; provider?: string; pendingAction?: any; }
interface MemItem { key: string; value: string; created_at?: string; }
interface Thread { id: string; title: string | null; updated_at?: string; }

// Tools actually supported by the backend. Each has an icon, title, and a
// one-line subtle description for the command menu.
const TOOLS = [
  { id: "search", label: "Search", desc: "Search the web for current information", icon: IconSearch, prompt: "search the web for " },
  { id: "weather", label: "Weather", desc: "Check current conditions and forecasts", icon: IconWeather, prompt: "what is the weather in " },
  { id: "places", label: "Places", desc: "Find places and locations", icon: IconMap, prompt: "find 3 coffee shops near Dhanmondi" },
  { id: "calc", label: "Calculator", desc: "Do quick calculations", icon: IconCalculator, prompt: "what is " },
  { id: "reminder", label: "Reminder", desc: "Set a reminder for later", icon: IconClock, prompt: "remind me about " },
];

const WELCOME_CARDS = [
  { id: "research", label: "Research", desc: "Find and synthesize information", icon: IconSearch, prompt: "search the web for latest AI developments" },
  { id: "plan", label: "Plan", desc: "Turn an idea into an actionable plan", icon: IconMessage, prompt: "help me plan my day" },
  { id: "create", label: "Create", desc: "Write, design, or brainstorm", icon: IconSparkle, prompt: "help me brainstorm ideas for " },
  { id: "remember", label: "Remember", desc: "Save something for later", icon: IconMemory, prompt: "remember that I like " },
];

// Daypart-aware greeting (Bangla + English).
function greeting(): string {
  const h = new Date().getHours();
  const bn = h < 5 ? "শুভ রাত্রি" : h < 12 ? "শুভ সকাল" : h < 16 ? "শুভ দুপুর" : h < 19 ? "শুভ সন্ধ্যা" : "শুভ রাত্রি";
  const en = h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 16 ? "Good afternoon" : h < 19 ? "Good evening" : "Good night";
  const name = typeof window !== "undefined" ? (document.querySelector(".brand-name")?.textContent || "there") : "there";
  return `${bn} / ${en}, ${name}!`;
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return d.toLocaleDateString();
}

export default function Page() {
  const [auth, setAuth] = useState<null | { id: string; name: string; role: string }>(null);
  const [view, setView] = useState<"login" | "chat" | "life" | "dash">("login");
  const [chatOpen, setChatOpen] = useState(false);
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
  const [splash, setSplash] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  const [plusOpen, setPlusOpen] = useState(false);
  const [toolPrompt, setToolPrompt] = useState<string | null>(null);
  const [toolLabel, setToolLabel] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [fbCategory, setFbCategory] = useState("general");
  const [fbMessage, setFbMessage] = useState("");
  const [fbSent, setFbSent] = useState(false);
  const [sessOpen, setSessOpen] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [capsOpen, setCapsOpen] = useState(false);
  const [caps, setCaps] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [finOpen, setFinOpen] = useState(false);
  const [finRecords, setFinRecords] = useState<any[]>([]);
  const [finSummary, setFinSummary] = useState<any>(null);
  const [finType, setFinType] = useState<"income" | "expense">("expense");
  const [finCat, setFinCat] = useState("food");
  const [finAmount, setFinAmount] = useState("");
  const [finNote, setFinNote] = useState("");
  const [langPref, setLangPref] = useState("auto");
  const [tonePref, setTonePref] = useState("auto");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const voiceRef = useRef<VoiceController | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(t: string) => void>(() => {});
  const abortRef = useRef<AbortController | null>(null);
  const [loginName, setLoginName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages, loading, voiceStatus]);

  // Phase 6: show the brand splash only on the first load of this browser
  // session (skippable/non-annoying). sessionStorage so it's not replayed on
  // every navigation within the same session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let shown = false;
    try { shown = sessionStorage.getItem("man_splash_shown") === "1"; } catch {}
    if (!shown) {
      setSplash(true);
      try { sessionStorage.setItem("man_splash_shown", "1"); } catch {}
    }
  }, []);

  // Close the Tools menu on Escape or outside click. Only one overlay open at a time.
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") { setPlusOpen(false); setSettingsOpen(false); } }
    function onDown(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (plusOpen && !t.closest(".plus-wrap") && !t.closest(".sheet")) setPlusOpen(false);
      if (settingsOpen && !t.closest(".settings-panel") && !t.closest(".top-actions")) setSettingsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [plusOpen, settingsOpen]);

  // Focus/typing in composer closes the tools menu (and settings).
  function onComposerFocus() { setPlusOpen(false); setSettingsOpen(false); }

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me");
        const d = await r.json();
        if (d.authenticated) {
          setAuth({ id: d.user.id, name: d.user.name, role: d.user.role });
          setView("dash");
          setMemories(d.memory || []);
          setStats(d.stats || null);
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
    setMessages([]); setActiveThread(null); setDrawerOpen(false); setToolPrompt(null); setToolLabel(null); setPlusOpen(false);
  }

  async function openThread(t: Thread) {
    setDrawerOpen(false);
    const r = await fetch("/api/conversations/action", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "messages", threadId: t.id }) });
    const d = await r.json();
    setMessages((d.messages || []).map((m: any) => ({ role: m.role, text: m.content })));
    setActiveThread(t.id);
    setToolPrompt(null); setToolLabel(null);
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
    setToolPrompt(null); setToolLabel(null);
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
    const lastUser = [...messages.slice(0, i)].reverse().find((m) => m.role === "user");
    if (lastUser) { setMessages((m) => m.slice(0, i)); await send(lastUser.text); }
  }

  async function copyText(text: string, i: number) {
    try { await navigator.clipboard.writeText(text); } catch { /* fallback */ }
    setCopied(i); setTimeout(() => setCopied(null), 1500);
  }

  // Tool selection: activate a contextual input for the tool (not a text snippet).
  function selectTool(tool: typeof TOOLS[number]) {
    setPlusOpen(false);
    setToolLabel(tool.label);
    setToolPrompt(tool.prompt);
    // focus the composer input
    setTimeout(() => inputRef.current?.focus(), 50);
  }
  const inputRef = useRef<HTMLInputElement>(null);

  // Execute a tool with the user's completed input.
  function runTool() {
    if (!toolPrompt || !input.trim()) return;
    const full = toolPrompt.endsWith(" ") ? toolPrompt + input.trim() : toolPrompt + " " + input.trim();
    send(full);
  }

  async function login() {
    // Email mode: require email (the user's email is the identifier).
    const usingEmail = authMode === "email";
    if (usingEmail) {
      if (!loginEmail.trim() || !loginPass) { setLoginMsg("Please enter your email and password."); return; }
    } else if (!loginName.trim() || !loginPass) { setLoginMsg("Please enter a name and password."); return; }
    setLoginMsg("");
    const isAdmin = loginName.trim().toLowerCase() === "admin";
    const res = await fetch("/api/auth/login", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: loginName.trim(), email: usingEmail ? loginEmail.trim() : undefined, password: loginPass, isAdmin }) });
    const d = await res.json();
    if (!res.ok) { setLoginMsg(d.error || "Login failed."); return; }
    setAuth({ id: d.userId, name: d.name, role: d.role });
    setView("dash"); setInput("");
    if (!localStorage.getItem("man_onboarded_" + d.userId)) { setShowOnboarding(true); setOnboardStep(0); }
    loadThreads();
  }

  async function logout() {    await fetch("/api/auth/logout", { method: "POST" });
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
  async function exportChat() {
    const q = activeThread ? `?threadId=${encodeURIComponent(activeThread)}` : "";
    try {
      const res = await fetch(`/api/export${q}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "man-chat.md"; a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }
  async function decide(id: string, approved: boolean) {
    await fetch("/api/approve", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, approved }) });
    setMessages((m) => [...m, { role: "assistant", text: approved ? "✅ Approved — action saved." : "❌ Rejected — nothing saved." }]);
  }
  // Feedback submission (Phase 7) — post to /api/feedback.
  async function submitFeedback() {
    if (!fbMessage.trim()) { setLoginMsg("Write a message first."); return; }
    try {
      const res = await fetch("/api/feedback", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: fbCategory, message: fbMessage.trim() }) });
      const d = await res.json();
      if (d.ok) { setFbSent(true); setFbMessage(""); setTimeout(() => { setFbSent(false); setFeedbackOpen(false); }, 1800); }
      else setLoginMsg(d.error || "Couldn't submit.");
    } catch { setLoginMsg("Couldn't submit feedback."); }
  }
  // Sessions / device security (Phase 1) — list + revoke.
  async function loadSessions() {
    try {
      const res = await fetch("/api/auth/sessions");
      const d = await res.json();
      if (d.sessions) { setSessions(d.sessions); setSessOpen(true); }
    } catch {}
  }
  async function revokeSession(jti: string) {
    await fetch("/api/auth/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "revoke", jti }) });
    loadSessions();
  }
  async function revokeAllSessions() {
    await fetch("/api/auth/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "revoke_all" }) });
    setSessOpen(false); setAuth(null); setView("login");
  }
  // Capability registry view (Phase 3/14) — honest what MAN can/can't do.
  async function loadCapabilities() {
    try {
      const res = await fetch("/api/capabilities");
      const d = await res.json();
      if (d.capabilities) { setCaps(d.capabilities); setCapsOpen(true); }
    } catch {}
  }
  // Freelancer/SME finance companion (BD 2027).
  async function loadFinance() {
    try {
      const res = await fetch("/api/finance");
      const d = await res.json();
      if (d.records) { setFinRecords(d.records); setFinSummary(d.summary); setFinOpen(true); }
    } catch {}
  }
  async function addFinance() {
    const amt = parseFloat(finAmount);
    if (!isFinite(amt) || amt <= 0) { setLoginMsg("Enter a valid amount."); return; }
    try {
      const res = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: finType, category: finCat, amount: amt, note: finNote.trim() || undefined }) });
      const d = await res.json();
      if (d.ok) { setFinRecords(d.records); setFinSummary(d.summary); setFinAmount(""); setFinNote(""); setLoginMsg(""); }
      else setLoginMsg(d.error || "Couldn't add.");
    } catch { setLoginMsg("Couldn't add record."); }
  }
  async function deleteFinance(id: string) {
    const res = await fetch(`/api/finance?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const d = await res.json();
    if (d.ok) { setFinRecords((r) => r.filter((x) => x.id !== id)); setFinSummary(d.summary); }
  }
  const FIN_CATS: Record<string, string[]> = {
    income: ["freelance_income", "salary", "grant", "other_income"],
    expense: ["tools", "internet", "electricity", "transport", "food", "rent", "marketing", "education", "medical", "family", "other_expense"],
  };

  // ============ LOGIN ============
  const [authMode, setAuthMode] = useState<"landing"|"phone"|"email"|"forgot"|"signup">("landing");
  const [phoneInput, setPhoneInput] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [countryCode, setCountryCode] = useState("+880");
  // signup fields
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPass, setSignupPass] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  async function doSignup() {
    if (!signupName.trim()) { setLoginMsg("Enter your name."); return; }
    if (!signupPass) { setLoginMsg("Enter a password."); return; }
    if (signupPass.length < 6) { setLoginMsg("Password must be at least 6 characters."); return; }
    if (signupPass !== signupConfirm) { setLoginMsg("Passwords do not match."); return; }
    if (!signupEmail.trim() && !signupPhone.trim()) { setLoginMsg("Enter an email or phone."); return; }
    setAuthBusy(true); setLoginMsg("");
    const res = await fetch("/api/auth/signup", { method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ name: signupName.trim(), email: signupEmail.trim() || undefined, phone: signupPhone.trim() || undefined, password: signupPass }) });
    const d = await res.json();
    setAuthBusy(false);
    if (d.ok) {
      // Phase 1 account lifecycle. If signup returns authenticated (graceful
      // fallback when email delivery is unavailable), log the user in directly.
      if (d.authenticated) {
        setAuth({ id:d.userId, name:d.name, role:d.role }); setView("dash");
        if (!localStorage.getItem("man_onboarded_"+d.userId)){ setShowOnboarding(true); setOnboardStep(0);}
        loadThreads();
      } else if (d.needsVerification === "email") {
        setLoginMsg(d.message || "Check your email to verify your account, then log in.");
        setAuthMode("landing");
      } else if (d.needsVerification === "phone") {
        // Route to phone sign-in to complete OTP verification.
        setLoginMsg(d.message || "Verify your phone with a one-time code to activate your account.");
        setAuthMode("phone");
        setOtpRequested(false);
      } else {
        setAuth({ id:d.userId, name:d.name, role:d.role }); setView("dash");
        if (!localStorage.getItem("man_onboarded_"+d.userId)){ setShowOnboarding(true); setOnboardStep(0);}
        loadThreads();
      }
    } else setLoginMsg(d.error || "Couldn't create account.");
  }

  async function requestOtp() {
    if (!phoneInput.trim()) { setLoginMsg("Enter your phone number."); return; }
    setAuthBusy(true); setLoginMsg("");
    const res = await fetch("/api/auth/otp", { method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ action:"request", phone: phoneInput.trim(), countryCode }) });
    const d = await res.json();
    setAuthBusy(false);
    if (d.status === "sent") { setOtpRequested(true); setLoginMsg(""); }
    else setLoginMsg(d.message || "Couldn't send code. Please try again.");
  }

  async function verifyOtp() {
    if (!otpCode.trim()) { setLoginMsg("Enter the code from your phone."); return; }
    setAuthBusy(true); setLoginMsg("");
    const res = await fetch("/api/auth/otp", { method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ action:"verify", phone: phoneInput.trim(), countryCode, code: otpCode.trim() }) });
    const d = await res.json();
    setAuthBusy(false);
    if (d.authenticated) {
      setAuth({ id:d.userId, name:d.name, role:d.role }); setView("dash");
      if (!localStorage.getItem("man_onboarded_"+d.userId)){ setShowOnboarding(true); setOnboardStep(0);}
      loadThreads();
    } else setLoginMsg(d.error || "Invalid code.");
  }

  async function submitForgot() {
    if (!forgotEmail.trim()) { setLoginMsg("Enter your email."); return; }
    setAuthBusy(true); setLoginMsg("");
    const res = await fetch("/api/auth/forgot", { method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email: forgotEmail.trim() }) });
    const d = await res.json();
    setAuthBusy(false);
    if (d.ok) { setForgotSent(true); setLoginMsg(""); }
    else setLoginMsg(d.error || "Couldn't send reset email.");
  }

  if (view === "login") {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo"><ManLogo size={52} /></div>
          <h1>{authMode === "phone" ? "Enter your phone" : authMode === "email" ? "Email sign in" : authMode === "forgot" ? "Reset your password" : authMode === "signup" ? "Create your account" : "MAN"}</h1>
          <p className="auth-sub">
            {authMode === "phone" ? "We'll text you a verification code." :
             authMode === "email" ? "Sign in with your email account." :
             authMode === "forgot" ? "Enter your email and we'll send a reset link." :
             authMode === "signup" ? "Create a new MAN account." :
             "Personal AI Intelligence Agent"}
          </p>

          {authMode === "landing" && (
            <>
              <div className="auth-field">
                <label htmlFor="login-name">Name</label>
                <input id="login-name" value={loginName} onChange={(e)=>setLoginName(e.target.value)} placeholder="Your name" autoComplete="username" />
              </div>
              <div className="auth-field">
                <label htmlFor="login-pass">Password</label>
                <input id="login-pass" type="password" value={loginPass} onChange={(e)=>setLoginPass(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&login()} placeholder="••••••••" autoComplete="current-password" />
              </div>
              {loginMsg && <div className="auth-err" role="alert">{loginMsg}</div>}
              <button className="auth-btn" onClick={login}>Continue</button>

              <div className="auth-divider"><span>or continue with</span></div>
              <div className="social-btns">
                <button className="social-btn" onClick={()=>{setLoginMsg("");setAuthMode("phone");}}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg> Continue with phone
                </button>
                <button className="social-btn" onClick={()=>{setLoginMsg("");setAuthMode("email");}}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 6 10-6"/></svg> Continue with email
                </button>
              </div>
              <button className="link-btn" onClick={()=>{setLoginMsg("");setAuthMode("forgot");}}>Forgot password?</button>
              <button className="link-btn" onClick={()=>{setLoginMsg("");setAuthMode("signup");}}>Create account</button>
            </>
          )}

          {authMode === "phone" && (
            <>
              {!otpRequested ? (
                <>
                  <div className="auth-field">
                    <label htmlFor="phone-input">Phone number</label>
                    <div className="phone-row">
                      <select value={countryCode} onChange={(e)=>setCountryCode(e.target.value)} className="cc-select" aria-label="Country code">
                        <option value="+880">🇧🇩 +880</option><option value="+91">+91</option><option value="+44">+44</option><option value="+1">+1</option>
                      </select>
                      <input id="phone-input" value={phoneInput} onChange={(e)=>setPhoneInput(e.target.value)} placeholder="1XXXXXXXXX" inputMode="tel" />
                    </div>
                  </div>
                  {loginMsg && <div className="auth-err" role="alert">{loginMsg}</div>}
                  <button className="auth-btn" onClick={requestOtp} disabled={authBusy}>{authBusy ? "Sending…" : "Send code"}</button>
                  <button className="link-btn" onClick={()=>{setLoginMsg("");setAuthMode("landing");}}>Back</button>
                </>
              ) : (
                <>
                  <div className="auth-field">
                    <label htmlFor="otp-input">Verification code</label>
                    <input id="otp-input" value={otpCode} onChange={(e)=>setOtpCode(e.target.value)} placeholder="6-digit code" inputMode="numeric" />
                  </div>
                  {loginMsg && <div className="auth-err" role="alert">{loginMsg}</div>}
                  <button className="auth-btn" onClick={verifyOtp} disabled={authBusy}>{authBusy ? "Verifying…" : "Verify & continue"}</button>
                  <button className="link-btn" onClick={()=>{setLoginMsg("");setOtpRequested(false);}}>Change number</button>
                </>
              )}
            </>
          )}

          {authMode === "email" && (
            <>
              <div className="auth-field">
                <label htmlFor="login-email">Email</label>
                <input id="login-email" type="email" value={loginEmail} onChange={(e)=>setLoginEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </div>
              <div className="auth-field">
                <label htmlFor="login-pass">Password</label>
                <input id="login-pass" type="password" value={loginPass} onChange={(e)=>setLoginPass(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&login()} placeholder="••••••••" autoComplete="current-password" />
              </div>
              {loginMsg && <div className="auth-err" role="alert">{loginMsg}</div>}
              <button className="auth-btn" onClick={login}>Continue</button>
              <button className="link-btn" onClick={()=>{setLoginMsg("");setAuthMode("landing");}}>Back</button>
            </>
          )}

          {authMode === "forgot" && (
            <>
              {!forgotSent ? (
                <>
                  <div className="auth-field">
                    <label htmlFor="forgot-email">Email</label>
                    <input id="forgot-email" type="email" value={forgotEmail} onChange={(e)=>setForgotEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                  {loginMsg && <div className="auth-err" role="alert">{loginMsg}</div>}
                  <button className="auth-btn" onClick={submitForgot} disabled={authBusy}>{authBusy ? "Sending…" : "Send reset link"}</button>
                  <button className="link-btn" onClick={()=>{setLoginMsg("");setAuthMode("landing");}}>Back</button>
                </>
              ) : (
                <>
                  <div className="auth-ok">Reset link sent. Check your inbox.</div>
                  <button className="link-btn" onClick={()=>{setLoginMsg("");setForgotSent(false);setAuthMode("landing");}}>Back to login</button>
                </>
              )}
            </>
          )}

          {authMode === "signup" && (
            <>
              <div className="auth-field">
                <label htmlFor="signup-name">Name</label>
                <input id="signup-name" value={signupName} onChange={(e)=>setSignupName(e.target.value)} placeholder="Your full name" autoComplete="name" />
              </div>
              <div className="auth-field">
                <label htmlFor="signup-email">Email <span className="optional">(optional)</span></label>
                <input id="signup-email" type="email" value={signupEmail} onChange={(e)=>setSignupEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </div>
              <div className="auth-field">
                <label htmlFor="signup-phone">Phone <span className="optional">(optional)</span></label>
                <input id="signup-phone" value={signupPhone} onChange={(e)=>setSignupPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" autoComplete="tel" />
              </div>
              <div className="auth-field">
                <label htmlFor="signup-pass">Password</label>
                <input id="signup-pass" type="password" value={signupPass} onChange={(e)=>setSignupPass(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
              </div>
              <div className="auth-field">
                <label htmlFor="signup-confirm">Confirm password</label>
                <input id="signup-confirm" type="password" value={signupConfirm} onChange={(e)=>setSignupConfirm(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&doSignup()} placeholder="Re-enter password" autoComplete="new-password" />
              </div>
              {loginMsg && <div className="auth-err" role="alert">{loginMsg}</div>}
              <button className="auth-btn" onClick={doSignup} disabled={authBusy}>{authBusy ? "Creating…" : "Create account"}</button>
              <button className="link-btn" onClick={()=>{setLoginMsg("");setAuthMode("landing");}}>Back</button>
            </>
          )}

          <p className="auth-footer">Created by MD RAYHAN MIA</p>
        </div>
      </div>
    );
  }

  // ============ ONBOARDING ============
  if (showOnboarding && auth) {
    const steps = [
      { t: "Chat with MAN", d: "Ask anything — MAN answers with real AI models." },
      { t: "Talk by voice", d: "Use the microphone to speak, and MAN can speak replies." },
      { t: "Memory", d: "Tell MAN to remember something — only what you ask." },
    ];
    const s = steps[onboardStep];
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo"><ManLogo size={52} /></div>
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

  // ============ SIDEBAR ============
  const sidebar = (
    <div className="sidebar">
      <div className="sidebar-brand"><ManMark size={26} /> <span>MAN</span></div>
      <button className="new-conv" onClick={newChat}><IconPlus /> New conversation</button>
      <div className="sidebar-label">Recent</div>
      <div className="conv-list">
        {threads.length === 0 && <div className="sidebar-empty">No conversations yet</div>}
        {threads.map((t) => (
          <div key={t.id} className={`conv-item ${activeThread === t.id ? "active" : ""}`} onClick={() => openThread(t)}>
            <span className="conv-title">{t.title || "Chat"}</span>
            <span className="conv-time">{relativeTime(t.updated_at)}</span>
            <span className="conv-actions" onClick={(e) => e.stopPropagation()}>
              <button title="Rename" aria-label="Rename" onClick={() => renameThread(t)}><IconEdit size={14} /></button>
              <button title="Delete" aria-label="Delete" onClick={() => deleteThread(t)}><IconTrash size={14} /></button>
            </span>
          </div>
        ))}
      </div>
      <div className="sidebar-foot">
        <button className="side-item" onClick={() => setView("life")}><IconCalendar /> Daily Life</button>
        <button className="side-item" onClick={() => { setShowMemory((s) => !s); if (!showMemory) refreshMemory(); }}><IconMemory /> Memory</button>
        <button className="side-item" onClick={() => setFeedbackOpen(true)}><IconFeedback /> Feedback</button>
        {auth?.role === "admin" && <button className="side-item" onClick={loadAdminUsage}><IconMessage /> Usage</button>}
        <button className="side-item" onClick={logout}><IconLogout /> Log out</button>
      </div>
    </div>
  );

  // Main Professional Life Dashboard (lands after login). Chat is a small FAB.
  if (view === "dash") {
    return (
      <div className="app">
        <main className="main-col" style={{ minHeight: "100vh" }}>
          <LifeDashboard
            onOpenChat={() => setView("chat")}
            onOpenDaily={() => setView("life")}
          />
          {/* minimized chat button */}
          <button className="chat-fab" onClick={() => setView("chat")} title="Chat with MAN" aria-label="Open chat">
            <IconMessage size={20} />
          </button>
        </main>
      </div>
    );
  }

  if (view === "life") {
    return (
      <div className="app">
        <main className="main-col" style={{ minHeight: "100vh" }}>
          <DailyLife onBack={() => setView("dash")} />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      {/* mobile drawer */}
      {drawerOpen && (<div className="drawer-scrim" onClick={() => setDrawerOpen(false)} />)}
      <div className={`drawer ${drawerOpen ? "open" : ""}`}>{sidebar}</div>
      <aside className="desktop-sidebar">{sidebar}</aside>

      <main className="main-col">
        <header className="topbar">
          <button className="icon-btn menu" aria-label="Conversations" onClick={() => setDrawerOpen((s) => !s)}>
            {drawerOpen ? <IconX /> : <IconMenu />}
          </button>
          <div className="brand">
            <ManMark size={26} />
            <div>
              <div className="brand-name">MAN</div>
              <div className="brand-sub">Personal AI Intelligence Agent <span className="online-dot" title="Online"></span></div>
            </div>
          </div>
          <button className="dash-back" onClick={() => setView("dash")} title="Back to Dashboard">
            <IconCalendar size={15} /> Dashboard
          </button>
          <div className="top-actions">
            <button className="pro-chip" onClick={() => setSubOpen(true)} title="Upgrade to Pro">
              <IconSparkles size={14} /> Pro
            </button>
            <button className="icon-btn" title="Feedback" aria-label="Feedback" onClick={() => setFeedbackOpen(true)}>
              <IconFeedback />
            </button>
            <button className="icon-btn" title="Memory" aria-label="Memory" onClick={() => { setShowMemory((s) => !s); if (!showMemory) refreshMemory(); }}>
              <IconMemory />
            </button>
            <button className="icon-btn" title="Settings" aria-label="Settings" onClick={() => setSettingsOpen((s) => !s)}>
              <IconSettings />
            </button>
          </div>
        </header>

        {settingsOpen && (
          <aside className="panel settings-panel">
            <div className="panel-title">Personalization</div>
            <div className="setting-group">
              <div className="setting-label">Language</div>
              <div className="seg">
                {[["auto","Auto"],["en","English"],["bn","বাংলা"]].map(([v, l]) => (
                  <button key={v} className={langPref === v ? "seg-on" : ""} onClick={() => { setLangPref(v); if (v === "bn") send("set language bangla"); else if (v === "en") send("set language english"); }}>{l}</button>
                ))}
              </div>
            </div>
            <div className="setting-group">
              <div className="setting-label">Response style</div>
              <div className="seg">
                {[["auto","Auto"],["casual","Casual"],["professional","Professional"]].map(([v, l]) => (
                  <button key={v} className={tonePref === v ? "seg-on" : ""} onClick={() => { setTonePref(v); if (v === "casual") send("be casual"); else if (v === "professional") send("be professional"); }}>{l}</button>
                ))}
              </div>
            </div>
            <div className="panel-title" style={{ marginTop: 12 }}>Account</div>
            <div className="setting-group">
              <button className="action-row" onClick={() => { setSettingsOpen(false); loadFinance(); }}>
                <IconCalculator size={16} /> <span>Freelancer finance</span>
              </button>
              <button className="action-row" onClick={() => { setSettingsOpen(false); loadCapabilities(); }}>
                <IconGlobe size={16} /> <span>What MAN can do</span>
              </button>
              <button className="action-row" onClick={() => { setSettingsOpen(false); loadSessions(); }}>
                <IconSettings size={16} /> <span>Security &amp; sessions</span>
              </button>
              <button className="action-row" onClick={() => { setSettingsOpen(false); setFeedbackOpen(true); }}>
                <IconFeedback size={16} /> <span>Send feedback</span>
              </button>
              <button className="action-row" onClick={() => { setSettingsOpen(false); setSubOpen(true); }}>
                <IconSparkles size={16} /> <span>Upgrade to Pro</span>
              </button>
            </div>
          </aside>
        )}

        {feedbackOpen && (
          <div className="modal-overlay" onClick={() => setFeedbackOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title">Send feedback</div>
              {fbSent ? (
                <p className="auth-ok">Thanks! Your feedback was received. 🙏</p>
              ) : (
                <>
                  <label className="setting-label">Type</label>
                  <select className="cc-select" style={{ width: "100%" }} value={fbCategory} onChange={(e) => setFbCategory(e.target.value)}>
                    <option value="bug">Bug</option>
                    <option value="wrong_answer">Wrong answer</option>
                    <option value="missing_capability">Missing capability</option>
                    <option value="feature_request">Feature request</option>
                    <option value="ux_issue">UX / UI issue</option>
                    <option value="safety">Safety / security</option>
                    <option value="general">General</option>
                  </select>
                  <textarea className="fb-input" rows={4} placeholder="Tell MAN what we can improve…" value={fbMessage} onChange={(e) => setFbMessage(e.target.value)} />
                  {loginMsg && <div className="auth-err" role="alert">{loginMsg}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className="approve" onClick={submitFeedback}>Submit</button>
                    <button className="reject" onClick={() => setFeedbackOpen(false)}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {subOpen && (
          <div className="modal-overlay" onClick={() => setSubOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title"><IconSparkles size={18} /> MAN Pro</div>
              <p className="muted">MAN Pro unlocks higher limits and premium capabilities as they launch.</p>
              <ul style={{ margin: "12px 0 12px 20px", fontSize: 14, lineHeight: 1.7 }}>
                <li>More daily messages</li>
                <li>Freelancer finance &amp; daily-life tools (included in Free)</li>
                <li>Image &amp; video generation (coming)</li>
                <li>Advanced tools &amp; premium models</li>
                <li>Priority support</li>
              </ul>
              <div className="pro-price">৳149 / month <span className="pro-price-note">(est.) — bKash / Nagad / card</span></div>
              <div className="pay-methods">
                <button className="pay-method" onClick={() => setLoginMsg("bKash payment requires merchant account setup — coming soon.")}>bKash</button>
                <button className="pay-method" onClick={() => setLoginMsg("Nagad payment requires merchant account setup — coming soon.")}>Nagad</button>
                <button className="pay-method" onClick={() => setLoginMsg("Card payment (Stripe) requires merchant setup — coming soon.")}>Card</button>
              </div>
              {loginMsg && <div className="auth-err" role="alert">{loginMsg}</div>}
              <div className="auth-err" role="alert">Live billing needs a payment provider (bKash/Nagad merchant or Stripe) — not yet connected.</div>
              <button className="reject" style={{ marginTop: 8 }} onClick={() => setSubOpen(false)}>Close</button>
            </div>
          </div>
        )}

        {sessOpen && (
          <div className="modal-overlay" onClick={() => setSessOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title">Security &amp; sessions</div>
              {sessions.length === 0 && <p className="muted">No active sessions.</p>}
              {sessions.map((s) => (
                <div key={s.jti} className="session-row">
                  <span className="session-device">{s.device ? s.device.slice(0, 40) : "Unknown device"}</span>
                  <span className="session-ts">{s.last_seen_at ? "active " + relativeTime(s.last_seen_at) : "recent"}</span>
                  {s.current && <span className="ok">(current)</span>}
                  {!s.revoked && <button className="mini" onClick={() => revokeSession(s.jti)}>Revoke</button>}
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="ghost danger" onClick={revokeAllSessions}>Log out all devices</button>
                <button className="reject" onClick={() => setSessOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {capsOpen && (
          <div className="modal-overlay" onClick={() => setCapsOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title">What MAN can do</div>
              <p className="muted">Honest capability status — what is live now vs. planned.</p>
              <div className="caps-list">
                {caps.map((c: any) => (
                  <div key={c.id} className={`cap-row ${c.status}`}>
                    <div className="cap-name"><b>{c.name}</b> <span className={`cap-status ${c.status}`}>{c.status}</span></div>
                    <div className="cap-desc">{c.description}</div>
                  </div>
                ))}
              </div>
              <button className="reject" style={{ marginTop: 12 }} onClick={() => setCapsOpen(false)}>Close</button>
            </div>
          </div>
        )}

        {finOpen && (
          <div className="modal-overlay" onClick={() => setFinOpen(false)}>
            <div className="modal fin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title"><IconCalculator size={18} /> Freelancer finance</div>
              {/* Summary */}
              <div className="home-stats">
                <div className="stat-card"><div className="stat-num">৳{finSummary?.income ?? 0}</div><div className="stat-label">Income</div></div>
                <div className="stat-card"><div className="stat-num">৳{finSummary?.expense ?? 0}</div><div className="stat-label">Expense</div></div>
                <div className="stat-card"><div className="stat-num" style={{ color: (finSummary?.balance ?? 0) < 0 ? "var(--man-danger)" : "var(--man-success)" }}>৳{finSummary?.balance ?? 0}</div><div className="stat-label">Balance</div></div>
              </div>
              {/* Add form */}
              <div className="fin-form">
                <div className="seg" style={{ marginBottom: 8 }}>
                  {[["expense", "Expense"], ["income", "Income"]].map(([v, l]) => (
                    <button key={v} className={finType === v ? "seg-on" : ""} onClick={() => { setFinType(v as any); setFinCat(v === "income" ? "freelance_income" : "food"); }}>{l}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="cc-select" style={{ flex: 1 }} value={finCat} onChange={(e) => setFinCat(e.target.value)}>
                    {(FIN_CATS[finType] || []).map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                  </select>
                  <input className="fb-input" style={{ width: 100, marginTop: 0 }} placeholder="৳ amount" inputMode="decimal" value={finAmount} onChange={(e) => setFinAmount(e.target.value)} />
                </div>
                <input className="fb-input" style={{ marginTop: 8 }} placeholder="Note (optional)" value={finNote} onChange={(e) => setFinNote(e.target.value)} />
                {loginMsg && <div className="auth-err" role="alert">{loginMsg}</div>}
                <button className="approve" style={{ marginTop: 8, width: "100%" }} onClick={addFinance}>Add {finType}</button>
              </div>
              {/* Records */}
              <div className="fin-records">
                {finRecords.length === 0 && <p className="muted">No records yet. Add your first income or expense.</p>}
                {finRecords.slice(0, 30).map((r) => (
                  <div key={r.id} className="fin-row">
                    <span className={`fin-type ${r.type}`}>{r.type === "income" ? "↑" : "↓"}</span>
                    <span className="fin-cat">{r.category.replace(/_/g, " ")}</span>
                    <span className="fin-note">{r.note}</span>
                    <span className={`fin-amt ${r.type}`}>{r.type === "income" ? "+" : "-"}৳{r.amount}</span>
                    <button className="mini" onClick={() => deleteFinance(r.id)}><IconTrash size={13} /></button>
                  </div>
                ))}
              </div>
              <button className="reject" style={{ marginTop: 12, width: "100%" }} onClick={() => setFinOpen(false)}>Close</button>
            </div>
          </div>
        )}

        {showMemory && (
          <aside className="panel memory-panel">
            <div className="panel-title">Memory</div>
            {memories.length === 0 && <p className="muted">Nothing remembered yet.</p>}
            {memories.map((m) => (
              <div key={m.key} className="mem-row">
                <span><b>{m.key}:</b> {m.value}</span>
                <button className="mini" aria-label={`Delete ${m.key}`} onClick={() => deleteMemory(m.key)}><IconTrash size={14} /></button>
              </div>
            ))}
            {memories.length > 0 && (confirmClear ? (
              <div className="clear-confirm">
                <span>Clear all memories?</span>
                <button className="approve" onClick={async () => { await deleteMemory(); setConfirmClear(false); }}>Clear</button>
                <button className="reject" onClick={() => setConfirmClear(false)}>Cancel</button>
              </div>
            ) : (
              <button className="ghost danger" onClick={() => setConfirmClear(true)}>Clear all</button>
            ))}
          </aside>
        )}

        {showAdmin && adminUsage && (
          <aside className="panel">
            <div className="panel-title">System</div>
            <div className="sys-grid">
              <span>AI Router <b className={adminUsage.system?.ai_router === "ok" ? "ok" : "warn"}>{adminUsage.system?.ai_router === "ok" ? "✓" : "!"}</b></span>
              <span>Database <b className={adminUsage.system?.database === "ok" ? "ok" : "warn"}>{adminUsage.system?.database === "ok" ? "✓" : "!"}</b></span>
              <span>Messages today <b>{adminUsage.messagesToday ?? 0}</b></span>
              <span>Errors <b>{adminUsage.errors ?? 0}</b></span>
            </div>
            <div className="panel-title" style={{ marginTop: 10 }}>Providers</div>
            <div className="provider-list">
              {(adminUsage.provider_status || []).map((p: any) => (
                <div key={p.name} className="provider-row"><span>{p.name}</span><span className={p.status === "configured" ? "ok" : "dim"}>{p.status}</span></div>
              ))}
            </div>
          </aside>
        )}

        <div className="chat" ref={chatRef}>
          {messages.length === 0 ? (
            <div className="welcome home-dash">
              <div className="welcome-logo"><ManLogo size={48} /></div>
              <h2>{greeting()}</h2>
              <p className="lead">Ask anything, explore an idea, or get something done.</p>

              {/* Quick action pills */}
              <div className="home-quick">
                {WELCOME_CARDS.map((c) => {
                  const I = c.icon;
                  return (
                    <button key={c.id} className="home-quick-btn" onClick={() => send(c.prompt)}>
                      <I size={16} />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Stats row (real, from /api/me) */}
              <div className="home-stats">
                <div className="stat-card"><div className="stat-num">{stats?.messagesToday ?? 0}</div><div className="stat-label">Messages today</div></div>
                <div className="stat-card"><div className="stat-num">{stats?.threadsCount ?? 0}</div><div className="stat-label">Conversations</div></div>
                <div className="stat-card"><div className="stat-num">{stats?.memoryCount ?? 0}</div><div className="stat-label">Memories</div></div>
              </div>

              {/* Welcome suggestion cards */}
              <div className="welcome-cards">
                {WELCOME_CARDS.map((c) => {
                  const I = c.icon;
                  return (
                    <button key={c.id} className="welcome-card" onClick={() => send(c.prompt)}>
                      <I size={18} />
                      <span className="welcome-card-text">
                        <span className="welcome-card-title">{c.label}</span>
                        <span className="welcome-card-desc">{c.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.role === "assistant" && (<div className="man-avatar"><ManMark size={24} /></div>)}
                <div className="msg-body">
                  <div className="bubble" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
                  {m.role === "assistant" && m.provider && m.provider !== "none" && (
                    <div className="provider-badge" title="Answered by">
                      <span className="provider-dot"></span> {m.provider}
                    </div>
                  )}
                  {m.pendingAction && (
                    <div className="approval" role="group" aria-label="Approval required">
                      <div className="approval-title">Approval required</div>
                      <div className="approval-detail">{m.pendingAction.summary}</div>
                      <div className="btn-row">
                        <button className="approve" onClick={() => decide(m.pendingAction.id, true)}>Approve</button>
                        <button className="reject" onClick={() => decide(m.pendingAction.id, false)}>Reject</button>
                      </div>
                    </div>
                  )}
                  <div className="msg-actions">
                    <button title="Copy" aria-label="Copy" onClick={() => copyText(m.text, i)}>{copied === i ? <IconCheck size={14} /> : <IconCopy size={14} />}</button>
                    {m.role === "assistant" && <button title="Regenerate" aria-label="Regenerate" onClick={() => regenerate(i)}><IconRefresh size={14} /></button>}
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="msg assistant">
              <div className="man-avatar"><ManMark size={24} /></div>
              <div className="msg-body">
                <div className="bubble typing"><span></span><span></span><span></span></div>
                <button className="stop-btn" onClick={stopGenerating}><IconStop size={13} /> Stop</button>
              </div>
            </div>
          )}
        </div>

        <div className="composer-wrap">
          <div className={`composer ${toolPrompt ? "composer-tool" : ""}`}>
            {/* tool contextual bar */}
            {toolPrompt && (
              <div className="tool-context">
                <span className="tool-chip">{toolLabel}</span>
                <span className="tool-hint">Enter details, then Send</span>
                <button className="tool-cancel" onClick={() => { setToolPrompt(null); setToolLabel(null); }} aria-label="Cancel tool"><IconX size={14} /></button>
              </div>
            )}
            <div className="composer-row">
              <div className="plus-wrap">
                <button className="plus-btn" title="More" aria-label="More actions" onClick={() => setPlusOpen((s) => !s)}>
                  <IconPlus />
                </button>
                {plusOpen && (
                  <div className="sheet" role="menu" onClick={(e) => e.stopPropagation()}>
                    {TOOLS.map((t) => { const I = t.icon; return (
                      <button key={t.id} role="menuitem" className="cmd-item" onClick={() => selectTool(t)}>
                        <I size={17} /><span className="cmd-text"><span className="cmd-label">{t.label}</span><span className="cmd-desc">{t.desc}</span></span>
                      </button>
                    ); })}
                    <div className="sheet-sep"></div>
                    <button role="menuitem" className="cmd-item" onClick={() => { setPlusOpen(false); setShowMemory(true); refreshMemory(); }}>
                      <IconMemory size={17} /><span className="cmd-text"><span className="cmd-label">Memory</span><span className="cmd-desc">View what MAN remembers</span></span>
                    </button>
                    <button role="menuitem" className="cmd-item" onClick={() => { setPlusOpen(false); exportChat(); }}>
                      <IconExport size={17} /><span className="cmd-text"><span className="cmd-label">Export</span><span className="cmd-desc">Download this conversation</span></span>
                    </button>
                    <button role="menuitem" className="cmd-item" onClick={() => { setPlusOpen(false); newChat(); }}>
                      <IconMessage size={17} /><span className="cmd-text"><span className="cmd-label">New conversation</span><span className="cmd-desc">Start a fresh thread</span></span>
                    </button>
                  </div>
                )}
              </div>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); if (plusOpen) setPlusOpen(false); }}
                onFocus={onComposerFocus}
                onClick={onComposerFocus}
                onKeyDown={(e) => { if (e.key === "Enter") { setPlusOpen(false); if (toolPrompt) runTool(); else send(input); } }}
                placeholder={toolPrompt ? "Enter details…" : "Message MAN…"}
                aria-label="Message MAN"
              />
              {voiceSupported && (
                <button className={`mic-btn ${voiceStatus === "listening" ? "listening" : voiceStatus === "speaking" ? "speaking" : ""}`}
                  title={voiceStatus === "listening" ? "Stop listening" : "Talk to MAN"}
                  aria-label={voiceStatus === "listening" ? "Stop voice input" : "Start voice input"} aria-live="polite"
                  onClick={() => { if (voiceRef.current) { if (voiceStatus === "listening") { voiceRef.current.stop(); setVoiceStatus(""); } else { setVoiceStatus("listening"); voiceRef.current.start(); } } }}>
                  <IconMic />
                </button>
              )}
              <button className="send-btn" aria-label="Send message" disabled={loading || (!toolPrompt && !input.trim())} onClick={() => toolPrompt ? runTool() : send(input)}>
                <IconSend />
              </button>
            </div>
          </div>
          {voiceStatus === "listening" && <div className="voice-status" role="status"><span className="pulse-dot"></span>Listening…</div>}
          {voiceStatus === "speaking" && <div className="voice-status" role="status"><span className="pulse-dot"></span>Speaking…</div>}
          {loading && <div className="voice-status" role="status"><span className="pulse-dot"></span>Thinking…</div>}
        </div>
      </main>
      {splash && <ManSplash onDone={() => setSplash(false)} />}
    </div>
  );
}

// MAN — AI Provider Router
//
// Priority: Groq (multi-key rotation) -> DeepSeek -> Gemini -> OpenRouter -> GitHub.
// All keys stay server-side (Vercel env vars). Never expose to browser.
// No fake responses: if a provider fails, we FAIL OVER or return a clear
// error — we never fabricate a success.
//
// Env vars: GEMINI_API_KEY, GROQ_API_KEY, DEEPSEEK_API_KEY,
//           OPENROUTER_API_KEY, GITHUB_TOKEN

export interface LLMResult {
  text: string;
  provider: string;   // which provider actually served it
  model: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  ok: boolean;
  error?: string;
}

interface Provider {
  name: string;
  enabled: boolean;
  model: string;
  url: string;
  headers: Record<string, string>;
  body: (prompt: string, sys: string) => unknown;
  parse: (data: any) => { text: string; usage?: any };
}

const key = (k: string) => process.env[k] || "";

// ---------- Gemini ----------
const gemini: Provider = {
  name: "gemini",
  enabled: !!key("GEMINI_API_KEY"),
  model: process.env.MAN_GEMINI_MODEL || "gemini-2.0-flash",
  url: "",
  headers: {},
  body: () => ({}),
  parse: () => ({ text: "" }),
};
gemini.url = `https://generativelanguage.googleapis.com/v1beta/models/${gemini.model}:generateContent?key=${key("GEMINI_API_KEY")}`;
gemini.headers = { "Content-Type": "application/json" };
gemini.body = (prompt, sys) => ({
  systemInstruction: { parts: [{ text: sys }] },
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  generationConfig: { temperature: 0.7 },
});
gemini.parse = (d: any) => ({
  text: d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "",
});

// ---------- Groq (OpenAI-compatible, with multi-key rotation) ----------
// Supports GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3 as a key pool. Each key
// becomes its own provider entry in the chain, so if one key hits its rate/usage
// limit (429), the router automatically falls through to the next key, then on
// to the next provider (DeepSeek -> OpenRouter -> GitHub).
const GROQ_KEYS = [
  key("GROQ_API_KEY"),
  key("GROQ_API_KEY_2"),
  key("GROQ_API_KEY_3"),
].filter((k) => !!k);

function makeGroq(name: string, apiKey: string, model: string): Provider {
  return {
    name,
    enabled: !!apiKey,
    model,
    url: "https://api.groq.com/openai/v1/chat/completions",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: (prompt, sys) => ({
      model,
      temperature: 0.7,
      messages: [{ role: "system", content: sys }, { role: "user", content: prompt }],
    }),
    parse: (d: any) => ({ text: d?.choices?.[0]?.message?.content || "",
      usage: { input_tokens: d?.usage?.prompt_tokens, output_tokens: d?.usage?.completion_tokens } }),
  };
}
const groqModel = process.env.MAN_GROQ_MODEL || "llama-3.3-70b-versatile";
const groq = GROQ_KEYS.map((k, i) => makeGroq(i === 0 ? "groq" : `groq${i + 1}`, k, groqModel));

// ---------- OpenRouter ----------
const openrouter: Provider = {
  name: "openrouter",
  enabled: !!key("OPENROUTER_API_KEY"),
  model: process.env.MAN_OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct",
  url: "https://openrouter.ai/api/v1/chat/completions",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${key("OPENROUTER_API_KEY")}` },
  body: (prompt, sys) => ({
    model: openrouter.model, temperature: 0.7,
    messages: [{ role: "system", content: sys }, { role: "user", content: prompt }],
  }),
  parse: (d: any) => ({ text: d?.choices?.[0]?.message?.content || "",
    usage: { input_tokens: d?.usage?.prompt_tokens, output_tokens: d?.usage?.completion_tokens } }),
};

// ---------- DeepSeek (OpenAI-compatible) ----------
const deepseek: Provider = {
  name: "deepseek",
  enabled: !!key("DEEPSEEK_API_KEY"),
  model: process.env.MAN_DEEPSEEK_MODEL || "deepseek-chat",
  url: "https://api.deepseek.com/chat/completions",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${key("DEEPSEEK_API_KEY")}` },
  body: (prompt, sys) => ({
    model: deepseek.model, temperature: 0.7, max_tokens: 2000,
    messages: [{ role: "system", content: sys }, { role: "user", content: prompt }],
  }),
  parse: (d: any) => ({ text: d?.choices?.[0]?.message?.content || "",
    usage: { input_tokens: d?.usage?.prompt_tokens, output_tokens: d?.usage?.completion_tokens } }),
};

// ---------- GitHub Models ----------
const github: Provider = {
  name: "github",
  enabled: !!key("GITHUB_TOKEN"),
  model: process.env.MAN_GITHUB_MODEL || "gpt-4o-mini",
  url: "https://models.inference.ai.azure.com/chat/completions",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${key("GITHUB_TOKEN")}` },
  body: (prompt, sys) => ({
    model: github.model, messages: [{ role: "system", content: sys }, { role: "user", content: prompt }],
  }),
  parse: (d: any) => ({ text: d?.choices?.[0]?.message?.content || "" }),
};

// Main router priority: Groq (multi-key) -> DeepSeek -> Gemini -> OpenRouter -> GitHub.
// Groq is tried first because it is the most reliable/available provider; each
// Groq key is its own entry so rate-limit on one falls through to the next.
const CHAIN: Provider[] = [...groq, deepseek, gemini, openrouter, github];
export const activeProviders = CHAIN.filter((p) => p.enabled).map((p) => p.name);

async function callProvider(p: Provider, prompt: string, sys: string): Promise<LLMResult> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45000);
    const res = await fetch(p.url, {
      method: "POST",
      headers: p.headers,
      body: JSON.stringify(p.body(prompt, sys)),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      throw new Error(`${p.name} HTTP ${res.status}`);
    }
    const data = await res.json();
    const { text, usage } = p.parse(data);
    if (!text) throw new Error(`${p.name} empty response`);
    return { text, provider: p.name, model: p.model, usage, ok: true };
  } catch (e: any) {
    return { text: "", provider: p.name, model: p.model, ok: false, error: String(e?.message || e) };
  }
}

// Main router: try each enabled provider in priority order.
export async function route(prompt: string, system: string): Promise<LLMResult> {
  const failures: string[] = [];
  for (const p of CHAIN) {
    if (!p.enabled) continue;
    const r = await callProvider(p, prompt, system);
    if (r.ok) return r;
    failures.push(`${p.name}:${r.error}`);
  }
  return {
    text: "",
    provider: "none",
    model: "",
    ok: false,
    error: `All providers unavailable. (${failures.join(" | ") || "no providers configured"})`,
  };
}

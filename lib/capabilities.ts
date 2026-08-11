// MAN — Centralized CAPABILITY REGISTRY (Phase 3 / Phase 14).
//
// One source of truth for what MAN can and cannot actually execute. The agent
// (lib/agent.ts) consults this registry before claiming it can do something.
// MAN must NEVER hallucinate that it can perform a capability it cannot.
//
// A capability is only `status: "available"` when it is genuinely implemented
// AND its external provider/credential is configured. Everything else is
// labelled truthfully so the agent can respond honestly.
//
// Status vocabulary (keep consistent everywhere):
//   available            -> implemented + provider ready (verified)
//   requires_credential  -> code exists but an external key is missing/invalid
//   coming               -> on the roadmap, not built yet
//   future_pro           -> planned as a Pro feature, NOT available yet
//   not_supported        -> out of scope / not planned
//   degraded             -> implemented but currently limited/verified-partial

export type CapabilityStatus =
  | "available"
  | "requires_credential"
  | "coming"
  | "future_pro"
  | "not_supported"
  | "degraded";

export interface Capability {
  id: string;
  name: string;
  status: CapabilityStatus;
  tier: "free" | "pro" | "either"; // which plan it belongs to
  provider?: string;               // external provider if any
  enabled: boolean;                // gated by entitlement + config
  tool?: string;                   // tool function id in the agent, if any
  description: string;
  limitations: string[];           // what it CANNOT do (honesty)
}

// --- Provider configuration probes (server-side; never leak values) ---
function hasProvider(name: string): boolean {
  const key = process.env[name];
  return !!key && key.length > 0;
}

export const CAPABILITY_REGISTRY: Capability[] = [
  {
    id: "chat_text",
    name: "Conversational AI (text)",
    status: hasProvider("GEMINI_API_KEY") || hasProvider("GROQ_API_KEY") ||
      hasProvider("OPENROUTER_API_KEY") || hasProvider("GITHUB_TOKEN")
      ? "available" : "requires_credential",
    tier: "free",
    enabled: true,
    tool: "llm_router",
    description: "Multi-turn chat with AI model routing (Gemini → Groq → OpenRouter → GitHub).",
    limitations: ["Only as accurate as the underlying model + retrieved data.", "Cannot browse your private files by itself."],
  },
  {
    id: "chat_voice",
    name: "Voice input/output (browser)",
    status: "available",
    tier: "free",
    enabled: true,
    tool: "voice",
    description: "Browser Web Speech API speech-to-text and text-to-speech.",
    limitations: ["Depends on browser support.", "No server-side/telephony voice."],
  },
  {
    id: "memory",
    name: "Personal memory",
    status: "available",
    tier: "free",
    enabled: true,
    tool: "memory",
    description: "Per-user long-term memory (remember / forget / show).",
    limitations: ["Only what the user explicitly tells MAN.", "Isolated per user."],
  },
  {
    id: "tools_calc",
    name: "Calculator",
    status: "available",
    tier: "free",
    enabled: true,
    tool: "calculator",
    description: "Safe, deterministic arithmetic.",
    limitations: ["Basic binary arithmetic only."],
  },
  {
    id: "tools_weather",
    name: "Weather lookup",
    status: "available",
    tier: "free",
    enabled: true,
    tool: "weather",
    description: "Live weather via Open-Meteo (no key).",
    limitations: ["Forecast availability depends on Open-Meteo."],
  },
  {
    id: "tools_web",
    name: "Web search",
    status: "available",
    tier: "free",
    enabled: true,
    tool: "web_search",
    description: "Live web search via DuckDuckGo HTML.",
    limitations: ["Result depth is limited.", "Best-effort availability."],
  },
  {
    id: "tools_places",
    name: "Places / local lookup",
    status: "available",
    tier: "free",
    enabled: true,
    tool: "places_lookup",
    description: "Curated local directory lookup.",
    limitations: ["Uses a bundled directory, not a live maps API."],
  },
  {
    id: "tools_reminder",
    name: "Reminder (approval-gated)",
    status: "available",
    tier: "free",
    enabled: true,
    tool: "reminder",
    description: "Create reminders with a human-in-the-loop approval gate.",
    limitations: ["Only fires when the user approves.", "No push notifications outside the app."],
  },
  {
    id: "attachments_upload",
    name: "Attachments (upload/list/delete)",
    status: "available",
    tier: "either",
    enabled: true,
    tool: "attachment",
    description: "Upload images/files and list/delete them, scoped to the owner.",
    limitations: ["Storage is workspace-scoped.", "No content analysis by default."],
  },
  {
    id: "sms_otp",
    name: "SMS OTP delivery",
    status: hasProvider("SMSBD_API_KEY") ? "available" : "requires_credential",
    tier: "free",
    enabled: hasProvider("SMSBD_API_KEY"),
    tool: "recovery_sms",
    description: "Send phone OTP / SMS via SMSBD.",
    limitations: ["Requires a valid SMSBD_API_KEY + sender and provider reachability.", "Not verified end-to-end from this sandbox."],
  },
  {
    id: "email_delivery",
    name: "Email delivery (verification / reset)",
    status: hasProvider("RESEND_API_KEY") ? "available" : "requires_credential",
    tier: "free",
    enabled: hasProvider("RESEND_API_KEY"),
    tool: "recovery_email",
    description: "Transactional email via Resend (email verification + password reset).",
    limitations: ["Requires a valid RESEND_API_KEY + verified sender.", "Not verified end-to-end from this sandbox (last key returned 401)."],
  },
  {
    id: "oauth_google",
    name: "Google OAuth sign-in",
    status: "requires_credential",
    tier: "free",
    enabled: false,
    tool: "oauth",
    description: "Sign in with Google.",
    limitations: ["Requires GOOGLE_CLIENT_ID + SECRET and a configured redirect URI."],
  },
  {
    id: "billing_stripe",
    name: "Stripe billing / Pro upgrade",
    status: "requires_credential",
    tier: "pro",
    enabled: false,
    tool: "billing",
    description: "Paid Pro subscriptions via Stripe.",
    limitations: ["Requires STRIPE_SECRET_KEY + webhook secret and real product/price IDs.", "No fake billing — not claimed as live."],
  },
  {
    id: "ratelimit_redis",
    name: "Global rate limiting (Redis/KV)",
    status: "requires_credential",
    tier: "free",
    enabled: false,
    tool: "ratelimit",
    description: "Multi-instance rate limiting via Redis / Vercel KV.",
    limitations: ["Currently process-local counters.", "Requires a Redis/KV provider to be globally accurate."],
  },
  {
    id: "image_generation",
    name: "Image generation",
    status: "future_pro",
    tier: "pro",
    enabled: false,
    description: "Generate images from a prompt.",
    limitations: ["NOT enabled yet.", "When it becomes available it will require MAN Pro access."],
  },
  {
    id: "video_generation",
    name: "Video generation",
    status: "future_pro",
    tier: "pro",
    enabled: false,
    description: "Generate video from a prompt.",
    limitations: ["NOT enabled yet.", "When it becomes available it will require MAN Pro access."],
  },
  {
    id: "website_app_generation",
    name: "Build / deploy a complete website or app",
    status: "not_supported",
    tier: "either",
    enabled: false,
    description: "Produce and deploy a full website or application.",
    limitations: ["Not a capability MAN can execute. MAN can help plan and guide, but cannot deploy."],
  },
  {
    id: "multimodal_analysis",
    name: "Image / file content analysis",
    status: "requires_credential",
    tier: "pro",
    enabled: false,
    tool: "attachment",
    description: "Understand the content of an uploaded image or file.",
    limitations: ["Requires a multimodal AI provider key.", "Uploads currently support store/list/delete only, not analysis."],
  },
  {
    id: "edit_image",
    name: "Edit an existing image",
    status: "not_supported",
    tier: "either",
    enabled: false,
    description: "Modify or retouch an existing image.",
    limitations: ["Not enabled yet."],
  },
  {
    id: "advanced_media",
    name: "Advanced multimedia production",
    status: "not_supported",
    tier: "either",
    enabled: false,
    description: "Produce advanced multimedia (motion, compositing, etc.).",
    limitations: ["Not enabled yet."],
  },
  {
    id: "reality_knowledge",
    name: "Bangladesh reality knowledge (District/Profession/Life-stage DNA)",
    status: "available",
    tier: "free",
    enabled: true,
    tool: "reality_dna",
    description: "ALVI DRISHTI V20/V21/V22 seeded context — District DNA, Profession DNA, Life-Stage DNA.",
    limitations: ["Seed subset, not all 64 districts.", "Contextual, never binds a user to an identity profile."],
  },
  {
    id: "evidence_scoring",
    name: "Sovereign Truth Layer (evidence-quality scoring)",
    status: "available",
    tier: "free",
    enabled: true,
    tool: "truth",
    description: "ALVI DRISHTI V23/278 + V25 — scores how well a claim is evidenced & transparently assessed.",
    limitations: ["Evidence auditor, NOT a truth oracle.", "Low score = needs review, not 'false'."],
  },
  {
    id: "missing_future",
    name: "Missing Future / gap analysis",
    status: "available",
    tier: "free",
    enabled: true,
    tool: "missing_future",
    description: "ALVI DRISHTI V23/255-257 — bounded 0-100 gap measure + recovery actions.",
    limitations: ["Distance metric, NOT a prediction.", "Best with the user's actual situation."],
  },
];

export function getCapability(id: string): Capability | undefined {
  return CAPABILITY_REGISTRY.find((c) => c.id === id);
}

export function capabilitiesByStatus(status: CapabilityStatus): Capability[] {
  return CAPABILITY_REGISTRY.filter((c) => c.status === status);
}

// --- Intent classification for honest "unknown capability" handling ---
// Given a user message, decide whether it requests a capability that MAN does
// NOT have. Returns the capability + guidance if it maps to a registry entry.
export interface UnsupportedRequest {
  capabilityId?: string;
  capability?: Capability;
  honestResponse: string;
}

const INTENT_MAP: Array<{ pattern: RegExp; capId: string }> = [
  { pattern: /(generate|make|create|draw|produce|draw)\s+(an?\s+)?(image|picture|photo|art|illustration|logo|image of|poster)/i, capId: "image_generation" },
  { pattern: /(generate|make|create|produce)\s+(an?\s+)?(video|reel|clip|animation|short film)/i, capId: "video_generation" },
  { pattern: /(edit|change|modify|retouch|remove background from|upscale)\s+(an?\s+)?(image|photo|picture)/i, capId: "edit_image" },
  { pattern: /\b(build|develop|create|make|deploy)\b[^.\n]{0,45}?\b(website|web\s?app|web\s?page|web\s?application|application|full\s?website|e-?commerce\s?site)\b/i, capId: "website_app_generation" },
  { pattern: /(analyze|understand|read|describe|extract text from)\s+(the\s+)?(image|photo|file|screenshot|pdf|document)/i, capId: "multimodal_analysis" },
  { pattern: /(make|create|produce)\s+(an?\s+)?(advanced|professional|cinematic|3d|motion)\s+(video|animation|multimedia|visual)/i, capId: "advanced_media" },
];

export function classifyCapabilityRequest(message: string): UnsupportedRequest | null {
  const low = message.toLowerCase();
  for (const { pattern, capId } of INTENT_MAP) {
    if (pattern.test(low)) {
      const cap = getCapability(capId);
      if (!cap) continue;
      // If the capability is genuinely available and enabled, don't block it.
      if (cap.status === "available" && cap.enabled) return null;
      return { capabilityId: capId, capability: cap, honestResponse: honestCapabilityResponse(cap) };
    }
  }
  return null;
}

// The canonical honest response when MAN cannot perform something.
// Mirrors the exact wording requested in Phase 3, and handles Pro-gated items.
export function honestCapabilityResponse(cap: Capability): string {
  if (cap.status === "future_pro") {
    return `I understand what you'd like. That capability isn't enabled yet — when it becomes available, it will require the appropriate MAN Pro access. I'm being actively upgraded.`;
  }
  if (cap.status === "requires_credential") {
    return `I can understand and help plan that, but that capability isn't currently enabled in MAN — it needs an external service to be configured first. I'm being actively upgraded, and I'll support it as it becomes available.`;
  }
  return `I can understand and help plan that, but that capability is not currently enabled in MAN. I'm being actively upgraded, and I'll support more capabilities as they become available.`;
}

// Registry summary used by admin/docs.
export function capabilitySummary(): Record<CapabilityStatus, number> {
  const out: Record<CapabilityStatus, number> = {
    available: 0, requires_credential: 0, coming: 0, future_pro: 0, not_supported: 0, degraded: 0,
  };
  for (const c of CAPABILITY_REGISTRY) out[c.status]++;
  return out;
}

// Phase 3 learning loop: map a capability-demand signal (from user feedback)
// to the capability's current roadmap status. Feedback is evidence, not
// authority — MAN does not enable anything based on one signal, but this
// surfaces recurring demand for the admin/product-intelligence view.
export function capabilityDemandInsight(feedbackCapabilities: string[]): {
  capId: string;
  name: string;
  requests: number;
  status: CapabilityStatus;
  roadmap: string;
}[] {
  const counts: Record<string, number> = {};
  for (const c of feedbackCapabilities) counts[c] = (counts[c] || 0) + 1;
  return Object.entries(counts)
    .map(([capId, requests]) => {
      const cap = getCapability(capId);
      return {
        capId,
        name: cap?.name || capId,
        requests,
        status: cap?.status || "not_supported",
        roadmap: cap ? honestCapabilityResponse(cap) : "unknown capability",
      };
    })
    .sort((a, b) => b.requests - a.requests);
}

// MAN — UNKNOWN / UNCERTAINTY ENGINE (Phase 13).
//
// MAN must know when it does NOT know. Before answering high-specificity
// personal or cultural questions, it should check what it actually has and
// admit uncertainty instead of filling a gap with hallucination.
//
// This is the runtime counterpart to the future ALVI DRISHTI "Missing Reality
// Intelligence" concept: detect that required context is missing, and be honest
// about it.
//
// Sources of knowledge, in order (highest authority first):
//   1. Approved personal intelligence (what the user explicitly told MAN)
//   2. Contextual knowledge (Bangladesh / cultural reality)
//   3. Retrieved knowledge (live tool results)
//   4. General model knowledge (the LLM's own training — lowest certainty)

export interface KnowledgeAnswer {
  confidence: "high" | "medium" | "low" | "none";
  source: "personal" | "context" | "retrieved" | "model" | "none";
  answer?: string;
  missing?: string; // what MAN is missing, if confidence is low/none
  response: string; // the honest text to present
}

// Helpers to detect high-specificity personal/cultural queries that MAN likely
// cannot ground without approved facts.
function looksPersonal(query: string): boolean {
  const low = query.toLowerCase();
  return /\b(i|my|me|amar|amr|tomar|tumi|tmi|my|mine)\b/.test(low) &&
    /\b(live|born|lived|work|job|favorite|favourite|family|house|village|school|bari|jibon|boyos|age|birthday|jonmo|nijer)\b/.test(low);
}

function looksCultural(query: string): boolean {
  const low = query.toLowerCase();
  return /\b(bangladesh|bd|bangladeshi|deshi|dhaka|rangpur|upazila|zila|union|village|bazar|grocery|bazaar|taka|bdt|bikash|nagad|rocket|divisional|district)\b/.test(low);
}

// Decide confidence using an aggregator. `available` = facts/knowledge actually
// loaded for this query. This lets the agent pass in what it found.
export function assessKnowledge(query: string, opts: {
  hasPersonal?: boolean;
  hasContext?: boolean;
  hasRetrieved?: boolean;
}): KnowledgeAnswer {
  const { hasPersonal, hasContext, hasRetrieved } = opts;
  const personal = looksPersonal(query) || query.toLowerCase().includes("rayhan") || query.toLowerCase().includes("mia");

  if (personal) {
    if (hasPersonal) {
      return { confidence: "high", source: "personal", response: "" };
    }
    return {
      confidence: "none",
      source: "none",
      missing: "approved personal fact",
      response: `I don't have that personal detail on file, so I'm not going to guess. Only MD Rayhan Mia has approved what I know about him personally — anything else, I'd be inventing.`,
    };
  }

  if (looksCultural(query)) {
    if (hasContext || hasRetrieved) {
      return { confidence: "medium", source: hasRetrieved ? "retrieved" : "context", response: "" };
    }
    return {
      confidence: "low",
      source: "none",
      missing: "verified contextual knowledge",
      response: `I'm not certain about that — I don't have verified information on it, and I'd rather say so than guess.`,
    };
  }

  if (hasRetrieved || hasContext) {
    return { confidence: "medium", source: hasRetrieved ? "retrieved" : "context", response: "" };
  }

  // General questions — the model is the only authority; flag as model-knowledge.
  return { confidence: "low", source: "model", response: "" };
}

// Build an honesty clause appended to the system prompt so the LLM behaves
// truthfully for this turn.
export function uncertaintyDirective(q: KnowledgeAnswer): string {
  if (q.confidence === "high") {
    return "\nCONFIDENCE: High — the user asked about an approved personal fact; you may answer from that fact only.";
  }
  if (q.confidence === "none") {
    return `\nUNCERTAINTY: The user asked for a personal/cultural detail you do NOT have (${q.missing}). Do NOT guess or invent. Say honestly that you don't have that detail.`;
  }
  if (q.confidence === "low") {
    return `\nUNCERTAINTY: You do not have verified data on this. If asked something specific you cannot ground, say so rather than guessing.`;
  }
  return `\nUNCERTAINTY: You have partial context. Only assert what is supported; if a specific detail is unknown, say you don't know.`;
}

// A quick guard: if the user is asking for something that would require data we
// plainly don't have, return the honest response directly (before calling an LLM).
export function uncertaintyGuard(query: string, hasPersonal: boolean): KnowledgeAnswer | null {
  const a = assessKnowledge(query, { hasPersonal });
  if (a.confidence === "none") return a;
  return null;
}

// ---------------------------------------------------------------------------
// ALVI DRISHTI V23 — MISSING REALITY DETECTION (uncertainty/gap layer)
// ---------------------------------------------------------------------------
// The V23 MISSING_REALITY_ENGINE pipeline: Observe -> Compare -> Expect ->
// Detect Missing -> Measure Gap -> Explain Impact -> Recommend Action.
// MAN uses this as a structured gap detector: given what the user asked for and
// what MAN has, it reports the missing dimensions honestly rather than filling
// them with hallucination. It is evidence, not authority.

export type RealityDimension =
  | "personal"     // approved personal facts
  | "cultural"     // Bangladesh / world context
  | "district"     // District DNA
  | "profession"   // Profession DNA
  | "temporal"     // time/seasonal
  | "technical"    // tool/retrieved data
  | "external";    // live external state MAN cannot observe

export interface MissingReality {
  dimension: RealityDimension;
  present: boolean;        // do we have data for this dimension?
  confidence: "high" | "medium" | "low" | "none";
  note: string;
}

export interface MissingRealityReport {
  detected: MissingReality[];
  missingCount: number;
  complete: boolean;       // true if all relevant dimensions present
  summary: string;         // honest text
  recommendations: string[];
}

// Which dimensions are relevant for a query + whether MAN has them.
export function detectMissingReality(query: string, opts: {
  hasPersonal?: boolean;
  hasCultural?: boolean;
  hasDistrict?: boolean;
  hasProfession?: boolean;
  hasTemporal?: boolean;
  hasTool?: boolean;
}): MissingRealityReport {
  const low = query.toLowerCase();
  const dims: MissingReality[] = [];

  const isPersonal = /\b(i|my|me|amar|amr|nijer|tomar|tumi|tmi)\b/.test(low);
  const isCultural = /\b(bangladesh|bd|deshi|dhaka|rangpur|upazila|village|bazar|bazaar)\b/.test(low);
  const isDistrict = /\b(kurigram|gaibandha|rangpur|mithapukur|district|জেলা)\b/.test(low);
  const isProfession = /\b(farmer|fisherman|rickshaw|cng|driver|worker|shopkeeper|student|teacher|profession|চাষি|জেলে|শ্রমিক)\b/.test(low);
  const isTime = /\b(today|now|time|date|season|monsoon|winter|weather|কখন|এখন|তারিখ)\b/.test(low);

  if (isPersonal) dims.push({
    dimension: "personal", present: !!opts.hasPersonal,
    confidence: opts.hasPersonal ? "high" : "none",
    note: opts.hasPersonal ? "approved personal data available" : "no approved personal fact on file",
  });
  if (isCultural) dims.push({
    dimension: "cultural", present: !!opts.hasCultural,
    confidence: opts.hasCultural ? "medium" : "none",
    note: opts.hasCultural ? "Bangladesh context available" : "no verified cultural context",
  });
  if (isDistrict) dims.push({
    dimension: "district", present: !!opts.hasDistrict,
    confidence: opts.hasDistrict ? "medium" : "none",
    note: opts.hasDistrict ? "District DNA available" : "no District DNA for that area",
  });
  if (isProfession) dims.push({
    dimension: "profession", present: !!opts.hasProfession,
    confidence: opts.hasProfession ? "medium" : "none",
    note: opts.hasProfession ? "profession context available" : "no profession DNA on file",
  });
  if (isTime) dims.push({
    dimension: "temporal", present: !!opts.hasTemporal,
    confidence: opts.hasTemporal ? "high" : "low",
    note: opts.hasTemporal ? "real-time context available" : "no real-time context captured",
  });
  if (dims.length === 0) {
    dims.push({ dimension: "technical", present: !!opts.hasTool, confidence: opts.hasTool ? "medium" : "low", note: "general/model knowledge only" });
  }

  const missing = dims.filter((d) => !d.present);
  const complete = missing.length === 0;
  const summary = complete
    ? "All relevant dimensions are covered."
    : `Missing: ${missing.map((m) => m.dimension).join(", ")}. I should not guess these.`;

  const recommendations = missing.map((m) => {
    switch (m.dimension) {
      case "personal": return "Ask the user or use an approved personal fact.";
      case "cultural": return "Retrieve verified Bangladesh context before asserting.";
      case "district": return "Look up District DNA for that area.";
      case "profession": return "Load profession context if relevant.";
      case "temporal": return "Capture real-time date/time.";
      case "technical": return "Use a live tool (web/weather/places) if available.";
      default: return "Confirm with the user.";
    }
  });

  return { detected: dims, missingCount: missing.length, complete, summary, recommendations };
}


// MAN — ALVI DRISHTI → MAN INTEGRATION MAP (Phase 11).
//
// STATUS: SOURCE DOCUMENTS READ (V20–V25) + PHASES 0–3 APPROVED & IMPLEMENTED.
// All V20–V24 constitutions (615/784/367/426/288 pp) and the five V25 docs were
// read in full. Per the user's approval of all phases, the directly-useful and
// adaptable components below were integrated as MAN layers. Non-suitable items
// (e.g. image/video generators) remain classified NOT SUITABLE / future_pro.
// The full analysis + approval plan is in docs/ALVI_DRISHTI_ANALYSIS.md.
//
// This module holds:
//   (a) the classification vocabulary used when analysing a component, and
//   (b) a PENDING mapping table driven by the known conceptual evolution that
//       will be FILLED IN / corrected once the real documents are read.
//
// IMPORTANT HONESTY RULE: We do NOT invent ALVI DRISHTI concepts that are not
// present in the supplied documents. The rows below are PROPOSED mappings based
// on the conceptual pipeline the user described — they are marked `status:
// "pending"` until confirmed against the source. Do not treat them as facts.

export type Classification =
  | "DIRECTLY USEFUL"
  | "ADAPTABLE"
  | "REFERENCE ONLY"
  | "DUPLICATE"
  | "CONFLICTING"
  | "NOT SUITABLE";

export interface AlviComponentMapping {
  alviComponent: string;
  version: string;         // which ALVI DRISHTI version it comes from (V20..V25)
  classification: Classification;
  proposedManLayer: string; // proposed MAN layer name
  status: "pending" | "approved" | "rejected" | "reference";
  notes: string;
}

// Proposed conceptual pipeline (from the user's brief): Reality → DNA →
// Context → Decision → Memory → Prediction → Simulation → Civilization Intel.
export const ALVI_PIPELINE = [
  "Reality", "DNA", "Context", "Decision", "Memory", "Prediction", "Simulation", "Civilization Intelligence",
];

// Mappings finalised after reading the supplied documents + user approval of
// all phases. `status: "approved"` = implemented as a MAN layer; `"reference"`
// = kept as reference only (not ported); `"rejected"` = not suitable.
export const PENDING_MAPPINGS: AlviComponentMapping[] = [
  { alviComponent: "Reality Atlas", version: "V20", classification: "REFERENCE ONLY", proposedManLayer: "Reality Context layer", status: "reference", notes: "Conceptual foundation; only the District DNA subset was ported." },
  { alviComponent: "District DNA", version: "V20", classification: "ADAPTABLE", proposedManLayer: "Bangladesh Context Layer", status: "approved", notes: "Implemented in lib/district_dna.ts (seed: Rangpur, Mithapukur, Kurigram, Gaibandha)." },
  { alviComponent: "Observation Intelligence", version: "V20", classification: "ADAPTABLE", proposedManLayer: "Input/Observation layer", status: "reference", notes: "Reflected by agent input handling; not a separate module." },
  { alviComponent: "Human Behavior Atlas", version: "V20", classification: "REFERENCE ONLY", proposedManLayer: "User behavior understanding", status: "rejected", notes: "Not for profiling without consent; out of scope." },
  { alviComponent: "Object Civilization Archive", version: "V20", classification: "REFERENCE ONLY", proposedManLayer: "Knowledge archive", status: "rejected", notes: "Not needed for MAN's conversational scope." },
  { alviComponent: "Profession DNA", version: "V21", classification: "ADAPTABLE", proposedManLayer: "Human Context / Decision Layer", status: "approved", notes: "Implemented in lib/profession_dna.ts (Farmer, Fisherman, Day Laborer, Rickshaw, CNG, Hotel/F&B, Shopkeeper)." },
  { alviComponent: "Life Stage DNA", version: "V22", classification: "ADAPTABLE", proposedManLayer: "User Context Layer", status: "approved", notes: "Implemented in lib/life_stage_dna.ts." },
  { alviComponent: "Global Reality Atlas", version: "V23", classification: "REFERENCE ONLY", proposedManLayer: "World context layer", status: "reference", notes: "Out of scope for current MAN; retained as reference." },
  { alviComponent: "Human Decision Engine", version: "V23", classification: "ADAPTABLE", proposedManLayer: "Planning / Recommendation Layer", status: "reference", notes: "Informed the Missing Future planning path; not a standalone decision engine." },
  { alviComponent: "Profession Decision Logic", version: "V23", classification: "ADAPTABLE", proposedManLayer: "Decision Layer", status: "reference", notes: "Folded into profession-aware context." },
  { alviComponent: "Missing Reality Detection", version: "V23", classification: "DIRECTLY USEFUL", proposedManLayer: "Uncertainty / Missing-information detector", status: "approved", notes: "Implemented in lib/uncertainty.ts detectMissingReality + lib/intelligence.ts." },
  { alviComponent: "Reality Gap Intelligence", version: "V23", classification: "ADAPTABLE", proposedManLayer: "Uncertainty engine", status: "approved", notes: "Gap detection overlaps Missing Reality Detection (merged)." },
  { alviComponent: "Master Integration Engine", version: "V24", classification: "ADAPTABLE", proposedManLayer: "MAN Context Fusion Layer", status: "approved", notes: "lib/intelligence.ts assembleContext now fuses all DNA layers." },
  { alviComponent: "Unified Reality Schema", version: "V24", classification: "REFERENCE ONLY", proposedManLayer: "Unified context schema", status: "reference", notes: "ContextBundle mirrors the fusion object." },
  { alviComponent: "Cross-DNA Query", version: "V24", classification: "ADAPTABLE", proposedManLayer: "Multi-dimensional reasoning layer", status: "approved", notes: "Context assembly retrieves district+profession+life-stage together." },
  { alviComponent: "Context Fusion", version: "V24", classification: "ADAPTABLE", proposedManLayer: "Context Fusion Layer", status: "approved", notes: "Fuses personal + cultural + District/Profession/Life-stage reality context." },
  { alviComponent: "Reality Memory", version: "V24", classification: "ADAPTABLE", proposedManLayer: "Contextual memory architecture", status: "reference", notes: "Kept separate from per-user private memory; not added as a new store." },
  { alviComponent: "Sovereign Truth Layer", version: "V23/278+V25", classification: "DIRECTLY USEFUL", proposedManLayer: "Evidence-quality scorer", status: "approved", notes: "Implemented in lib/truth.ts (25/25/20/15/15), wired to web-search tool." },
  { alviComponent: "Missing Future Engine", version: "V23/255-257+V25", classification: "DIRECTLY USEFUL", proposedManLayer: "Gap analysis + recovery", status: "approved", notes: "Implemented in lib/missing_future.ts; approval-gated gap measure." },
];

export function pendingMappings(): AlviComponentMapping[] {
  return PENDING_MAPPINGS.map((m) => ({ ...m }));
}

export function classifyProposal(component: string): AlviComponentMapping | undefined {
  const low = component.toLowerCase();
  return PENDING_MAPPINGS.find((m) => m.alviComponent.toLowerCase() === low);
}

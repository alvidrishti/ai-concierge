// MAN — INTELLIGENCE ARCHITECTURE (Phase 12).
//
// MAN's intelligence is layered, not a single "chatbot" call. Each layer feeds
// the next. This module describes the stack and provides a runtime "context
// fusion" helper that assembles the relevant context for a single turn without
// duplicating memory systems.
//
// Memory separation (no duplicate stores):
//   1. Personal Memory      -> per-user `user_memory` (remember/forget)
//   2. Conversation Memory  -> per-thread `conversations` + threads
//   3. Contextual Knowledge -> Bangladesh + world context (lib/bangladesh)
//   4. Product Feedback     -> lib/feedback (NOT mixed into personal memory)
//   5. System Knowledge     -> creator facts (lib/personal_intelligence)
//   6. External retrieved   -> live tool results (weather/web/places)
//
// Stack (top to bottom at runtime):
//   USER IDENTITY -> PERSONAL INTELLIGENCE -> BD/WORLD CONTEXT -> REALITY CONTEXT
//   -> MEMORY -> CURRENT CONVERSATION -> TOOLS -> REASONING -> DECISION/PLAN
//   -> ACTION -> FEEDBACK -> LEARNING/PRODUCT IMPROVEMENT

import { retrievePersonalFacts, personalFactsBlock } from "./personal_intelligence";
import { retrieveBDContext, BD_UNCERTAINTY } from "./bangladesh";
import { districtDnaBlock } from "./district_dna";
import { professionDnaBlock } from "./profession_dna";
import { lifeStageBlock } from "./life_stage_dna";
import { retrieveBDHelp } from "./bd_life";
import { assessKnowledge, uncertaintyDirective, detectMissingReality } from "./uncertainty";

export interface ContextBundle {
  system: string;
  confidence: "high" | "medium" | "low" | "none";
  hasPersonal: boolean;
}

// Assemble the context clause for a user message. Kept small: only matched,
// approved facts + matched Bangladesh context + District/Profession/Life-Stage
// DNA (ALVI DRISHTI) + an uncertainty/missing-reality directive.
export function buildTurnContext(query: string): {
  personal: string;
  bangladesh: string;
  dailyLife: string;
  districtDna: string;
  professionDna: string;
  lifeStage: string;
  uncertainty: string;
  hasPersonal: boolean;
} {
  const personal = personalFactsBlock(query);
  const hasPersonal = personal.length > 0;
  const bangladesh = retrieveBDContext(query);
  const dailyLife = retrieveBDHelp(query);
  const districtDna = districtDnaBlock(query);
  const professionDna = professionDnaBlock(query);
  const lifeStage = lifeStageBlock(query);
  const assessment = assessKnowledge(query, {
    hasPersonal,
    hasContext: bangladesh.length > 0 || dailyLife.length > 0 || districtDna.length > 0 || professionDna.length > 0,
  });
  const uncertainty = uncertaintyDirective(assessment);
  return { personal, bangladesh, dailyLife, districtDna, professionDna, lifeStage, uncertainty, hasPersonal };
}

// Full assembled system extension (used by lib/agent.ts for general turns).
export function assembleContext(query: string): ContextBundle {
  const { personal, bangladesh, dailyLife, districtDna, professionDna, lifeStage, uncertainty, hasPersonal } = buildTurnContext(query);
  let system = uncertainty;
  if (personal) system += `\n${personal}`;
  if (dailyLife) system += `\n${dailyLife}`;
  if (districtDna) system += `\n${districtDna}`;
  if (professionDna) system += `\n${professionDna}`;
  if (lifeStage) system += `\n${lifeStage}`;
  if (bangladesh) system += `\n${bangladesh}${BD_UNCERTAINTY}`;
  const confidence = hasPersonal ? "high" : (bangladesh || dailyLife || districtDna || professionDna) ? "medium" : "low";
  return { system, confidence, hasPersonal };
}

// Missing-reality detection wrapper (ALVI V23) for the agent's uncertainty guard.
export function assessMissingReality(query: string, opts: {
  hasPersonal?: boolean;
  hasCultural?: boolean;
  hasDistrict?: boolean;
  hasProfession?: boolean;
  hasTemporal?: boolean;
  hasTool?: boolean;
}) {
  return detectMissingReality(query, opts);
}

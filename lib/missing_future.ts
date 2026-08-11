// MAN — MISSING FUTURE RECOVERY ENGINE (ALVI DRISHTI V23 modules 255–257 / V25 code).
//
// Honest scope (matches source): this is a structured GAP-ANALYSIS engine, NOT
// a forecasting model. It quantifies the distance between a present state and a
// stated reference state (0–100 `future_loss_score`, a distance metric), and
// returns recovery actions from a deterministic blocker->action table. It does
// not predict the future.
//
// MAN uses this for planning/analysis questions (e.g. "what opportunities am I
// missing?") — always presented as a gap measure with a disclaimer, never as a
// prediction.

export const FUTURE_BLOCKERS = [
  "lack_of_knowledge", "lack_of_opportunity", "wrong_incentives",
  "poor_leadership", "infrastructure_gaps", "resource_constraints",
  "fear_of_change", "system_failures", "talent_waste", "short_term_thinking",
] as const;

export type FutureBlocker = (typeof FUTURE_BLOCKERS)[number];

// Blocker -> recovery actions (from V25 missing_future_engine.py source).
export const BLOCKER_RECOVERY_MAP: Record<string, string[]> = {
  lack_of_knowledge: ["Provide targeted learning", "Connect to online resources"],
  lack_of_opportunity: ["Map local demand to skill", "Create an apprenticeship pipeline"],
  wrong_incentives: ["Redesign incentive structure", "Align rewards to long-term outcomes"],
  poor_leadership: ["Leadership mentorship", "Rotate decision-making roles"],
  infrastructure_gaps: ["Prioritize infra investment", "Partner with infra providers"],
  resource_constraints: ["Seek grant/microfinance access", "Pool community resources"],
  fear_of_change: ["Peer success storytelling", "Low-risk pilot programs"],
  system_failures: ["Process audit and redesign", "Introduce accountability checkpoints"],
  talent_waste: ["Talent identification program", "Cross-sector placement"],
  short_term_thinking: ["Long-term incentive alignment", "Scenario planning workshops"],
};

export interface FutureGapReport {
  subject: string;
  missingAttributes: string[];
  futureLossScore: number; // 0-100 distance metric
  recoveryActions: string[];
  blockersIdentified: string[];
  isPrediction: false; // honest: never a forecast
}

// Gap analysis: diff present attributes vs reference expected attributes.
export function analyzeFutureGap(opts: {
  subject: string;
  presentAttributes: string[];
  expectedAttributes: string[];
  activeBlockers?: string[];
}): FutureGapReport {
  const present = new Set(opts.presentAttributes || []);
  const expected = new Set(opts.expectedAttributes || []);
  const blockers = (opts.activeBlockers || []).filter((b) => BLOCKER_RECOVERY_MAP[b]);

  const missingAttrs = [...expected].filter((a) => !present.has(a)).sort();
  const total = Math.max(expected.size, 1);
  const gapRatio = missingAttrs.length / total;
  const blockerPenalty = Math.min(0.4, 0.08 * blockers.length);
  const futureLossScore = Math.round(Math.min(100, 100 * gapRatio + 100 * blockerPenalty) * 10) / 10;

  const recoveryActions: string[] = [];
  for (const b of blockers) {
    recoveryActions.push(...(BLOCKER_RECOVERY_MAP[b] || [`Investigate blocker: ${b}`]));
  }

  return {
    subject: opts.subject,
    missingAttributes: missingAttrs,
    futureLossScore,
    recoveryActions: [...new Set(recoveryActions)],
    blockersIdentified: blockers,
    isPrediction: false,
  };
}

export const GAP_DISCLAIMER =
  "Gap score is a distance measure between present and reference state — not a prediction of the future.";

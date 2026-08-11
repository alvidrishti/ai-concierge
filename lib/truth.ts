// MAN — SOVEREIGN TRUTH LAYER (ALVI DRISHTI V23 module 278 / V25 code → MAN).
//
// IMPORTANT SCOPE (matches the V25 source doc): this is a STRUCTURED
// EVIDENCE-QUALITY SCORER, NOT a truth oracle. No software can independently
// confirm whether a claim about the physical world is actually true without
// being handed real evidence. It scores how well a claim is EVIDENCED and
// TRANSPARENTLY ASSESSED — it does not certify facts.
//
// Weighting (from source): evidence independence 25 / verification 25 /
// auditability 20 / transparency 15 / manipulation-resistance 15.
// Classification: >=85 Well-Evidenced, >=60 Partially Evidenced, >=35 Weakly
// Evidenced, else Unsupported (escalate to human review).
//
// MAN uses this to honestly label the evidentiary quality of retrieved/tool
// claims — never to claim something is "certified true".

export type TruthSignal =
  | "NARRATIVE_ONLY"        // claim with no evidence
  | "SELECTIVE_EVIDENCE"    // only 1 piece of evidence
  | "SINGLE_SOURCE_CONSENSUS" // all evidence from one source
  | "UNSOURCED"             // evidence present but no source cited
  | "CONFIDENCE_INFLATION"; // near-certainty on thin evidence

export interface TruthEvidence {
  description: string;
  source: string;
  independent?: boolean; // false if source is affiliated with the claimant
}

export interface TruthClaim {
  claim: string;
  evidence: TruthEvidence[];
  methodDisclosed?: boolean; // was the verification method stated?
  statedConfidence?: number | null; // 0-1 if given
}

export interface TruthAssessment {
  claim: string;
  evidenceIndependence: number;   // 0-25
  verificationIndependence: number; // 0-25
  auditability: number;           // 0-20
  transparency: number;           // 0-15
  manipulationResistance: number; // 0-15
  signals: TruthSignal[];
  sovereigntyScore: number;
  classification: "Well-Evidenced" | "Partially Evidenced" | "Weakly Evidenced — Flag for Review" | "Unsupported — Escalate to Human Validator";
}

export function evaluateTruth(claim: TruthClaim): TruthAssessment {
  const signals: TruthSignal[] = [];
  const evidence = claim.evidence || [];

  // --- Evidence independence (25): distinct independent sources ---
  const sources = new Set(evidence.map((e) => e.source));
  const independentSources = new Set(evidence.filter((e) => e.independent !== false).map((e) => e.source));
  let evidenceIndependence: number;
  if (!evidence.length) {
    signals.push("NARRATIVE_ONLY");
    evidenceIndependence = 0;
  } else if (evidence.length === 1) {
    signals.push("SELECTIVE_EVIDENCE");
    evidenceIndependence = 8;
  } else if (independentSources.size <= 1) {
    signals.push("SINGLE_SOURCE_CONSENSUS");
    evidenceIndependence = 12;
  } else {
    evidenceIndependence = Math.min(25, 12 + 5 * independentSources.size);
  }

  // --- Verification independence (25): any unsourced evidence? ---
  const unsourced = evidence.filter((e) => !e.source);
  let verificationIndependence: number;
  if (evidence.length && unsourced.length) {
    signals.push("UNSOURCED");
    verificationIndependence = Math.round(25 * (1 - unsourced.length / evidence.length) * 0.6);
  } else if (evidence.length) {
    verificationIndependence = 25;
  } else {
    verificationIndependence = 0;
  }

  // --- Auditability (20): method disclosed? ---
  const auditability = claim.methodDisclosed ? 20 : 5;

  // --- Transparency (15): confidence disclosed + plausible ---
  let transparency: number;
  if (claim.statedConfidence == null) {
    signals.push("CONFIDENCE_INFLATION");
    transparency = 3;
  } else if (claim.statedConfidence >= 0.99 && evidence.length < 3) {
    signals.push("CONFIDENCE_INFLATION");
    transparency = 6;
  } else {
    transparency = 15;
  }

  // --- Manipulation resistance (15): inverse of signal count ---
  const manipulationResistance = Math.max(0, 15 - 3 * signals.length);

  const sovereigntyScore = Math.round((evidenceIndependence + verificationIndependence + auditability + transparency + manipulationResistance) * 10) / 10;
  const classification =
    sovereigntyScore >= 85 ? "Well-Evidenced"
    : sovereigntyScore >= 60 ? "Partially Evidenced"
    : sovereigntyScore >= 35 ? "Weakly Evidenced — Flag for Review"
    : "Unsupported — Escalate to Human Validator";

  return {
    claim: claim.claim,
    evidenceIndependence: Math.round(evidenceIndependence * 10) / 10,
    verificationIndependence,
    auditability,
    transparency,
    manipulationResistance,
    signals,
    sovereigntyScore,
    classification,
  };
}

// Honest note appended when MAN presents an evidence score.
export const TRUTH_DISCLAIMER =
  "Evidence-quality score — not a truth certificate. Low scores mean 'needs review', not 'false'.";

// Convenience: score a single sourced claim from a live tool/retrieval.
export function scoreSourcedClaim(claim: string, source: string, methodDisclosed = true, confidence = 0.9): TruthAssessment {
  return evaluateTruth({
    claim,
    evidence: [{ description: claim, source, independent: true }],
    methodDisclosed,
    statedConfidence: confidence,
  });
}

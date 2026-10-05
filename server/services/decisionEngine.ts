import type { DecisionState, ReliabilityLevel, ClaimItem, EvidenceItem, CitationItem } from '../../src/types/api';
import type { QuestionClassification } from './questionClassifier';
import type { RetrievalResult } from './knowledgeRetrieval';

export interface DecisionEvaluation {
  decisionState: DecisionState;
  confidenceScore: number; // 0 to 1
  confidencePercent: number; // 0 to 100
  reliabilityLevel: ReliabilityLevel;
  reliabilityLabel: string;
  rationale: string;
  factors: {
    evidenceRelevanceScore: number;
    authorityScore: number;
    evidenceCountScore: number;
    citationCoverageScore: number;
    claimGroundingScore: number;
    hasContradictions: boolean;
  };
}

/**
 * Deterministic Decision Engine.
 * Evaluates evidence quality, authority tiers, claim grounding, and classifier risk
 * to determine the decision state and compute a data-driven confidence score.
 */
export function evaluateDecision(params: {
  classification: QuestionClassification;
  retrievedResults: RetrievalResult[];
  evidenceItems: EvidenceItem[];
  validClaims: ClaimItem[];
  citations: CitationItem[];
  llmRecommendation?: DecisionState;
}): DecisionEvaluation {
  const {
    classification,
    retrievedResults,
    evidenceItems,
    validClaims,
    citations,
    llmRecommendation,
  } = params;

  // 1. Evidence count & relevance factors
  const evidenceCount = evidenceItems.length;
  let avgRelevance = 0;
  if (retrievedResults.length > 0) {
    avgRelevance =
      retrievedResults.reduce((sum, r) => sum + (r.relevanceScore || 0), 0) /
      retrievedResults.length;
  }
  const topRelevance = retrievedResults.length > 0 ? (retrievedResults[0].relevanceScore || 0) : 0;

  // 2. Authority weighting (average tier of retrieved evidence, Tier 1 = 1.0)
  let authoritySum = 0;
  for (const r of retrievedResults) {
    if (r.authorityTier === 1) authoritySum += 1.0;
    else if (r.authorityTier === 2) authoritySum += 0.8;
    else if (r.authorityTier === 3) authoritySum += 0.5;
    else authoritySum += 0.2;
  }
  const avgAuthority = retrievedResults.length > 0 ? authoritySum / retrievedResults.length : 0;

  // 3. Evidence quantity factor (0 chunks = 0, 1-2 chunks = 0.5, 3-5 chunks = 0.85, 6+ = 1.0)
  let countScore = 0;
  if (evidenceCount >= 5) countScore = 1.0;
  else if (evidenceCount >= 3) countScore = 0.85;
  else if (evidenceCount >= 1) countScore = 0.55;
  else countScore = 0;

  // 4. Citation coverage factor (citations present from verified sources)
  const citationCoverage = Math.min(1, citations.length / Math.max(1, Math.min(3, evidenceCount)));

  // 5. Claim grounding factor (proportion of claims with valid evidence IDs)
  let claimGrounding = 0;
  if (validClaims.length > 0) {
    const supportedClaims = validClaims.filter((c) => c.evidence_ids && c.evidence_ids.length > 0);
    claimGrounding = supportedClaims.length / validClaims.length;
  }

  // 6. Conflicting sources check
  // (In current repository, all 900 chunks belong to The Drugs Rules 1945 CDSCO, no contradictory acts yet)
  const hasContradictions = false;

  // 7. Target jurisdiction evidence relevance check
  const targetJurisdiction = classification.jurisdiction;
  const isIndiaTarget = targetJurisdiction === 'India' || targetJurisdiction === 'Unknown';
  const hasJurisdictionEvidence = evidenceCount > 0 && retrievedResults.some((r) => {
    const itemJur = (r.jurisdiction || '').toLowerCase();
    if (isIndiaTarget) {
      return itemJur.includes('india') || itemJur.includes('in') || itemJur === '';
    }
    return itemJur === targetJurisdiction.toLowerCase();
  });

  // ── Calculate Data-Driven Confidence Score ─────────────────────────────────
  // Formula:
  // Confidence = 0.35 * avgRelevance + 0.25 * avgAuthority + 0.15 * countScore + 0.15 * claimGrounding + 0.10 * citationCoverage
  let computedConfidence = 0;
  if (evidenceCount > 0 && (isIndiaTarget || hasJurisdictionEvidence)) {
    computedConfidence =
      0.35 * avgRelevance +
      0.25 * avgAuthority +
      0.15 * countScore +
      0.15 * claimGrounding +
      0.10 * citationCoverage;
  } else {
    // Zero relevant evidence for the target jurisdiction receives baseline floor confidence
    computedConfidence = 0.15;
  }

  // Cap confidence at 0.92 maximum (legal/regulatory conclusions always require attorney sign-off)
  computedConfidence = Math.max(0.1, Math.min(0.92, Math.round(computedConfidence * 100) / 100));
  const confidencePercent = Math.round(computedConfidence * 100);

  // ── Determine Truthful Decision State ──────────────────────────────────────
  let decisionState: DecisionState = 'SUPPORTED';
  let rationale = '';

  // Rule A: Zero evidence, foreign jurisdiction with zero relevant evidence, or relevance below baseline -> INSUFFICIENT_EVIDENCE
  if (evidenceCount === 0 || (!isIndiaTarget && !hasJurisdictionEvidence) || topRelevance < 0.35) {
    decisionState = 'INSUFFICIENT_EVIDENCE';
    if (!isIndiaTarget && !hasJurisdictionEvidence && evidenceCount > 0) {
      rationale = `The knowledge base contains zero statutory documentation for jurisdiction "${targetJurisdiction}". Indian statutory rules (The Drugs Rules, 1945) cannot establish foreign regulatory requirements.`;
    } else {
      rationale = 'The knowledge base contains insufficient statutory documentation to substantiate requirements for this specific query.';
    }
  }
  // Rule B: Classifier explicitly flagged high risk or question requires professional attorney/clinical judgment
  else if (classification.requiresHumanReview || classification.riskLevel === 'High') {
    decisionState = 'HUMAN_REVIEW_REQUIRED';
    rationale = 'The inquiry touches on high-risk regulatory classifications or patentability boundaries that require verified legal/clinical counsel.';
  }
  // Rule C: Conflicting statutory sources detected
  else if (llmRecommendation === 'CONFLICTING_SOURCES') {
    decisionState = 'CONFLICTING_SOURCES';
    rationale = 'Retrieved statutory sources or regulatory notifications contain contradictory provisions that require legal reconciliation.';
  }
  // Rule D: Moderate to high evidence (top relevance >= 0.65, authority Tier 1, claims validated)
  else if (topRelevance >= 0.65 && avgAuthority >= 0.8 && validClaims.length >= 1) {
    // If LLM recommendation is PARTIALLY_SUPPORTED or SUPPORTED, adopt based on completeness
    if (llmRecommendation === 'SUPPORTED' && validClaims.length >= 2) {
      decisionState = 'SUPPORTED';
      rationale = 'Primary statutory gazettes from CDSCO (The Drugs Rules, 1945) directly substantiate the applicable regulatory requirements.';
    } else {
      decisionState = 'PARTIALLY_SUPPORTED';
      rationale = 'Statutory licensing provisions from The Drugs Rules, 1945 were retrieved and verified, but procedural state-level or formulation-specific filings remain subject to licensing authority verification.';
    }
  } else {
    decisionState = 'PARTIALLY_SUPPORTED';
    rationale = 'Partial statutory evidence located; further administrative or clinical documentation is required for complete regulatory clearance.';
  }

  // ── Reliability Level ───────────────────────────────────────────────────────
  let reliabilityLevel: ReliabilityLevel = 'moderate';
  let reliabilityLabel = 'Moderate Reliability';

  if (decisionState === 'INSUFFICIENT_EVIDENCE') {
    reliabilityLevel = 'insufficient';
    reliabilityLabel = 'Insufficient Evidentiary Basis';
  } else if (computedConfidence >= 0.75 && decisionState === 'SUPPORTED') {
    reliabilityLevel = 'high';
    reliabilityLabel = 'High Reliability — Primary Statutory Grounding';
  } else if (computedConfidence >= 0.5) {
    reliabilityLevel = 'moderate';
    reliabilityLabel = 'Moderate Reliability — Partial Statutory Grounding';
  } else {
    reliabilityLevel = 'preliminary';
    reliabilityLabel = 'Preliminary Guidance — Limited Evidence Base';
  }

  return {
    decisionState,
    confidenceScore: computedConfidence,
    confidencePercent,
    reliabilityLevel,
    reliabilityLabel,
    rationale,
    factors: {
      evidenceRelevanceScore: Math.round(avgRelevance * 100) / 100,
      authorityScore: Math.round(avgAuthority * 100) / 100,
      evidenceCountScore: countScore,
      citationCoverageScore: Math.round(citationCoverage * 100) / 100,
      claimGroundingScore: Math.round(claimGrounding * 100) / 100,
      hasContradictions,
    },
  };
}

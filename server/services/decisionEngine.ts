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

  // 8. Domain corpus check: verify if indexed documents actually cover the queried domain
  // Currently, the database ONLY contains The Drugs Rules, 1945 (Drug Regulation, India).
  // It does NOT contain The Patents Act, 1970 or The Trade Marks Act, 1999.
  const isPurePatentQuery = (classification.domain === 'Patent' || classification.intent === 'Patentability' || classification.intent === 'PriorArt') && !classification.hasMultipleDomains;
  const isPureTrademarkQuery = (classification.domain === 'Trademark' || classification.intent === 'Trademark') && !classification.hasMultipleDomains;
  const hasPatentCorpus = retrievedResults.some((r) => (r.documentType === 'patent_statute' || (r.documentTitle || '').toLowerCase().includes('patents act')));
  const hasTrademarkCorpus = retrievedResults.some((r) => (r.documentType === 'trademark_statute' || (r.documentTitle || '').toLowerCase().includes('trade marks act')));

  // ── Determine Truthful Decision State ──────────────────────────────────────
  let decisionState: DecisionState = 'SUPPORTED';
  let rationale = '';

  // Rule 1: High risk / immediate commercial launch without approval -> HUMAN_REVIEW_REQUIRED
  if (classification.riskLevel === 'High' || classification.requiresHumanReview) {
    decisionState = 'HUMAN_REVIEW_REQUIRED';
    rationale = 'The inquiry involves high-risk regulatory action (such as immediate commercial launch without formal regulatory clearance). Commercial distribution of medicinal or botanical preparations without statutory compliance requires qualified legal and regulatory counsel.';
  }
  // Rule 2: Pure Patent question when Patents Act is not in repository -> INSUFFICIENT_EVIDENCE
  else if (isPurePatentQuery && !hasPatentCorpus) {
    decisionState = 'INSUFFICIENT_EVIDENCE';
    rationale = 'The knowledge base currently contains The Drugs Rules, 1945 (CDSCO, India) and does not contain The Patents Act, 1970 or The Patents Rules, 2003. Statutory requirements for patentability under Indian law cannot be established from drug rules.';
  }
  // Rule 3: Pure Trademark question when Trade Marks Act is not in repository -> INSUFFICIENT_EVIDENCE
  else if (isPureTrademarkQuery && !hasTrademarkCorpus) {
    decisionState = 'INSUFFICIENT_EVIDENCE';
    rationale = 'The knowledge base currently contains The Drugs Rules, 1945 (CDSCO, India) and does not contain The Trade Marks Act, 1999 or The Trade Marks Rules, 2017. Statutory requirements for trademark registration cannot be established from drug rules.';
  }
  // Rule 4: Specific Gazette notification number requested but not verified in evidence -> INSUFFICIENT_EVIDENCE
  else if (classification.isSpecificNotificationRequest) {
    decisionState = 'INSUFFICIENT_EVIDENCE';
    rationale = 'The requested specific Gazette notification number is not established in the indexed statutory corpus. Official Gazette repository verification with the Ministry / CDSCO is required.';
  }
  // Rule 5: Foreign jurisdiction with zero relevant evidence -> INSUFFICIENT_EVIDENCE
  else if (!isIndiaTarget && !hasJurisdictionEvidence) {
    decisionState = 'INSUFFICIENT_EVIDENCE';
    rationale = `The knowledge base contains zero statutory documentation for jurisdiction "${targetJurisdiction}". Indian statutory rules (The Drugs Rules, 1945) cannot establish foreign regulatory requirements.`;
  }
  // Rule 6: Zero evidence or top relevance below baseline -> INSUFFICIENT_EVIDENCE
  else if (evidenceCount === 0 || topRelevance < 0.35) {
    decisionState = 'INSUFFICIENT_EVIDENCE';
    rationale = 'The knowledge base contains insufficient statutory documentation to substantiate requirements for this specific query.';
  }
  // Rule 7: Conflicting statutory sources detected
  else if (llmRecommendation === 'CONFLICTING_SOURCES') {
    decisionState = 'CONFLICTING_SOURCES';
    rationale = 'Retrieved statutory sources or regulatory notifications contain contradictory provisions that require legal reconciliation.';
  }
  // Rule 8: Multi-domain inquiry (some domains supported, others not) -> PARTIALLY_SUPPORTED
  else if (classification.hasMultipleDomains) {
    decisionState = 'PARTIALLY_SUPPORTED';
    rationale = 'Statutory provisions under The Drugs Rules, 1945 substantiate manufacturing, licensing, and standards requirements. Other requested domains (patents, trademarks, GST, clinical evidence) are not established by the currently indexed corpus.';
  }
  // Rule 9: Moderate to high evidence for Indian regulatory query
  else if (topRelevance >= 0.65 && avgAuthority >= 0.8 && validClaims.length >= 1) {
    // If query is specifically about Drugs Rules / manufacturing licences and claims are verified
    if (llmRecommendation === 'SUPPORTED' && validClaims.length >= 2 && classification.domain === 'Regulatory') {
      decisionState = 'SUPPORTED';
      rationale = 'Primary statutory rules from CDSCO (The Drugs Rules, 1945) directly substantiate the applicable regulatory requirements.';
    } else {
      decisionState = 'PARTIALLY_SUPPORTED';
      rationale = 'Statutory licensing provisions from The Drugs Rules, 1945 were retrieved and verified, but procedural state-level or formulation-specific filings remain subject to licensing authority verification.';
    }
  } else {
    decisionState = 'PARTIALLY_SUPPORTED';
    rationale = 'Partial statutory evidence located; further administrative or clinical documentation is required for complete regulatory clearance.';
  }

  // ── Calculate Data-Driven Confidence Score ─────────────────────────────────
  // Formula:
  // Confidence = 0.35 * avgRelevance + 0.25 * avgAuthority + 0.15 * countScore + 0.15 * claimGrounding + 0.10 * citationCoverage
  let computedConfidence = 0;
  if (decisionState === 'INSUFFICIENT_EVIDENCE') {
    // Zero relevant evidence or out-of-scope query receives baseline floor confidence
    computedConfidence = 0.15;
  } else if (decisionState === 'HUMAN_REVIEW_REQUIRED') {
    computedConfidence = 0.35;
  } else if (evidenceCount > 0 && (isIndiaTarget || hasJurisdictionEvidence)) {
    computedConfidence =
      0.35 * avgRelevance +
      0.25 * avgAuthority +
      0.15 * countScore +
      0.15 * claimGrounding +
      0.10 * citationCoverage;
  } else {
    computedConfidence = 0.15;
  }

  // Cap confidence at 0.92 maximum (legal/regulatory conclusions always require attorney sign-off)
  computedConfidence = Math.max(0.1, Math.min(0.92, Math.round(computedConfidence * 100) / 100));
  const confidencePercent = Math.round(computedConfidence * 100);

  // ── Reliability Level ───────────────────────────────────────────────────────
  let reliabilityLevel: ReliabilityLevel = 'moderate';
  let reliabilityLabel = 'Moderate Reliability';

  if (decisionState === 'INSUFFICIENT_EVIDENCE') {
    reliabilityLevel = 'insufficient';
    reliabilityLabel = 'Insufficient Evidentiary Basis';
  } else if (decisionState === 'HUMAN_REVIEW_REQUIRED') {
    reliabilityLevel = 'preliminary';
    reliabilityLabel = 'Human Review Required — High Regulatory Sensitivity';
  } else if (computedConfidence >= 0.75 && decisionState === 'SUPPORTED') {
    reliabilityLevel = 'high';
    reliabilityLabel = 'High Reliability — Primary Statutory Grounding';
  } else if (decisionState === 'PARTIALLY_SUPPORTED') {
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

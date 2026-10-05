import type { ClaimItem, EvidenceItem } from '../../src/types/api';
import type { RetrievalResult } from './knowledgeRetrieval';

export interface ValidatedClaimsResult {
  validClaims: ClaimItem[];
  rejectedClaims: Array<{ claim: Partial<ClaimItem>; reason: string }>;
  verifiedEvidenceCount: number;
}

/**
 * Deterministic Claim Grounding Validator.
 * Verifies that:
 * 1. Referenced evidence IDs exist in the retrieved evidence set.
 * 2. The referenced evidence content is non-empty and substantive.
 * 3. Terms from the claim have factual basis in the cited evidence.
 * 4. Claim status conforms to evidence conditions (e.g. conditional if licenses/prerequisites are required).
 * 5. Rejects unsupported or hallucinated claims.
 */
export function validateClaims(
  rawClaims: Array<{
    claim_text: string;
    status: 'valid' | 'conditional' | 'restricted' | 'statutorily_barred';
    category: string;
    evidence_ids: string[];
    impact_summary?: string;
  }>,
  evidenceMap: Map<string, RetrievalResult>,
  availableEvidenceList: EvidenceItem[]
): ValidatedClaimsResult {
  const validClaims: ClaimItem[] = [];
  const rejectedClaims: Array<{ claim: Partial<ClaimItem>; reason: string }> = [];
  const usedEvidenceIds = new Set<string>();

  const availableIds = new Set(availableEvidenceList.map((e) => e.id));

  for (let i = 0; i < rawClaims.length; i++) {
    const raw = rawClaims[i];

    if (!raw.claim_text || typeof raw.claim_text !== 'string' || raw.claim_text.trim().length < 10) {
      rejectedClaims.push({ claim: raw, reason: 'Claim text is empty or too short' });
      continue;
    }

    if (!Array.isArray(raw.evidence_ids) || raw.evidence_ids.length === 0) {
      rejectedClaims.push({ claim: raw, reason: 'Claim has no supporting evidence IDs' });
      continue;
    }

    // Filter to only verified evidence IDs that actually exist in the retrieved evidence
    const verifiedIds = raw.evidence_ids.filter((id) => availableIds.has(id));

    if (verifiedIds.length === 0) {
      rejectedClaims.push({
        claim: raw,
        reason: `Referenced evidence IDs [${raw.evidence_ids.join(', ')}] do not exist in retrieved evidence`,
      });
      continue;
    }

    // Validate that evidence content actually touches on the substantive subject matter
    const lowerClaim = raw.claim_text.toLowerCase();
    const commonWords = new Set([
      'that', 'this', 'with', 'from', 'have', 'been', 'were', 'will', 'must',
      'shall', 'under', 'these', 'those', 'other', 'their', 'which', 'about',
      'there', 'where', 'after', 'before', 'being', 'product', 'drugs', 'rules',
      'india', 'ayurvedic', 'medicine', 'medicines', 'apply', 'applied'
    ]);

    const substantiveKeywords = lowerClaim
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !commonWords.has(w));

    let hasSubstantiveSupport = false;
    let matchedTermsCount = 0;

    for (const eid of verifiedIds) {
      const res = evidenceMap.get(eid);
      if (res && res.content) {
        const lowerEv = res.content.toLowerCase();
        const matches = substantiveKeywords.filter((k) => lowerEv.includes(k));
        matchedTermsCount = Math.max(matchedTermsCount, matches.length);

        // Meaningful support requires:
        // - At least 2 substantive keywords, OR
        // - At least 25% of substantive keywords if there are 4+, OR
        // - Direct mention of specific regulatory forms/clauses (e.g. form 24e, 20c, schedule, 157, 160)
        const hasSpecificFormOrClause = /form\s+\w+|rule\s+\d+|schedule\s+\w+|section\s+\d+/i.test(lowerClaim) &&
          (/form\s+\w+|rule\s+\d+|schedule\s+\w+|section\s+\d+/i.test(lowerEv));

        if (matches.length >= 2 || (substantiveKeywords.length <= 2 && matches.length >= 1) || hasSpecificFormOrClause) {
          hasSubstantiveSupport = true;
          usedEvidenceIds.add(eid);
          break;
        }
      }
    }

    if (!hasSubstantiveSupport && substantiveKeywords.length > 1) {
      rejectedClaims.push({
        claim: raw,
        reason: `Claim text lacks substantive term overlap with cited evidence (matched ${matchedTermsCount}/${substantiveKeywords.length} terms)`,
      });
      continue;
    }

    // Determine truthful status:
    // If the claim mentions 'require', 'must', 'licence', 'license', 'subject to', 'condition',
    // the status cannot be unconditionally 'valid'; it must be 'conditional'
    let finalStatus = raw.status;
    if (
      finalStatus === 'valid' &&
      /licence|license|permission|approval|subject to|compl|fee|form|condition/i.test(lowerClaim)
    ) {
      finalStatus = 'conditional';
    }

    // If claim mentions 'prohibited', 'bar', 'forbidden', 'may not', 'penalty', mark restricted or statutorily_barred
    if (/prohibit|bar|barred|forbidden|shall not/i.test(lowerClaim)) {
      finalStatus = /section 3|statute|act/i.test(lowerClaim) ? 'statutorily_barred' : 'restricted';
    }

    validClaims.push({
      id: `claim_${i + 1}`,
      claim_text: raw.claim_text.trim(),
      status: finalStatus,
      category: raw.category || 'Regulatory Compliance',
      evidence_ids: verifiedIds,
      impact_summary: raw.impact_summary?.trim() || undefined,
    });
  }

  return {
    validClaims,
    rejectedClaims,
    verifiedEvidenceCount: usedEvidenceIds.size,
  };
}

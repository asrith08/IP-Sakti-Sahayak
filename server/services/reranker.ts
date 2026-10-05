import type { RetrievalResult } from './knowledgeRetrieval';

export interface RerankOptions {
  topK?: number;
  targetJurisdiction?: string;
  queryIntent?: string;
}

/**
 * Deterministic multi-factor reranker.
 * Analyzes semantic relevance, exact query term density, regulatory terminology overlap,
 * authority tier, section specificity, evidence completeness, and diversity.
 */
export function rerankEvidence(
  candidates: RetrievalResult[],
  query: string,
  options: RerankOptions = {}
): RetrievalResult[] {
  const { topK = 6, targetJurisdiction = 'India', queryIntent } = options;

  if (candidates.length === 0) return [];

  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  // Key regulatory and IP vocabulary for scoring domain overlap
  const regulatoryKeywords = [
    'ayurvedic', 'siddha', 'unani', 'herbal', 'botanical', 'extract',
    'licence', 'license', 'form', '24e', '20c', 'manufacture', 'sale',
    'import', 'loan licence', 'inspection', 'fee', 'standards',
    'schedule', 'rules', 'act', 'section', 'cdsco', 'ayush',
    'patent', 'patentability', 'prior art', 'compliance', 'labelling', 'label'
  ];

  // Map to hold diversity penalties by document page
  const pageChunkCount = new Map<string, number>();

  const scoredCandidates = candidates.map((item) => {
    const lowerContent = item.content.toLowerCase();
    const lowerSection = (item.sectionTitle ?? '').toLowerCase();
    const lowerSub = (item.subsectionTitle ?? '').toLowerCase();
    const fullText = `${lowerContent} ${lowerSection} ${lowerSub}`;

    // 1. Semantic score baseline (0 to 1)
    const semantic = Math.max(0, Math.min(1, item.semanticScore || 0));

    // 2. Exact query token coverage
    const matchedTokens = queryWords.filter((w) => fullText.includes(w));
    const tokenCoverage = queryWords.length > 0 ? matchedTokens.length / queryWords.length : 0;

    // 3. Regulatory / IP domain keyword density
    const matchedRegKeywords = regulatoryKeywords.filter((k) => fullText.includes(k));
    const regDensity = Math.min(1, matchedRegKeywords.length / 5);

    // 4. Section relevance (specific rule or schedule name in section title)
    let sectionScore = 0;
    if (item.sectionTitle && item.sectionTitle.trim().length > 3) {
      sectionScore = 0.1;
      if (/part|schedule|rule|form|section/i.test(item.sectionTitle)) {
        sectionScore += 0.1;
      }
    }

    // 5. Authority tier weighting
    // Tier 1 = 1.0 (Statutory CDSCO/Govt), Tier 2 = 0.8, Tier 3 = 0.5, Tier 4 = 0.2
    const tier = item.authorityTier ?? 3;
    let authorityWeight = 0.5;
    if (tier === 1) authorityWeight = 1.0;
    else if (tier === 2) authorityWeight = 0.8;
    else if (tier === 3) authorityWeight = 0.5;
    else authorityWeight = 0.2;

    // 6. Jurisdiction match
    let jurisdictionScore = 0;
    const itemJurisdiction = (item.jurisdiction ?? '').toLowerCase();
    const requested = (targetJurisdiction ?? '').toLowerCase();

    if (requested.includes('in') || requested.includes('india')) {
      if (itemJurisdiction.includes('india') || itemJurisdiction.includes('in')) {
        jurisdictionScore = 0.15;
      } else if (itemJurisdiction.length > 0) {
        // Penalty for non-Indian evidence on India query
        jurisdictionScore = -0.2;
      }
    }

    // 7. Completeness / quality penalty
    // Penalize chunks that are just table headers, single lines, or < 80 chars
    let qualityScore = 0;
    if (item.content.length < 90) {
      qualityScore = -0.25;
    } else if (item.content.length >= 250) {
      qualityScore = 0.05;
    }

    // 8. Intent alignment
    let intentScore = 0;
    if (queryIntent === 'RegulatoryCompliance' && /licence|license|form|manufacture|rule|comply/i.test(fullText)) {
      intentScore = 0.1;
    } else if (queryIntent === 'Patentability' && /patent|novel|prior art|invention|section 3/i.test(fullText)) {
      intentScore = 0.1;
    }

    // Combine factors with transparent deterministic formula
    // Weights: Semantic (0.35) + Token Coverage (0.25) + Reg Density (0.15) + Authority (0.15) + Section (0.05) + Quality/Intent/Jurisdiction adjustments
    let compositeScore =
      0.35 * semantic +
      0.25 * tokenCoverage +
      0.15 * regDensity +
      0.15 * authorityWeight +
      sectionScore +
      jurisdictionScore +
      qualityScore +
      intentScore;

    // 9. Diversity penalty for excessive chunks from the same page
    const pageKey = `${item.documentId}_p${item.pageNumber ?? 0}`;
    const countForPage = pageChunkCount.get(pageKey) ?? 0;
    if (countForPage > 0) {
      compositeScore -= countForPage * 0.08; // progressive penalty for repeated page
    }
    pageChunkCount.set(pageKey, countForPage + 1);

    // Normalize final score to [0, 1]
    const finalScore = Math.max(0, Math.min(1, Math.round(compositeScore * 10000) / 10000));

    return {
      ...item,
      relevanceScore: finalScore,
    };
  });

  // Sort descending by calculated relevance score
  scoredCandidates.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Return top K candidates
  return scoredCandidates.slice(0, topK);
}

import express, { Request, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { classifyQuestion } from '../services/questionClassifier';
import { retrieveKnowledge } from '../services/knowledgeRetrieval';
import { rerankEvidence } from '../services/reranker';
import { buildEvidenceContext } from '../services/evidenceBuilder';
import { generateGroundedAnalysis } from '../services/groundedGeneration';
import { validateClaims } from '../services/claimValidator';
import { validateCitations } from '../services/citationValidator';
import { evaluateDecision } from '../services/decisionEngine';
import { verifyChecklistAndNextSteps } from '../services/checklistGenerator';
import { getSupabaseAdmin } from '../services/supabaseAdmin';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ClassificationResult,
  AnswerSection,
} from '../../src/types/api';

const router = express.Router();

function mapDomain(domain: string): ClassificationResult['domain'] {
  switch (domain) {
    case 'Patent':
      return 'PATENT';
    case 'Trademark':
      return 'TRADEMARK';
    case 'Copyright':
      return 'COPYRIGHT';
    case 'Regulatory':
      return 'REGULATORY';
    case 'Safety':
      return 'COMPLIANCE';
    default:
      return 'GENERAL';
  }
}

function mapJurisdiction(
  jurisdiction: string,
  requested: AnalyzeRequest['jurisdiction']['code'],
): ClassificationResult['jurisdiction'] {
  switch (jurisdiction) {
    case 'India':
      return 'IN';
    case 'US':
      return 'US';
    case 'EU':
      return 'EU';
    case 'Global':
      return 'WO';
    default:
      return requested;
  }
}

function validateRequest(body: unknown): body is AnalyzeRequest {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const request = body as Partial<AnalyzeRequest>;

  if (typeof request.question !== 'string' || !request.question.trim()) {
    return false;
  }

  if (!request.jurisdiction || typeof request.jurisdiction !== 'object') {
    return false;
  }

  if (
    typeof request.jurisdiction.type !== 'string' ||
    typeof request.jurisdiction.code !== 'string'
  ) {
    return false;
  }

  if (typeof request.guidance_type !== 'string') {
    return false;
  }

  if (typeof request.language !== 'string') {
    return false;
  }

  if (
    request.product !== undefined &&
    (
      !request.product ||
      typeof request.product !== 'object' ||
      typeof request.product.name !== 'string'
    )
  ) {
    return false;
  }

  return true;
}

router.post(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!validateRequest(req.body)) {
        return res.status(400).json({
          error: 'Invalid analysis request',
        });
      }

      const request = req.body;
      const authenticatedRequest = req as AuthenticatedRequest;
      const userId = authenticatedRequest.supabaseUser?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Authenticated user not found',
        });
      }

      // ── Step 1: Question Classification ────────────────────────────────────
      const classification = classifyQuestion(request.question);
      const normalizedQuery =
        classification.normalizedQuery?.trim() || request.question.trim();

      const retrievalJurisdiction =
        classification.jurisdiction !== 'Unknown'
          ? classification.jurisdiction
          : (request.jurisdiction.code === 'IN' ? 'India' : request.jurisdiction.code);

      // Check for recent duplicate request by same user within 15 seconds (Strict Mode / double-click guard)
      const supabase = getSupabaseAdmin();
      const recentThreshold = new Date(Date.now() - 15000).toISOString();
      const { data: recentRequests } = await supabase
        .from('analysis_requests')
        .select('id, created_at, request')
        .eq('user_id', userId)
        .gte('created_at', recentThreshold)
        .order('created_at', { ascending: false })
        .limit(3);

      const matchingRequest = (recentRequests || []).find((r: any) => {
        const reqObj = r.request as Partial<AnalyzeRequest>;
        return reqObj?.question?.trim().toLowerCase() === request.question.trim().toLowerCase();
      });

      if (matchingRequest) {
        const { data: existingAnalysis } = await supabase
          .from('analyses')
          .select('result')
          .eq('request_id', matchingRequest.id)
          .single();

        if (existingAnalysis?.result) {
          console.log(`[IP-SAKTI] Idempotency guard: returning existing analysis for request ${matchingRequest.id}`);
          return res.status(200).json(existingAnalysis.result);
        }
      }

      // ── Step 2: Hybrid Knowledge Retrieval ─────────────────────────────────
      // If the query is purely about Patent law or Trademark law, the knowledge base (which only contains
      // The Drugs Rules, 1945) does not contain the statutory corpus for patents or trademarks.
      // We must NOT misattribute drug rules excerpts as patent/trademark law.
      const isPurePatent = (classification.domain === 'Patent' || classification.intent === 'Patentability' || classification.intent === 'PriorArt') && !classification.hasMultipleDomains;
      const isPureTrademark = (classification.domain === 'Trademark' || classification.intent === 'Trademark') && !classification.hasMultipleDomains;
      const isPureForeign = retrievalJurisdiction !== 'India' && (retrievalJurisdiction as string) !== 'IN';

      let candidates: any[] = [];
      if (!isPurePatent && !isPureTrademark && !isPureForeign) {
        candidates = await retrieveKnowledge(normalizedQuery, {
          jurisdiction: retrievalJurisdiction,
          limit: 25,
        });
      }

      // ── Step 3: Multi-Factor Deterministic Reranking ────────────────────────
      const rerankedResults = rerankEvidence(candidates, normalizedQuery, {
        topK: 6,
        targetJurisdiction: retrievalJurisdiction,
        queryIntent: classification.intent,
      });

      // ── Step 4: Evidence Context & Injection Defense ────────────────────────
      const { promptText, evidenceItems, evidenceMap } = buildEvidenceContext(rerankedResults);
      const availableEvidenceIds = evidenceItems.map((e) => e.id);

      // ── Step 5: Grounded LLM Generation ────────────────────────────────────
      const llmOutput = await generateGroundedAnalysis(
        request,
        promptText,
        availableEvidenceIds,
        evidenceMap,
      );

      // ── Step 6: Grounding & Claim Validation ────────────────────────────────
      const { validClaims } = validateClaims(
        llmOutput.claims || [],
        evidenceMap,
        evidenceItems,
      );

      // ── Step 7: Citation Integrity & Verification ──────────────────────────
      const verifiedCitations = validateCitations(
        llmOutput.citations || [],
        evidenceMap,
      );

      // ── Step 8: Deterministic Decision State & Confidence Engine ───────────
      const decisionEval = evaluateDecision({
        classification,
        retrievedResults: rerankedResults,
        evidenceItems,
        validClaims,
        citations: verifiedCitations,
        llmRecommendation: llmOutput.decision_state_recommendation,
      });

      // ── Step 9: Grounded Checklist & Next Steps ────────────────────────────
      const { checklist, next_steps } = verifyChecklistAndNextSteps({
        rawChecklist: (llmOutput.checklist || []) as any,
        rawNextSteps: (llmOutput.next_steps || []) as any,
        evidenceMap,
        availableEvidence: evidenceItems,
      });

      // ── Step 10: Assemble Synthesized Answer Section ───────────────────────
      const combinedWarnings = [
        ...(llmOutput.warnings || []),
        ...(classification.requiresHumanReview
          ? ['Human review is recommended based on high regulatory sensitivity.']
          : []),
        ...(decisionEval.decisionState === 'INSUFFICIENT_EVIDENCE'
          ? [decisionEval.rationale]
          : []),
        ...(classification.hasMultipleDomains && classification.unsupportedDomains && classification.unsupportedDomains.length > 0
          ? [`Not established by current knowledge base: ${classification.unsupportedDomains.join('; ')}.`]
          : []),
      ];

      // Remove duplicate warnings
      const uniqueWarnings = Array.from(new Set(combinedWarnings.map((w) => w.trim()))).filter(Boolean);

      const answer: AnswerSection = {
        summary: llmOutput.summary,
        details: llmOutput.details && llmOutput.details.length > 0
          ? llmOutput.details
          : evidenceItems.map((item) => `${item.document_name} — ${item.section_or_rule}: ${item.excerpt}`),
        warnings: uniqueWarnings,
        statutoryBasis: evidenceItems.length > 0 ? ['The Drugs Rules, 1945'] : [],
      };

      const classificationResult: ClassificationResult = {
        domain: mapDomain(classification.domain),
        jurisdiction: mapJurisdiction(
          classification.jurisdiction,
          request.jurisdiction.code,
        ),
        confidence: decisionEval.confidenceScore,
        subdomains: [
          classification.intent,
          classification.productCategory,
        ].filter(Boolean),
        rationale: `Classified as domain=${classification.domain}, jurisdiction=${classification.jurisdiction}, intent=${classification.intent}. Decision: ${decisionEval.decisionState} (${decisionEval.reliabilityLabel}).`,
      };

      // ── Step 11: Database Persistence ──────────────────────────────────────
      const { data: requestData, error: requestError } = await supabase
        .from('analysis_requests')
        .insert([
          {
            user_id: userId,
            request,
          },
        ])
        .select('id')
        .single();

      if (requestError || !requestData) {
        console.error('Failed to persist analysis request:', requestError);
        return res.status(500).json({
          error: 'Failed to persist analysis request',
        });
      }

      const response: AnalyzeResponse = {
        request_id: requestData.id,
        status: 'completed',
        timestamp: new Date().toISOString(),
        classification: classificationResult,
        original_request: request,
        answer,
        claims: validClaims,
        evidence: evidenceItems,
        citations: verifiedCitations,
        checklist,
        warnings: uniqueWarnings,
        next_steps,
        decision_state: decisionEval.decisionState,
        confidence_score: decisionEval.confidenceScore,
        reliability_level: decisionEval.reliabilityLevel,
      };

      const { data: analysisData, error: analysisError } = await supabase
        .from('analyses')
        .insert([
          {
            user_id: userId,
            request_id: requestData.id,
            status: 'completed',
            result: response,
          },
        ])
        .select('id')
        .single();

      if (analysisError) {
        console.error('Failed to persist analysis:', analysisError);
        return res.status(500).json({
          error: 'Failed to persist analysis',
        });
      }

      // Persist checklist
      if (checklist.length > 0 && analysisData?.id) {
        const { error: chkError } = await supabase
          .from('checklists')
          .insert([
            {
              analysis_id: analysisData.id,
              user_id: userId,
              checklist,
            },
          ]);
        if (chkError) {
          console.warn('Checklist persistence warning:', chkError.message);
        }
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error('Analysis route error:', error);
      return next(error);
    }
  },
);

// ── GET /api/v1/analyze/:id ──────────────────────────────────────────────────
// Retrieve persisted analysis by dossier ID (request_id or analysis UUID)
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseAdmin();
      const authenticatedRequest = req as AuthenticatedRequest;
      const userId = authenticatedRequest.supabaseUser?.id;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Valid dossier ID is required' });
      }

      // First check analyses by request_id or id
      let query = supabase
        .from('analyses')
        .select('id, request_id, user_id, status, result, created_at')
        .or(`request_id.eq.${id},id.eq.${id}`);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('[IP-SAKTI] Error fetching analysis by ID:', error.message);
        return res.status(500).json({ error: 'Failed to query analysis record' });
      }

      if (!data || !data.result) {
        return res.status(404).json({ error: 'Analysis record not located in database' });
      }

      return res.status(200).json(data.result);
    } catch (err) {
      console.error('[IP-SAKTI] GET analyze by ID error:', err);
      return next(err);
    }
  },
);

export default router;

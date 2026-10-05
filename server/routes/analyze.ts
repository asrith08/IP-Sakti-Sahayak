import express, { Request, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { classifyQuestion } from '../services/questionClassifier';
import { retrieveKnowledge } from '../services/knowledgeRetrieval';
import { getSupabaseAdmin } from '../services/supabaseAdmin';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ClassificationResult,
  AnswerSection,
  EvidenceItem,
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

function buildEvidenceItem(
  result: Awaited<ReturnType<typeof retrieveKnowledge>>[number],
  index: number,
): EvidenceItem {
  const documentName =
    result.documentTitle ??
    result.sourceName ??
    'Knowledge-base document';

  const section =
    result.subsectionTitle ??
    result.sectionTitle ??
    (result.pageNumber !== null ? `Page ${result.pageNumber}` : 'Retrieved section');

  return {
    id: `evidence_${index + 1}`,
    title: documentName,
    excerpt: result.content,
    authority: result.organization ?? result.sourceName ?? 'Knowledge base',
    document_name: documentName,
    document_version: null,
    section_or_rule: section,
    publication_date: result.publicationDate,
    citation_id: result.chunkId,
    url: result.sourceUrl ?? result.canonicalUrl,
    authenticity_hash: null,
  };
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

      const classification = classifyQuestion(request.question);

      const normalizedQuery =
        classification.normalizedQuery?.trim() || request.question.trim();

      const retrievalJurisdiction =
        classification.jurisdiction !== 'Unknown'
          ? classification.jurisdiction
          : undefined;

      const retrievalResults = await retrieveKnowledge(normalizedQuery, {
        jurisdiction: retrievalJurisdiction,
        limit: 10,
      });

      const evidence: EvidenceItem[] = retrievalResults.map(
        buildEvidenceItem,
      );

      const answer: AnswerSection = {
        summary:
          evidence.length > 0
            ? `Retrieved ${evidence.length} relevant evidence item(s) from the knowledge base for this question.`
            : 'Insufficient evidence was retrieved from the knowledge base to support an answer.',
        details: evidence.map((item) => {
          const location =
            item.section_or_rule ??
            'retrieved section';

          return `${item.document_name} — ${location}: ${item.excerpt}`;
        }),
        warnings:
          evidence.length === 0
            ? ['No relevant evidence was retrieved from the knowledge base.']
            : [],
        statutoryBasis: [],
      };

      const classificationResult: ClassificationResult = {
        domain: mapDomain(classification.domain),
        jurisdiction: mapJurisdiction(
          classification.jurisdiction,
          request.jurisdiction.code,
        ),
        confidence: classification.confidence,
        subdomains: [
          classification.intent,
          classification.productCategory,
        ].filter(Boolean),
        rationale: `Deterministic classifier identified jurisdiction=${classification.jurisdiction}, domain=${classification.domain}, intent=${classification.intent}, productCategory=${classification.productCategory}.`,
      };

      const supabase = getSupabaseAdmin();

      const {
        data: requestData,
        error: requestError,
      } = await supabase
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
        claims: [],
        evidence,
        citations: [],
        checklist: [],
        warnings:
          classification.requiresHumanReview
            ? [
                'Human review is recommended based on the classifier result.',
                ...answer.warnings,
              ]
            : answer.warnings,
        next_steps: [],
      };

      const { error: analysisError } = await supabase
        .from('analyses')
        .insert([
          {
            user_id: userId,
            request_id: requestData.id,
            status: 'completed',
            result: response,
          },
        ]);

      if (analysisError) {
        console.error('Failed to persist analysis:', analysisError);
        return res.status(500).json({
          error: 'Failed to persist analysis',
        });
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error('Analysis route error:', error);
      return next(error);
    }
  },
);

export default router;

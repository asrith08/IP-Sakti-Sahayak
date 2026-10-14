import express, { Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { classifyQuestion } from '../services/questionClassifier.js';
import { retrieveKnowledge } from '../services/knowledgeRetrieval.js';
import { getSupabaseAdmin } from '../services/supabaseAdmin.js';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ClassificationResult,
  AnswerSection,
  ClaimItem,
  EvidenceItem,
  CitationItem,
  ChecklistItem,
  NextStepItem
} from '../../src/types/api.js';

const router = express.Router();

function mapDomain(domain: string): any {
  const mapping: Record<string, any> = {
    Patent: 'PATENT',
    Trademark: 'TRADEMARK',
    Copyright: 'COPYRIGHT',
    Regulatory: 'REGULATORY',
    Safety: 'COMPLIANCE',
    Product: 'GENERAL',
    General: 'GENERAL',
    Unknown: 'GENERAL'
  };

  return mapping[domain] || 'GENERAL';
}

function mapJurisdiction(jur: string, reqJurCode?: string): any {
  const mapping: Record<string, any> = {
    India: 'IN',
    US: 'US',
    EU: 'EU',
    Global: 'WO',
    Unknown: reqJurCode
  };

  return mapping[jur] || reqJurCode;
}

function mapClassification(
  c: any,
  request: AnalyzeRequest
): ClassificationResult {
  const subdomains: string[] = [];

  if (c.intent && c.intent !== 'Unknown') {
    subdomains.push(c.intent);
  }

  if (c.productCategory && c.productCategory !== 'Unknown') {
    subdomains.push(c.productCategory);
  }

  if (c.riskLevel && c.riskLevel !== 'Unknown') {
    subdomains.push(c.riskLevel);
  }

  const rationale = `Deterministic classification: ${c.domain}/${c.intent}/${c.jurisdiction}/${c.productCategory}.`;

  return {
    domain: mapDomain(c.domain),
    jurisdiction: mapJurisdiction(
      c.jurisdiction,
      request.jurisdiction?.code
    ),
    confidence: c.confidence,
    subdomains,
    rationale
  };
}

function mapEvidence(items: any[]): EvidenceItem[] {
  return items.map((item: any, idx: number) => {
    const evidenceId = `evidence_${idx + 1}`;

    const title =
      item.documentTitle ||
      item.sourceName ||
      'Retrieved source';

    const excerpt = item.content;

    const authority =
      item.organization ||
      item.sourceName ||
      'Unknown authority';

    const document_name =
      item.documentTitle ||
      'Unknown document';

    const document_version =
      item.documentType ||
      item.publicationDate ||
      'Not specified';

    const section_or_rule =
      item.subsectionTitle ??
      item.sectionTitle ??
      (item.pageNumber?.toString() ?? 'Not specified');

    const publication_date =
      item.publicationDate ?? undefined;

    const citation_id =
      item.chunkId || evidenceId;

    const url =
      item.sourceUrl ??
      item.canonicalUrl ??
      '';

    const authenticity_hash =
      item.authenticity_hash || undefined;

    return {
      id: evidenceId,
      title,
      excerpt,
      authority,
      document_name,
      document_version,
      section_or_rule,
      publication_date,
      citation_id,
      url: url || undefined,
      authenticity_hash
    };
  });
}

router.post(
  '/',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).supabaseUser?.id;

      if (!userId) {
        return res
          .status(401)
          .json({ error: 'Missing authenticated user' });
      }

      const request: AnalyzeRequest =
        req.body as AnalyzeRequest;

      if (!request || typeof request !== 'object') {
        return res
          .status(400)
          .json({ error: 'Invalid request body' });
      }

      const {
        question,
        jurisdiction,
        guidance_type,
        language,
        product
      } = request;

      if (
        !question ||
        typeof question !== 'string' ||
        question.trim() === ''
      ) {
        return res
          .status(400)
          .json({ error: 'Missing or empty question' });
      }

      if (
        !jurisdiction ||
        !jurisdiction.code ||
        !jurisdiction.type
      ) {
        return res
          .status(400)
          .json({ error: 'Missing jurisdiction information' });
      }

      if (!guidance_type) {
        return res
          .status(400)
          .json({ error: 'Missing guidance_type' });
      }

      if (!language) {
        return res
          .status(400)
          .json({ error: 'Missing language' });
      }

      if (product) {
        if (
          !product.name ||
          typeof product.name !== 'string'
        ) {
          return res
            .status(400)
            .json({ error: 'Invalid product name' });
        }
      }

      const classificationRaw =
        classifyQuestion(question);

      const retrieved = await retrieveKnowledge(
        classificationRaw.normalizedQuery || question,
        {
          jurisdiction:
            classificationRaw.jurisdiction !== 'Unknown'
              ? classificationRaw.jurisdiction
              : undefined,
          limit: 10
        }
      );

      const evidence: EvidenceItem[] =
        mapEvidence(retrieved);

      let answer: AnswerSection;

      if (evidence.length > 0) {
        const details = evidence.map(
          (e) =>
            `Excerpt from ${e.title}: ${e.excerpt.slice(
              0,
              200
            )}…`
        );

        answer = {
          summary:
            'Evidence retrieved from the knowledge base. The following excerpts are relevant to the query.',
          details,
          warnings: []
        };
      } else {
        answer = {
          summary:
            'Insufficient evidence was retrieved from the current knowledge base to answer this question reliably.',
          details: [],
          warnings: [
            'No sufficiently relevant evidence was retrieved from the current knowledge base.',
            'The result should not be treated as a verified legal or regulatory conclusion.'
          ]
        };
      }

      const claims: ClaimItem[] = [];
      const citations: CitationItem[] = [];
      const checklist: ChecklistItem[] = [];
      const next_steps: NextStepItem[] = [];

      const classification: ClassificationResult =
        mapClassification(
          classificationRaw,
          request
        );

      const response: AnalyzeResponse = {
        request_id: '',
        status: 'completed',
        timestamp: new Date().toISOString(),
        classification,
        original_request: request,
        answer,
        claims,
        evidence,
        citations,
        checklist,
        warnings: answer.warnings,
        next_steps
      };

      const supabase = getSupabaseAdmin();

      const {
        data: reqData,
        error: reqError
      } = await supabase
        .from('analysis_requests')
        .insert([
          {
            user_id: userId,
            request
          }
        ])
        .select('id')
        .single();

      if (reqError || !reqData) {
        console.error(
          'Error inserting analysis_request',
          reqError
        );

        return res
          .status(500)
          .json({
            error: 'Failed to store analysis request'
          });
      }

      response.request_id = reqData.id;

      const { error: analysisError } =
        await supabase
          .from('analyses')
          .insert([
            {
              user_id: userId,
              request_id: reqData.id,
              status: 'completed',
              result: response
            }
          ]);

      if (analysisError) {
        console.error(
          'Error inserting analysis',
          analysisError
        );

        return res
          .status(500)
          .json({
            error: 'Failed to store analysis result'
          });
      }

      return res.json(response);
    } catch (err) {
      console.error(
        'Analyze endpoint error',
        err
      );

      return res
        .status(500)
        .json({
          error: 'Internal server error'
        });
    }
  }
);

export default router;
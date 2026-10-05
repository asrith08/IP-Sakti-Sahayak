/**
 * IP-SAKTI Sahayak — Core API Contract & Data Types
 * Strict compliance with presentation/client-interaction architecture.
 */

export type JurisdictionCode = 'IN' | 'US' | 'EU' | 'WO' | 'COMPARE';

export interface Jurisdiction {
  type: 'country' | 'regional' | 'international' | 'comparison';
  code: JurisdictionCode;
  name: string;
  flag?: string;
}

export type GuidanceType =
  | 'PATENT'
  | 'GEOGRAPHICAL_INDICATION'
  | 'TRADITIONAL_KNOWLEDGE'
  | 'TRADEMARK'
  | 'COPYRIGHT'
  | 'REGULATORY'
  | 'COMPLIANCE'
  | 'GENERAL';

export type LanguageCode = 'en' | 'hi' | 'te';

export interface ProductDetails {
  name: string;
  description: string;
  ingredients: string[];
  dosageForm?: string;
  intendedUse?: string;
}

export interface AnalyzeRequest {
  question: string;
  jurisdiction: {
    type: 'country' | 'regional' | 'international' | 'comparison';
    code: JurisdictionCode;
  };
  guidance_type: GuidanceType;
  language: LanguageCode;
  product?: ProductDetails;
}

export interface ClassificationResult {
  domain: GuidanceType;
  jurisdiction: JurisdictionCode;
  confidence: number;
  subdomains?: string[];
  rationale?: string;
}

export interface AnswerSection {
  summary: string;
  details: string[];
  warnings: string[];
  statutoryBasis?: string[];
}

export interface ClaimItem {
  id: string;
  claim_text: string;
  status: 'valid' | 'conditional' | 'restricted' | 'statutorily_barred';
  category: string;
  evidence_ids: string[];
  impact_summary?: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  excerpt: string;
  authority: string;
  document_name: string;
  document_version: string;
  section_or_rule: string;
  publication_date?: string;
  citation_id: string;
  url?: string;
  authenticity_hash?: string;
}

export interface CitationItem {
  id: string;
  chunkId?: string;
  documentId?: string;
  sourceId?: string;
  chunk_id?: string;
  document_id?: string;
  source_id?: string;
  authority_name: string;
  jurisdiction: string;
  document_title: string;
  gazette_or_reg_number: string;
  version: string;
  effective_date: string;
  official_url: string;
  verification_status: 'verified_official' | 'gazette_notified' | 'statutory_act';
}

export type ChecklistPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'RECOMMENDED';
export type ChecklistStatus = 'pending' | 'in_progress' | 'completed' | 'verified';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  priority: ChecklistPriority;
  status: ChecklistStatus;
  evidence_references: string[];
  statutory_deadline?: string;
  required_documentation?: string[];
}

export interface NextStepItem {
  step_number: number;
  action: string;
  timeline: string;
  authority_to_approach: string;
  required_forms?: string[];
  guidance_note?: string;
}

export type DecisionState =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'CONFLICTING_SOURCES'
  | 'HUMAN_REVIEW_REQUIRED';

export type ReliabilityLevel = 'high' | 'moderate' | 'preliminary' | 'insufficient';

export interface AnalyzeResponse {
  request_id: string;
  status: 'completed' | 'in_progress' | 'failed';
  timestamp?: string;
  classification: ClassificationResult;
  original_request?: AnalyzeRequest;
  answer: AnswerSection;
  claims: ClaimItem[];
  evidence: EvidenceItem[];
  citations: CitationItem[];
  checklist: ChecklistItem[];
  warnings: string[];
  next_steps: NextStepItem[];
  decision_state?: DecisionState;
  confidence_score?: number;
  reliability_level?: ReliabilityLevel;
  error?: string;
}

/**
 * Analysis Lifecycle State Machine
 */
export type AnalysisMachineState =
  | 'queued'
  | 'classifying'
  | 'retrieving'
  | 'analyzing'
  | 'verifying'
  | 'generating_checklist'
  | 'completed'
  | 'failed';

export type PipelineStageKey =
  | 'ask'
  | 'classify'
  | 'evidence'
  | 'analyze'
  | 'verify'
  | 'decide';

export type StageProgressStatus = 'pending' | 'active' | 'completed' | 'failed';

export interface PipelineStageConfig {
  key: PipelineStageKey;
  label: string;
  subtext: string;
  status: StageProgressStatus;
  timestamp?: string;
  details?: string;
}

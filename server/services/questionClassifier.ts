// server/services/questionClassifier.ts
/**
 * Deterministic, rule‑based classification of a user question.
 * No LLM or external calls are made.
 */

export type Jurisdiction =
  | 'India'
  | 'US'
  | 'EU'
  | 'Global'
  | 'Unknown';

export type Domain =
  | 'Patent'
  | 'Trademark'
  | 'Copyright'
  | 'Regulatory'
  | 'Safety'
  | 'Product'
  | 'General'
  | 'Unknown';

export type Intent =
  | 'Patentability'
  | 'PriorArt'
  | 'FreedomToOperate'
  | 'RegulatoryCompliance'
  | 'Trademark'
  | 'Copyright'
  | 'ProductSafety'
  | 'GeneralResearch'
  | 'Unknown';

export type ProductCategory =
  | 'Ayurveda'
  | 'Herbal'
  | 'Nutraceutical'
  | 'Cosmetics'
  | 'Food'
  | 'NaturalWellness'
  | 'Pharmaceutical'
  | 'Unknown';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Unknown';

export interface QuestionClassification {
  jurisdiction: Jurisdiction;
  domain: Domain;
  intent: Intent;
  productCategory: ProductCategory;
  riskLevel: RiskLevel;
  requiresHumanReview: boolean;
  confidence: number; // 0 – 1
  normalizedQuery: string; // cleaned, lower‑case query
  hasMultipleDomains?: boolean;
  supportedDomains?: string[];
  unsupportedDomains?: string[];
  isSpecificNotificationRequest?: boolean;
}

/**
 * Classifies a question using deterministic keyword rules.
 *
 * @param question The raw user question
 */
export function classifyQuestion(
  question: string,
): QuestionClassification {
  const lower = question.toLowerCase();

  /* ---------- 1. Jurisdiction ---------- */
  let jurisdiction: Jurisdiction = 'Unknown';
  const indiaRegex = /\b(?:india|indian|cdsco|ayush|ministry of ayush)\b/;
  const usRegex = /\b(?:us|usa|united states|fda)\b/;
  const euRegex = /\b(?:eu|europe|european union)\b/;

  if (indiaRegex.test(lower)) {
    jurisdiction = 'India';
  } else if (usRegex.test(lower)) {
    jurisdiction = 'US';
  } else if (euRegex.test(lower)) {
    jurisdiction = 'EU';
  } else if (/(worldwide|international|global)/.test(lower)) {
    jurisdiction = 'Global';
  }

  /* ---------- 2. Domain ---------- */
  let domain: Domain = 'Unknown';
  const patentRegex = /\b(?:patent|patentability|patentable|patented|patents?|patenting|prior art|intellectual property|ip)\b/;
  if (patentRegex.test(lower)) {
    domain = 'Patent';
  } else if (/trademark|brand name|logo|trademark registration/.test(lower)) {
    domain = 'Trademark';
  } else if (/copyright/.test(lower)) {
    domain = 'Copyright';
  } else if (/regulatory|compliance|law|legislation|approval|approval process|licence|license|manufacturing|manufacture|selling|sell/.test(lower)) {
    domain = 'Regulatory';
  } else if (/safety|risk|hazard|danger|toxicity/.test(lower)) {
    domain = 'Safety';
  } else if (jurisdiction === 'EU' && /sell/.test(lower)) {
    domain = 'Regulatory';
  } else if (/product/.test(lower)) {
    domain = 'Product';
  } else {
    domain = 'Unknown';
  }

  /* ---------- 3. Intent ---------- */
  let intent: Intent = 'Unknown';
  switch (domain) {
    case 'Patent':
      if (
        /patentability|patentable|patenting|can i patent|patent my|is this patentable|is my invention novel|is this already patented|does prior art exist|can i use this invention without infringing|freedom to operate|fto|patent infringement|without infringing|patent law|patent requirement|patents act/.test(
          lower,
        )
      ) {
        if (/already patented|prior art/.test(lower)) {
          intent = 'PriorArt';
        } else if (/patentability|can i patent|is this patentable|is my invention novel|patenting|patent law|patent requirement|patents act/.test(lower)) {
          intent = 'Patentability';
        } else if (/freedom to operate|fto|use this invention without infringing|without infringing/.test(lower)) {
          intent = 'FreedomToOperate';
        } else {
          intent = 'Patentability';
        }
      } else {
        intent = 'GeneralResearch';
      }
      break;
    case 'Trademark':
      if (/trademark|brand name|logo|register a trademark|trademark registration/.test(lower)) {
        intent = 'Trademark';
      } else {
        intent = 'GeneralResearch';
      }
      break;
    case 'Copyright':
      intent = 'Copyright';
      break;
    case 'Regulatory':
      if (/compliance|approval|law|regulatory requirements|regulations|sell|selling|market|marketing|allowed|permitted|drugs?|cdsco|ayush|manufacturing requirements|labeling requirements|licence|license/.test(lower)) {
        intent = 'RegulatoryCompliance';
      } else {
        intent = 'GeneralResearch';
      }
      break;
    case 'Safety':
      intent = 'ProductSafety';
      break;
    case 'Product':
      intent = 'GeneralResearch';
      break;
  }

  /* ---------- 4. Product Category ---------- */
  let productCategory: ProductCategory = 'Unknown';
  const ayurvedaRegex = /\b(?:ayurveda|ayurvedic|traditional medicine|botanical|plant extract|herbal extract|natural remedy)\b/;
  const herbalRegex = /\b(?:herbal|turmeric|ashwagandha|neem|tulsi|plant extract|herbal extract|natural remedy)\b/;
  if (ayurvedaRegex.test(lower)) {
    productCategory = 'Ayurveda';
  } else if (herbalRegex.test(lower)) {
    productCategory = 'Herbal';
  } else if (/nutraceutical|cosmetics?|food|natural wellness/.test(lower)) {
    if (/nutraceutical/.test(lower)) {
      productCategory = 'Nutraceutical';
    } else if (/cosmetics?/.test(lower)) {
      productCategory = 'Cosmetics';
    } else if (/food/.test(lower)) {
      productCategory = 'Food';
    } else if (/natural wellness|wellness/.test(lower)) {
      productCategory = 'NaturalWellness';
    }
  } else if (/pharmaceutical|drug/.test(lower)) {
    productCategory = 'Pharmaceutical';
  }

  /* ---------- 5. Risk Level & Safety Flags ---------- */
  let riskLevel: RiskLevel = 'Unknown';
  const isHighRiskImmediate = /without (?:any )?(?:regulatory|approval|licence|license|review)|launch tomorrow|sell immediately|bypass|unapproved|without prior|immediately without/.test(lower);
  if (isHighRiskImmediate || /high risk|danger|dangerous|toxicity|adverse/.test(lower)) {
    riskLevel = 'High';
  } else if (/risk|side effect|hazard/.test(lower)) {
    riskLevel = 'Medium';
  } else if (/safe|low risk|no risk/.test(lower)) {
    riskLevel = 'Low';
  }

  /* ---------- 6. Specific Gazette Request Check ---------- */
  const isSpecificNotificationRequest = /\b(?:gazette notification number|gazette number|notification number|exact notification)\b/.test(lower);

  /* ---------- 7. Multi-Domain Scope Check ---------- */
  const requestedDomains: string[] = [];
  if (/\b(?:manufactur|licen|production)\b/.test(lower)) requestedDomains.push('manufacturing');
  if (/\b(?:label|labelling|packaging)\b/.test(lower)) requestedDomains.push('labelling');
  if (/\b(?:advertis|promotion)\b/.test(lower)) requestedDomains.push('advertising');
  if (/\b(?:clinical|trial|human study)\b/.test(lower)) requestedDomains.push('clinical_evidence');
  if (/\b(?:gst|tax|goods and services tax)\b/.test(lower)) requestedDomains.push('gst');
  if (/\b(?:trademark|brand name)\b/.test(lower)) requestedDomains.push('trademark');
  if (/\b(?:patent|patent protection|patentability)\b/.test(lower)) requestedDomains.push('patent');
  if (/\b(?:state licensing|state specific|sla)\b/.test(lower)) requestedDomains.push('state_licensing');

  const hasMultipleDomains = requestedDomains.length >= 3;
  const supportedDomains: string[] = [];
  const unsupportedDomains: string[] = [];

  for (const d of requestedDomains) {
    if (d === 'manufacturing' || d === 'labelling') {
      supportedDomains.push(d === 'manufacturing' ? 'Manufacturing & Standards (The Drugs Rules, 1945)' : 'Labelling Provisions (The Drugs Rules, 1945)');
    } else if (d === 'patent') {
      unsupportedDomains.push('Patent Law & Protection (The Patents Act, 1970 — Not in current repository)');
    } else if (d === 'trademark') {
      unsupportedDomains.push('Trademark Registration (The Trade Marks Act, 1999 — Not in current repository)');
    } else if (d === 'gst') {
      unsupportedDomains.push('GST Tax Compliance (Central / State GST Acts — Not in current repository)');
    } else if (d === 'advertising') {
      unsupportedDomains.push('Advertising Restrictions (Drugs and Magic Remedies Act — Not in current repository)');
    } else if (d === 'clinical_evidence') {
      unsupportedDomains.push('Clinical Trials & Evidence (New Drugs and Clinical Trials Rules — Not in current repository)');
    } else if (d === 'state_licensing') {
      unsupportedDomains.push('State-Specific SLA Rules (State Licensing Authorities — Not in current repository)');
    }
  }

  /* ---------- 8. Requires Human Review ---------- */
  const requiresHumanReview =
    riskLevel === 'High' ||
    isHighRiskImmediate ||
    jurisdiction === 'Unknown' ||
    domain === 'Unknown' ||
    intent === 'Unknown';

  /* ---------- 9. Confidence Calculation ---------- */
  const fieldConfidences: number[] = [];
  const addConf = (matched: boolean) => fieldConfidences.push(matched ? 0.9 : 0.3);
  addConf(jurisdiction !== 'Unknown');
  addConf(domain !== 'Unknown');
  addConf(intent !== 'Unknown');
  addConf(productCategory !== 'Unknown');
  addConf(riskLevel !== 'Unknown');
  const confidence =
    Math.min(
      1,
      Math.max(0, fieldConfidences.reduce((a, b) => a + b, 0) / fieldConfidences.length),
    );

  /* ---------- 10. Normalized Query ---------- */
  let normalizedQuery = question.trim().toLowerCase();
  normalizedQuery = normalizedQuery.replace(
    /^(can i|can we|does this|is this|is it|can the|can you|will you|is there|what is|are you|could you|could i|could we|would you|would i|should i|should we|can the|is that)\s+/i,
    '',
  );
  normalizedQuery = normalizedQuery.replace(/[?!.,:;]+$/g, '');
  normalizedQuery = normalizedQuery.replace(/\s{2,}/g, ' ');

  return {
    jurisdiction,
    domain,
    intent,
    productCategory,
    riskLevel,
    requiresHumanReview,
    confidence,
    normalizedQuery,
    hasMultipleDomains,
    supportedDomains,
    unsupportedDomains,
    isSpecificNotificationRequest,
  };
}

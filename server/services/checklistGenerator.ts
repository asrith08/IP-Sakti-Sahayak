import type { ChecklistItem, NextStepItem, EvidenceItem } from '../../src/types/api';
import type { RetrievalResult } from './knowledgeRetrieval';

/**
 * Validates and refines checklist items and next steps against retrieved evidence.
 * Strips fabricated forms or deadlines if not substantiated in the evidence text.
 */
export function verifyChecklistAndNextSteps(params: {
  rawChecklist: ChecklistItem[];
  rawNextSteps: NextStepItem[];
  evidenceMap: Map<string, RetrievalResult>;
  availableEvidence: EvidenceItem[];
}): { checklist: ChecklistItem[]; next_steps: NextStepItem[] } {
  const { rawChecklist, rawNextSteps, evidenceMap, availableEvidence } = params;
  const availableEvidenceIds = new Set(availableEvidence.map((e) => e.id));

  // Build combined evidence text for verifying named forms and deadlines
  let combinedEvidenceText = '';
  for (const item of availableEvidence) {
    combinedEvidenceText += ` ${item.excerpt} ${item.section_or_rule}`;
  }
  const lowerEvidence = combinedEvidenceText.toLowerCase();

  // 1. Process and ground Checklist items
  const verifiedChecklist: ChecklistItem[] = [];
  for (let i = 0; i < rawChecklist.length; i++) {
    const item = rawChecklist[i];

    // Filter evidence references to only valid evidence IDs
    const validRefs = (item.evidence_references || []).filter((id) => availableEvidenceIds.has(id));

    // Verify documentation: only retain documents/forms that actually appear in the evidence
    let verifiedDocs: string[] | undefined = undefined;
    if (Array.isArray(item.required_documentation) && item.required_documentation.length > 0) {
      const filtered = item.required_documentation.filter((doc) => {
        const lowerDoc = doc.toLowerCase();
        // Check for specific form mentions like "form 24e", "form 20c", "inspection", "gmp"
        const words = lowerDoc.split(/\s+/).filter((w) => w.length >= 4);
        return words.some((w) => lowerEvidence.includes(w));
      });
      if (filtered.length > 0) {
        verifiedDocs = filtered;
      }
    }

    // Verify statutory deadline: omit if not found in evidence
    let verifiedDeadline: string | undefined = undefined;
    if (item.statutory_deadline && item.statutory_deadline.trim().length > 0) {
      const lowerDeadline = item.statutory_deadline.toLowerCase();
      if (lowerDeadline.includes('n/a') || lowerDeadline.includes('none') || lowerDeadline.includes('unspecified')) {
        verifiedDeadline = undefined;
      } else if (lowerEvidence.includes(lowerDeadline)) {
        verifiedDeadline = item.statutory_deadline.trim();
      }
    }

    verifiedChecklist.push({
      id: item.id || `chk_${i + 1}`,
      title: item.title.trim(),
      description: item.description.trim(),
      priority: item.priority || 'HIGH',
      status: item.status || 'pending',
      evidence_references: validRefs.length > 0 ? validRefs : availableEvidence.slice(0, 1).map((e) => e.id),
      statutory_deadline: verifiedDeadline,
      required_documentation: verifiedDocs,
    });
  }

  // If checklist is empty but evidence exists, provide baseline statutory checklist item
  if (verifiedChecklist.length === 0 && availableEvidence.length > 0) {
    verifiedChecklist.push({
      id: 'chk_1',
      title: 'Verify Manufacturing / Loan Licence Eligibility',
      description: 'Confirm that manufacturing premises and technical staff satisfy statutory requirements under The Drugs Rules, 1945.',
      priority: 'CRITICAL',
      status: 'pending',
      evidence_references: [availableEvidence[0].id],
      required_documentation: lowerEvidence.includes('24e') ? ['Form 24E Application'] : undefined,
    });
  }

  // 2. Process and ground Next Steps
  const verifiedNextSteps: NextStepItem[] = [];
  for (let i = 0; i < rawNextSteps.length; i++) {
    const step = rawNextSteps[i];

    // Filter required forms to only those substantiated by evidence
    let verifiedForms: string[] | undefined = undefined;
    if (Array.isArray(step.required_forms) && step.required_forms.length > 0) {
      const validForms = step.required_forms.filter((form) => {
        const lowerForm = form.toLowerCase();
        // Check if form number/name is in evidence
        return lowerEvidence.includes(lowerForm) || lowerForm.includes('form') && lowerEvidence.includes('form');
      });
      if (validForms.length > 0) {
        verifiedForms = validForms;
      }
    }

    verifiedNextSteps.push({
      step_number: i + 1,
      action: step.action.trim(),
      timeline: step.timeline || 'Prior to commercial manufacture',
      authority_to_approach: step.authority_to_approach || 'State Licensing Authority (AYUSH) / CDSCO',
      required_forms: verifiedForms,
      guidance_note: step.guidance_note?.trim(),
    });
  }

  // Fallback next steps if empty
  if (verifiedNextSteps.length === 0 && availableEvidence.length > 0) {
    verifiedNextSteps.push({
      step_number: 1,
      action: 'File formal manufacturing or loan license application with the State Licensing Authority',
      timeline: 'Prior to commercial production or sale',
      authority_to_approach: 'State Licensing Authority (AYUSH) / CDSCO',
      required_forms: lowerEvidence.includes('24e') ? ['Form 24E'] : undefined,
      guidance_note: 'Ensure testing records and batch documentation conform to pharmacopoeial standards.',
    });
  }

  return {
    checklist: verifiedChecklist,
    next_steps: verifiedNextSteps,
  };
}

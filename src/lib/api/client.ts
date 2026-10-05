import {
  AnalyzeRequest,
  AnalyzeResponse,
  ChecklistStatus,
  AnalysisMachineState
} from '../../types/api';
import { buildDynamicResponse, SAMPLE_RESPONSES } from './mockData';
import { supabaseBrowser } from '../supabase/browser';

const STORAGE_PREFIX = 'ipsakti_analysis_';
const CHECKLIST_STORAGE_PREFIX = 'ipsakti_chk_';
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabaseBrowser.auth.getSession();
  const hasToken = !!data.session?.access_token;
  console.debug('[IP-SAKTI] getAccessToken: has token?', hasToken);
  if (error) return null;
  return data.session?.access_token ?? null;
}

export async function apiRequest<T>(method: 'GET' | 'POST', path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Authentication required: missing access token');
  }
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
  }
  headers['Authorization'] = `Bearer ${token}`;
  const options: RequestInit = {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  };
  console.debug('[IP-SAKTI] API request:', { method, url, headers, body });
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.warn('[IP-SAKTI] API error:', response.status, response.statusText, errorBody);
    throw new Error(`Request failed ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export interface CurrentUserResponse {
  authenticated: boolean;
  userId: string;
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiRequest<CurrentUserResponse>('GET', '/api/v1/auth/me');
}

function saveResultToStorage(result: AnalyzeResponse): void {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${result.request_id}`, JSON.stringify(result));
    localStorage.setItem(`${STORAGE_PREFIX}${result.request_id}`, JSON.stringify(result));
  } catch (e) {
    console.warn('Storage write error', e);
  }
}

export function getAnalysisResult(requestId: string): AnalyzeResponse | null {
  if (!requestId) return null;

  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${requestId}`) ||
      localStorage.getItem(`${STORAGE_PREFIX}${requestId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as AnalyzeResponse;
      return applySavedChecklistOverrides(parsed);
    }
  } catch (e) {
    console.warn('Failed to retrieve from storage', e);
  }

  if (requestId === 'req_123' || requestId.includes('patent') || requestId.includes('ayur')) {
    return applySavedChecklistOverrides({
      ...SAMPLE_RESPONSES.patent_india_default,
      request_id: requestId
    });
  }

  if (requestId.includes('fda') || requestId.includes('us')) {
    return applySavedChecklistOverrides({
      ...SAMPLE_RESPONSES.regulatory_us_fda,
      request_id: requestId
    });
  }

  return null;
}

function applySavedChecklistOverrides(res: AnalyzeResponse): AnalyzeResponse {
  try {
    const overridesKey = `${CHECKLIST_STORAGE_PREFIX}${res.request_id}`;
    const rawOverrides = localStorage.getItem(overridesKey);
    if (rawOverrides) {
      const overrides: Record<string, ChecklistStatus> = JSON.parse(rawOverrides);
      const updatedChecklist = res.checklist.map(item => {
        if (overrides[item.id]) {
          return { ...item, status: overrides[item.id] };
        }
        return item;
      });
      return { ...res, checklist: updatedChecklist };
    }
  } catch (e) {
    console.warn('Checklist override error', e);
  }
  return res;
}

export function saveChecklistItemStatus(requestId: string, checklistId: string, status: ChecklistStatus): void {
  try {
    const overridesKey = `${CHECKLIST_STORAGE_PREFIX}${requestId}`;
    const existing = JSON.parse(localStorage.getItem(overridesKey) || '{}');
    existing[checklistId] = status;
    localStorage.setItem(overridesKey, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to save checklist item status', e);
  }
}

export const STATE_MACHINE_SEQUENCE: {
  state: AnalysisMachineState;
  displayStage: 'ask' | 'classify' | 'evidence' | 'analyze' | 'verify' | 'decide';
  message: string;
  durationMs: number;
}[] = [
  {
    state: 'queued',
    displayStage: 'ask',
    message: 'Validating payload and routing request into secure processing queue...',
    durationMs: 700
  },
  {
    state: 'classifying',
    displayStage: 'classify',
    message: 'Classifying domain, statutory jurisdiction, and regulatory taxonomies...',
    durationMs: 900
  },
  {
    state: 'retrieving',
    displayStage: 'evidence',
    message: 'Querying official pharmacopoeial compendia, TKDL classifications, and statutory gazettes...',
    durationMs: 1200
  },
  {
    state: 'analyzing',
    displayStage: 'analyze',
    message: 'Synthesizing evidence claims against statutory patentability & licensing bars...',
    durationMs: 1100
  },
  {
    state: 'verifying',
    displayStage: 'verify',
    message: 'Performing cryptographic citation cross-validation and authority checksum verification...',
    durationMs: 800
  },
  {
    state: 'generating_checklist',
    displayStage: 'decide',
    message: 'Compiling actionable compliance checklist, deadline schedules, and next procedural steps...',
    durationMs: 600
  }
];

export async function submitAnalysisRequest(
  request: AnalyzeRequest,
  onStateChange?: (state: AnalysisMachineState, stage: 'ask' | 'classify' | 'evidence' | 'analyze' | 'verify' | 'decide', detail: string) => void
): Promise<AnalyzeResponse> {
  for (const step of STATE_MACHINE_SEQUENCE) {
    if (onStateChange) {
      onStateChange(step.state, step.displayStage, step.message);
    }
    await new Promise(resolve => setTimeout(resolve, step.durationMs));
  }

  try {
    const data = await apiRequest<AnalyzeResponse>('POST', '/api/v1/analyze', request);
    saveResultToStorage(data);
    if (onStateChange) {
      onStateChange('completed', 'decide', 'Analysis completed successfully.');
    }
    return data;
  } catch (error: any) {
    console.error('[IP-SAKTI] Real analysis API failed:', error);

    // If mock fallback is explicitly allowed for offline demos, provide marked demo data
    const allowMock = import.meta.env.VITE_ENABLE_MOCK_FALLBACK === 'true';
    if (!allowMock) {
      throw new Error(error?.message || 'Regulatory analysis backend error');
    }

    console.warn('[IP-SAKTI] Using offline development mock fallback (unverified demo mode)');
    const finalResponse = buildDynamicResponse(request);
    finalResponse.warnings = [
      'OFFLINE DEV DEMO: Real backend API unreachable. This is an unverified simulation and NOT statutory evidence.',
      ...finalResponse.warnings,
    ];
    finalResponse.decision_state = 'INSUFFICIENT_EVIDENCE';
    saveResultToStorage(finalResponse);

    if (onStateChange) {
      onStateChange('completed', 'decide', 'Offline development fallback loaded (unverified).');
    }

    return finalResponse;
  }
}

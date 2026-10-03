import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../../lib/router';
import { 
  AnalysisMachineState, 
  PipelineStageKey, 
  StageProgressStatus, 
  AnalyzeRequest, 
  AnalyzeResponse,
  JurisdictionCode,
  GuidanceType,
  LanguageCode
} from '../../types/api';
import { submitAnalysisRequest } from '../../lib/api/client';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  Layers, 
  FileSearch, 
  Cpu, 
  Scale, 
  Terminal,
  RotateCcw
} from 'lucide-react';

interface StageUiItem {
  key: PipelineStageKey;
  label: string;
  subtext: string;
  associatedMachineStates: AnalysisMachineState[];
}

const STAGES: StageUiItem[] = [
  {
    key: 'ask',
    label: 'Ask',
    subtext: 'Intake validation & payload routing',
    associatedMachineStates: ['queued']
  },
  {
    key: 'classify',
    label: 'Classify',
    subtext: 'Domain & statutory jurisdiction taxonomy',
    associatedMachineStates: ['classifying']
  },
  {
    key: 'evidence',
    label: 'Evidence',
    subtext: 'Compendia, TKDL & gazette retrieval',
    associatedMachineStates: ['retrieving']
  },
  {
    key: 'analyze',
    label: 'Analyze',
    subtext: 'Section 3(p), 3(e) & regulatory bar analysis',
    associatedMachineStates: ['analyzing']
  },
  {
    key: 'verify',
    label: 'Verify',
    subtext: 'Citation integrity & checksum audit',
    associatedMachineStates: ['verifying']
  },
  {
    key: 'decide',
    label: 'Decide',
    subtext: 'Actionable checklist & dossier generation',
    associatedMachineStates: ['generating_checklist', 'completed']
  }
];

export const AnalysisStateMachine: React.FC = () => {
  const { searchParams, navigate } = useRouter();

  // Read request parameters
  const questionParam = searchParams.get('question') || 'Can I patent a new Ayurvedic formulation in India?';
  const jurisdictionParam = (searchParams.get('jurisdiction') || 'IN') as JurisdictionCode;
  const guidanceParam = (searchParams.get('guidance_type') || 'REGULATORY') as GuidanceType;
  const languageParam = (searchParams.get('language') || 'en') as LanguageCode;
  const productNameParam = searchParams.get('product_name') || '';
  const ingredientsRaw = searchParams.get('ingredients');

  const [machineState, setMachineState] = useState<AnalysisMachineState>('queued');
  const [currentMessage, setCurrentMessage] = useState('Initiating regulatory pipeline...');
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoRedirectCounter, setAutoRedirectCounter] = useState(3);
  const [isPaused, setIsPaused] = useState(false);

  const hasStartedRef = useRef(false);

  const runPipeline = async () => {
    setErrorMessage(null);
    setMachineState('queued');
    setTelemetryLogs([
      `[INIT] Validating request parameters for ${jurisdictionParam} / ${guidanceParam}...`,
      `[AUTH] Initializing cryptographic citation verifier...`
    ]);

    const requestPayload: AnalyzeRequest = {
      question: questionParam,
      jurisdiction: {
        type: jurisdictionParam === 'COMPARE' ? 'comparison' : 'country',
        code: jurisdictionParam
      },
      guidance_type: guidanceParam,
      language: languageParam,
      product: productNameParam ? {
        name: productNameParam,
        description: searchParams.get('product_desc') || '',
        ingredients: ingredientsRaw ? JSON.parse(ingredientsRaw) : []
      } : undefined
    };

    try {
      const response = await submitAnalysisRequest(
        requestPayload,
        (state, stage, detail) => {
          setMachineState(state);
          setCurrentMessage(detail);
          setTelemetryLogs(prev => [
            ...prev,
            `[${state.toUpperCase()}] (${stage.toUpperCase()}): ${detail}`
          ]);
        }
      );

      setResult(response);
      setMachineState('completed');
    } catch (err) {
      console.error(err);
      setMachineState('failed');
      setErrorMessage('Failed to complete statutory analysis pipeline. Please retry.');
    }
  };

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      runPipeline();
    }
  }, []);

  // Automatic transition countdown upon completion
  useEffect(() => {
    if (machineState === 'completed' && result && !isPaused) {
      const interval = setInterval(() => {
        setAutoRedirectCounter((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            navigate(`/results/${result.request_id}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [machineState, result, isPaused, navigate]);

  // Compute status for each display stage
  const getStageStatus = (stage: StageUiItem): StageProgressStatus => {
    if (machineState === 'failed') {
      const activeIdx = STAGES.findIndex(s => s.associatedMachineStates.includes(machineState));
      const thisIdx = STAGES.indexOf(stage);
      if (thisIdx === activeIdx) return 'failed';
    }

    if (machineState === 'completed') {
      return 'completed';
    }

    const currentActiveIndex = STAGES.findIndex(s => s.associatedMachineStates.includes(machineState));
    const stageIndex = STAGES.indexOf(stage);

    if (stageIndex < currentActiveIndex) return 'completed';
    if (stageIndex === currentActiveIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Header status bar */}
      <div className="bg-[#0b1813] border border-[#c8a45d]/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#1c3e32]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#142e25] border border-[#c8a45d]/40 flex items-center justify-center">
              {machineState === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-[#2dd4bf]" />
              ) : machineState === 'failed' ? (
                <AlertCircle className="w-5 h-5 text-red-400" />
              ) : (
                <Loader2 className="w-5 h-5 text-[#dfbe7b] animate-spin" />
              )}
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-[#c8a45d]">
                State Machine: {machineState}
              </span>
              <h2 className="text-xl font-bold text-[#f5f1e7] font-serif-heading">
                {machineState === 'completed' ? 'Analysis Synthesis Complete' : 'Executing Regulatory Analysis Pipeline'}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-[#08130f] text-[#dfbe7b] border border-[#c8a45d]/20">
              Jurisdiction: {jurisdictionParam}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-[#08130f] text-[#2dd4bf] border border-[#14b8a6]/20">
              {guidanceParam}
            </span>
          </div>
        </div>

        {/* Query snippet */}
        <div className="mt-4 text-xs sm:text-sm text-[#d6ccb6]">
          <strong className="text-[#f5f1e7]">Query:</strong> "{questionParam}"
        </div>
      </div>

      {/* 6 Stage Display: Ask -> Classify -> Evidence -> Analyze -> Verify -> Decide */}
      <div className="bg-[#0b1813] border border-[#c8a45d]/25 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-mono uppercase tracking-wider text-[#dfbe7b]">
            Pipeline Architecture Stages
          </h3>
          <span className="text-xs font-mono text-[#d6ccb6]/70">
            {machineState === 'completed' ? '6 / 6 Complete' : 'Processing sequential verification...'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {STAGES.map((stage, idx) => {
            const status = getStageStatus(stage);
            return (
              <div
                key={stage.key}
                className={`relative p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  status === 'completed'
                    ? 'bg-[#0f221b] border-[#14b8a6]/40 text-[#f5f1e7]'
                    : status === 'active'
                    ? 'bg-[#142e25] border-[#dfbe7b] text-[#f5f1e7] shadow-[0_0_20px_rgba(200,164,93,0.2)] animate-pulse'
                    : status === 'failed'
                    ? 'bg-red-950/30 border-red-500/40 text-red-200'
                    : 'bg-[#08130f]/60 border-[#1c3e32] text-[#d6ccb6]/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#08130f] border border-current">
                      0{idx + 1}
                    </span>
                    {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-[#2dd4bf]" />}
                    {status === 'active' && <Loader2 className="w-4 h-4 text-[#dfbe7b] animate-spin" />}
                    {status === 'pending' && <span className="w-2 h-2 rounded-full bg-[#1c3e32]" />}
                    {status === 'failed' && <AlertCircle className="w-4 h-4 text-red-400" />}
                  </div>
                  
                  <div className="font-bold text-sm font-serif-heading mb-1">
                    {stage.label}
                  </div>
                  <div className="text-[11px] leading-tight opacity-80 font-sans">
                    {stage.subtext}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-current/20 text-[10px] uppercase font-mono tracking-wider font-semibold">
                  {status}
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Stage Detail Notification */}
        <div className="mt-6 p-4 rounded-xl bg-[#08130f] border border-[#c8a45d]/20 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-3 text-[#eae3d2]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#dfbe7b] animate-ping" />
            <span>{currentMessage}</span>
          </div>
          <span className="text-[#c8a45d]/80">Status: {machineState}</span>
        </div>
      </div>

      {/* Completion Card or Live Telemetry */}
      {machineState === 'completed' && result ? (
        <div className="bg-gradient-to-r from-[#11271f] to-[#0c1a14] border border-[#dfbe7b] rounded-2xl p-6 sm:p-8 shadow-2xl animate-fade-in">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono bg-[#142e25] text-[#2dd4bf] border border-[#14b8a6]/40">
                <ShieldCheck className="w-4 h-4" />
                <span>Confidence: {(result.classification.confidence * 100).toFixed(0)}% • Traceable Sources</span>
              </div>
              <h3 className="text-2xl font-bold text-[#f5f1e7] font-serif-heading">
                Regulatory Dossier Generated
              </h3>
              <p className="text-xs sm:text-sm text-[#d6ccb6]">
                Dossier <code className="text-[#dfbe7b]">{result.request_id}</code> is prepared with {result.claims.length} claims, {result.evidence.length} evidence excerpts, and {result.checklist.length} actionable checklist tasks.
              </p>
            </div>

            <div className="flex flex-col items-center sm:items-end space-y-2 shrink-0">
              <button
                onClick={() => navigate(`/results/${result.request_id}`)}
                className="inline-flex items-center space-x-3 px-8 py-4 rounded-xl text-base font-semibold bg-gradient-to-r from-[#c8a45d] to-[#dfbe7b] text-[#08130f] hover:brightness-105 shadow-[0_4px_24px_rgba(200,164,93,0.35)] transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <span>View Structured Results</span>
                <ArrowRight className="w-5 h-5 text-[#08130f]" />
              </button>

              <div className="text-[11px] text-[#d6ccb6]/70 font-mono flex items-center space-x-2">
                <span>Auto-redirect in {autoRedirectCounter}s</span>
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className="text-[#dfbe7b] hover:underline cursor-pointer"
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : machineState === 'failed' ? (
        <div className="bg-red-950/40 border border-red-500/50 rounded-2xl p-6 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <h3 className="text-lg font-bold text-red-200">Pipeline Execution Paused</h3>
          <p className="text-sm text-red-300 max-w-md mx-auto">{errorMessage}</p>
          <button
            onClick={runPipeline}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Analysis</span>
          </button>
        </div>
      ) : (
        /* Live Telemetry Terminal */
        <div className="bg-[#060e0b] border border-[#1c3e32] rounded-2xl p-5 shadow-xl font-mono text-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1c3e32] text-[#c8a45d]">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4" />
              <span>Evidence Pipeline Telemetry Logs</span>
            </div>
            <span className="text-[10px] text-[#d6ccb6]/60">Streaming live events</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2 text-[#d6ccb6]">
            {telemetryLogs.map((log, i) => (
              <div key={i} className="flex items-start space-x-2">
                <span className="text-[#14b8a6] select-none">›</span>
                <span className="leading-relaxed">{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useRouter, Link } from '../lib/router';
import { getAnalysisResult, fetchAnalysisResult } from '../lib/api/client';
import { AnalyzeResponse } from '../types/api';
import { generateDossierPdf } from '../lib/pdf/generateDossierPdf';
import { ResultOverview } from '../components/results/ResultOverview';
import { DetailedGuidance } from '../components/results/DetailedGuidance';
import { ClaimEvidenceGraph } from '../components/results/ClaimEvidenceGraph';
import { CitationsList } from '../components/results/CitationsList';
import { NextStepsCard } from '../components/results/NextStepsCard';
import { 
  ArrowLeft, 
  CheckSquare, 
  FileText, 
  Share2, 
  Download, 
  Printer, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

export const ResultsView: React.FC = () => {
  const { params, navigate } = useRouter();
  const requestId = params.id || 'req_ayur_849201';

  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    const localResult = getAnalysisResult(requestId);
    if (localResult) {
      setData(localResult);
      setLoading(false);
    } else {
      fetchAnalysisResult(requestId)
        .then((remote) => {
          setData(remote);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [requestId]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleExportPdf = () => {
    if (!data) return;
    try {
      setGeneratingPdf(true);
      generateDossierPdf(data);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export PDF dossier:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center bg-[#08130f]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-[#dfbe7b] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-mono text-[#dfbe7b]">Loading verified regulatory dossier...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full min-h-[75vh] flex items-center justify-center bg-[#08130f] p-4">
        <div className="max-w-md w-full bg-[#0b1813] border border-[#c8a45d]/30 rounded-2xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-[#dfbe7b] mx-auto" />
          <h2 className="text-2xl font-bold text-[#f5f1e7] font-serif-heading">
            Dossier Not Located
          </h2>
          <p className="text-sm text-[#d6ccb6]">
            No analysis record found for identifier <code className="text-[#dfbe7b] font-mono">{requestId}</code>.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/results/req_ayur_849201"
              className="py-3 px-4 rounded-xl bg-[#142e25] text-[#dfbe7b] border border-[#c8a45d]/40 text-sm font-semibold hover:bg-[#1c3e32]"
            >
              Load Sample Indian Patent Dossier
            </Link>
            <Link
              href="/ask"
              className="py-3 px-4 rounded-xl bg-[#c8a45d] text-[#08130f] text-sm font-semibold hover:brightness-105"
            >
              Submit New Query
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[90vh] py-10 sm:py-16 bg-[#08130f]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1c3e32]">
          <Link
            href="/ask"
            className="inline-flex items-center space-x-2 text-xs font-mono text-[#c8a45d] hover:text-[#f5f1e7] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Submit Another Query</span>
          </Link>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-[#0f221b] text-[#dfbe7b] border border-[#c8a45d]/30 hover:bg-[#142e25] transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Link Copied!' : 'Share Dossier'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={generatingPdf}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-[#142e25] text-[#dfbe7b] border border-[#c8a45d]/40 hover:bg-[#1c3e32] transition-colors cursor-pointer disabled:opacity-50"
              title="Download formal statutory PDF dossier"
            >
              <Download className="w-3.5 h-3.5 text-[#dfbe7b]" />
              <span>{generatingPdf ? 'Generating...' : pdfSuccess ? 'PDF Downloaded!' : 'Export PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-[#0f221b] text-[#d6ccb6] border border-[#1c3e32] hover:bg-[#142e25] hover:text-[#dfbe7b] transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <Link
              href={`/results/${data.request_id}/checklist`}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#c8a45d] to-[#dfbe7b] text-[#08130f] hover:brightness-105 transition-all shadow-sm"
            >
              <CheckSquare className="w-3.5 h-3.5 text-[#08130f]" />
              <span>Actionable Checklist</span>
            </Link>
          </div>
        </div>

        {/* 1. Question, 2. Classification, 3. Answer summary, 5. Important warnings, 9. Confidence */}
        <ResultOverview data={data} />

        {/* 4. Detailed Guidance */}
        <DetailedGuidance answer={data.answer} />

        {/* 6. Claims, 7. Evidence, 8. Citations (Every claim visually connected) */}
        <ClaimEvidenceGraph
          claims={data.claims}
          evidence={data.evidence}
          citations={data.citations}
        />

        {/* 8. Citations Standalone Authority Registry */}
        <CitationsList citations={data.citations} />

        {/* 10. Next Steps */}
        <NextStepsCard steps={data.next_steps} requestId={data.request_id} />

      </div>
    </div>
  );
};

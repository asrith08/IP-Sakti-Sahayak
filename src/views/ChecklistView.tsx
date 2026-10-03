import React, { useState, useEffect } from 'react';
import { useRouter, Link } from '../lib/router';
import { getAnalysisResult } from '../lib/api/client';
import { AnalyzeResponse } from '../types/api';
import { ChecklistManager } from '../components/checklist/ChecklistManager';
import { AlertCircle } from 'lucide-react';

export const ChecklistView: React.FC = () => {
  const { params } = useRouter();
  const requestId = params.id || 'req_ayur_849201';

  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const result = getAnalysisResult(requestId);
    setData(result);
    setLoading(false);
  }, [requestId]);

  if (loading) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center bg-[#08130f]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-[#dfbe7b] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-mono text-[#dfbe7b]">Loading statutory checklist items...</p>
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
            Checklist Not Found
          </h2>
          <p className="text-sm text-[#d6ccb6]">
            No checklist items recorded for dossier <code className="text-[#dfbe7b] font-mono">{requestId}</code>.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/results/req_ayur_849201/checklist"
              className="py-3 px-4 rounded-xl bg-[#142e25] text-[#dfbe7b] border border-[#c8a45d]/40 text-sm font-semibold hover:bg-[#1c3e32]"
            >
              Load Sample Indian Patent Checklist
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ChecklistManager
          initialItems={data.checklist}
          requestId={data.request_id}
          question={data.original_request?.question || 'Patentability of Ayurvedic Formulation'}
        />
      </div>
    </div>
  );
};

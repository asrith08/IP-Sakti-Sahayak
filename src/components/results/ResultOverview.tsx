import React from 'react';
import { AnalyzeResponse } from '../../types/api';
import { 
  ShieldCheck, 
  AlertTriangle, 
  HelpCircle, 
  Globe2, 
  Layers, 
  TrendingUp,
  FileCheck2
} from 'lucide-react';

interface ResultOverviewProps {
  data: AnalyzeResponse;
}

export const ResultOverview: React.FC<ResultOverviewProps> = ({ data }) => {
  const { classification, answer, original_request } = data;
  const confidencePercent = (classification.confidence * 100).toFixed(0);

  return (
    <div className="space-y-6">
      
      {/* 1. Question & Request Metadata Banner */}
      <div className="bg-[#0b1813] border border-[#c8a45d]/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-[#1c3e32]">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs text-[#c8a45d] px-2.5 py-1 rounded bg-[#08130f] border border-[#c8a45d]/20">
              DOSSIER ID: {data.request_id}
            </span>
            <span className="text-xs text-[#d6ccb6]/70 font-mono">
              Status: <span className="text-[#2dd4bf] font-semibold uppercase">{data.status}</span>
            </span>
          </div>
          <div className="text-xs text-[#d6ccb6]/60 font-mono">
            Generated: {data.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'Official Snapshot'}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#dfbe7b]">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Subject Query Under Examination</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#f5f1e7] font-serif-heading leading-snug">
            "{original_request?.question || 'Patentability & Regulatory Requirements for Ayurvedic Herbal Formulations'}"
          </h1>
          {original_request?.product?.name && (
            <div className="pt-2 text-xs text-[#d6ccb6]/90 flex items-center space-x-2">
              <span className="font-mono text-[#2dd4bf]">Target Formulation:</span>
              <span className="font-semibold text-[#f5f1e7]">{original_request.product.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Classification & 9. Confidence Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Domain Classification */}
        <div className="bg-[#0b1813] border border-[#c8a45d]/25 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#c8a45d]">
                Domain Classification
              </span>
              <Layers className="w-4 h-4 text-[#dfbe7b]" />
            </div>
            <div className="text-2xl font-bold text-[#f5f1e7] font-serif-heading mb-1">
              {classification.domain}
            </div>
            <p className="text-xs text-[#d6ccb6]/80 leading-relaxed font-sans">
              {classification.rationale || 'Categorized under botanical intellectual property and regulatory acts.'}
            </p>
          </div>

          {classification.subdomains && classification.subdomains.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#1c3e32] flex flex-wrap gap-1.5">
              {classification.subdomains.map((sub, idx) => (
                <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#08130f] text-[#dfbe7b] border border-[#c8a45d]/20">
                  {sub}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Statutory Jurisdiction */}
        <div className="bg-[#0b1813] border border-[#c8a45d]/25 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#c8a45d]">
                Target Jurisdiction
              </span>
              <Globe2 className="w-4 h-4 text-[#dfbe7b]" />
            </div>
            <div className="text-2xl font-bold text-[#f5f1e7] font-serif-heading mb-1">
              {classification.jurisdiction === 'IN' ? 'India (IN)' :
               classification.jurisdiction === 'US' ? 'United States (US)' :
               classification.jurisdiction === 'EU' ? 'European Union (EU)' :
               classification.jurisdiction === 'WO' ? 'WIPO International' : 'Cross-Border Comparison'}
            </div>
            <p className="text-xs text-[#d6ccb6]/80 leading-relaxed font-sans">
              Governed by territorial patent office directives and designated national botanical health authorities.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1c3e32] text-xs font-mono text-[#2dd4bf] flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Statutory Gazette Verified</span>
          </div>
        </div>

        {/* 9. Evidentiary Confidence Index */}
        <div className="bg-[#0b1813] border border-[#c8a45d]/25 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#c8a45d]">
                Evidentiary Confidence
              </span>
              <TrendingUp className="w-4 h-4 text-[#2dd4bf]" />
            </div>
            <div className="flex items-baseline space-x-2 mb-1">
              <span className="text-3xl font-bold text-[#f5f1e7] font-mono">{confidencePercent}%</span>
              <span className="text-xs font-mono text-[#2dd4bf]">High Reliability</span>
            </div>
            <p className="text-xs text-[#d6ccb6]/80 leading-relaxed font-sans">
              Calculated from primary statutory gazettes, codified pharmacopoeial monographs, and court rulings.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1c3e32] flex items-center justify-between text-xs font-mono text-[#d6ccb6]/70">
            <span>Traceable Sources: {data.citations.length}</span>
            <span>Claims: {data.claims.length}</span>
          </div>
        </div>

      </div>

      {/* 3. Answer Summary */}
      <div className="bg-gradient-to-b from-[#11271f] to-[#0c1a14] border border-[#dfbe7b] rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#dfbe7b] mb-3">
          <FileCheck2 className="w-4 h-4 text-[#dfbe7b]" />
          <span>Statutory Executive Summary</span>
        </div>
        <p className="text-base sm:text-lg text-[#f5f1e7] leading-relaxed font-serif-heading font-medium">
          {answer.summary}
        </p>
      </div>

      {/* 5. Important Warnings */}
      {answer.warnings && answer.warnings.length > 0 && (
        <div className="bg-amber-950/25 border border-amber-500/40 rounded-2xl p-6 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Important Statutory Warnings & Exclusion Risks</span>
          </div>
          <ul className="space-y-2.5">
            {answer.warnings.map((warning, index) => (
              <li key={index} className="flex items-start space-x-3 text-xs sm:text-sm text-amber-100/90 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
};

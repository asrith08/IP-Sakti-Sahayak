import React from 'react';
import { CitationItem } from '../../types/api';
import { Building2, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface CitationsListProps {
  citations: CitationItem[];
}

export const CitationsList: React.FC<CitationsListProps> = ({ citations }) => {
  return (
    <div className="bg-[#0b1813] border border-[#c8a45d]/25 rounded-2xl p-6 sm:p-8 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1c3e32]">
        <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#dfbe7b]">
          <Building2 className="w-4 h-4 text-[#dfbe7b]" />
          <span>Section 8: Official Authority Citations & Gazettes ({citations.length})</span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs font-mono text-[#2dd4bf]">
          <ShieldCheck className="w-4 h-4" />
          <span>Primary Source Certified</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {citations.map((cit) => (
          <div
            key={cit.id}
            className="p-5 rounded-xl bg-[#08130f] border border-[#c8a45d]/20 hover:border-[#c8a45d]/50 transition-colors flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="font-bold text-[#dfbe7b] px-2 py-0.5 rounded bg-[#142e25] border border-[#c8a45d]/30">
                  {cit.id}
                </span>
                <span className="text-[#2dd4bf] font-mono text-[11px] flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{cit.verification_status.replace('_', ' ').toUpperCase()}</span>
                </span>
              </div>

              <h4 className="text-base font-bold text-[#f5f1e7] font-serif-heading mb-1">
                {cit.document_title}
              </h4>

              <div className="text-xs text-[#dfbe7b] font-sans font-medium mb-2">
                {cit.authority_name}
              </div>

              <div className="space-y-1 text-xs font-mono text-[#d6ccb6]/70">
                <div>
                  <span className="text-[#d6ccb6]">Gazette / Reference:</span> {cit.gazette_or_reg_number}
                </div>
                <div>
                  <span className="text-[#d6ccb6]">Edition / Version:</span> {cit.version}
                </div>
                <div>
                  <span className="text-[#d6ccb6]">Enactment / Date:</span> {cit.effective_date}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1c3e32]">
              <a
                href={cit.official_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-2 text-xs font-semibold text-[#dfbe7b] hover:text-[#f5f1e7] transition-colors"
              >
                <span>Access Official Repository</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

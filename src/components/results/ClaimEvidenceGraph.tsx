import React, { useState } from 'react';
import { ClaimItem, EvidenceItem, CitationItem } from '../../types/api';
import { 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  ShieldCheck, 
  ArrowDown, 
  Hash,
  Filter
} from 'lucide-react';

interface ClaimEvidenceGraphProps {
  claims: ClaimItem[];
  evidence: EvidenceItem[];
  citations: CitationItem[];
}

export const ClaimEvidenceGraph: React.FC<ClaimEvidenceGraphProps> = ({
  claims,
  evidence,
  citations
}) => {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(claims[0]?.id || null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const evidenceMap = new Map<string, EvidenceItem>(evidence.map(e => [e.id, e]));
  const citationMap = new Map<string, CitationItem>(citations.map(c => [c.id, c]));

  const categories = ['ALL', ...Array.from(new Set(claims.map(c => c.category)))];

  const filteredClaims = filterCategory === 'ALL'
    ? claims
    : claims.filter(c => c.category === filterCategory);

  const getStatusBadge = (status: ClaimItem['status']) => {
    switch (status) {
      case 'valid':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-950/60 text-[#2dd4bf] border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Valid Under Compliance</span>
          </span>
        );
      case 'conditional':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-950/60 text-amber-300 border border-amber-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Conditional On Evidence</span>
          </span>
        );
      case 'restricted':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-orange-950/60 text-orange-300 border border-orange-500/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Mandatory Prior Clearance</span>
          </span>
        );
      case 'statutorily_barred':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-red-950/60 text-red-300 border border-red-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Statutorily Barred</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1c3e32]">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#dfbe7b]">
            Sections 6, 7 & 8: Evidentiary Mapping
          </span>
          <h2 className="text-2xl font-bold text-[#f5f1e7] font-serif-heading">
            Claims Connected to Supporting Evidence & Citations
          </h2>
        </div>

        {/* Category filter pills */}
        <div className="flex items-center space-x-2 text-xs overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-[#c8a45d] shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-lg font-mono text-xs transition-colors shrink-0 cursor-pointer ${
                filterCategory === cat
                  ? 'bg-[#142e25] text-[#dfbe7b] border border-[#c8a45d]'
                  : 'bg-[#08130f] text-[#d6ccb6]/70 border border-[#1c3e32] hover:text-[#f5f1e7]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Claim Cards Stack */}
      <div className="space-y-8">
        {filteredClaims.map((claim, index) => {
          const isSelected = selectedClaimId === claim.id;

          return (
            <div
              key={claim.id}
              onClick={() => setSelectedClaimId(claim.id)}
              className={`bg-[#0b1813] border rounded-2xl p-6 sm:p-7 shadow-xl transition-all ${
                isSelected ? 'border-[#dfbe7b] shadow-[0_0_30px_rgba(200,164,93,0.1)]' : 'border-[#c8a45d]/20 hover:border-[#c8a45d]/50'
              }`}
            >
              
              {/* CLAIM BLOCK */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#08130f] text-[#dfbe7b] border border-[#c8a45d]/30">
                      CLAIM {claim.id}
                    </span>
                    <span className="text-xs font-mono text-[#c8a45d]/80">
                      {claim.category}
                    </span>
                  </div>
                  <div>{getStatusBadge(claim.status)}</div>
                </div>

                <div className="text-lg sm:text-xl font-bold text-[#f5f1e7] font-serif-heading leading-snug">
                  "{claim.claim_text}"
                </div>

                {claim.impact_summary && (
                  <p className="text-xs sm:text-sm text-[#d6ccb6]/80 font-sans italic bg-[#08130f]/60 p-3 rounded-xl border border-[#1c3e32]">
                    <strong className="text-[#dfbe7b] not-italic font-mono">Prosecution Impact:</strong> {claim.impact_summary}
                  </p>
                )}
              </div>

              {/* VISUAL CONNECTOR TO SUPPORTING EVIDENCE */}
              <div className="py-4 flex items-center space-x-3 text-xs font-mono text-[#c8a45d]">
                <div className="h-px flex-1 bg-[#1c3e32]" />
                <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#142e25] border border-[#c8a45d]/30">
                  <ArrowDown className="w-3.5 h-3.5 text-[#dfbe7b]" />
                  <span>SUPPORTED BY ({claim.evidence_ids.length} Evidence Excerpts)</span>
                </div>
                <div className="h-px flex-1 bg-[#1c3e32]" />
              </div>

              {/* SUPPORTED BY: EVIDENCE CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {claim.evidence_ids.map((evId) => {
                  const ev = evidenceMap.get(evId);
                  if (!ev) return null;
                  const cit = citationMap.get(ev.citation_id);

                  return (
                    <div
                      key={ev.id}
                      className="bg-[#08130f] border border-[#14b8a6]/25 rounded-xl p-4 flex flex-col justify-between space-y-4"
                    >
                      {/* Evidence Top */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[#2dd4bf] font-bold px-2 py-0.5 rounded bg-[#142e25] border border-[#14b8a6]/30">
                            {ev.id}
                          </span>
                          <span className="text-[#d6ccb6]/60 truncate max-w-[200px]">
                            {ev.section_or_rule}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-[#f5f1e7] font-serif-heading">
                          {ev.title}
                        </h4>

                        <div className="p-3 rounded-lg bg-[#0c1813] border-l-2 border-[#14b8a6] text-xs text-[#d6ccb6] font-mono leading-relaxed">
                          {ev.excerpt}
                        </div>
                      </div>

                      {/* SOURCE: CONNECTED CITATION */}
                      <div className="pt-3 border-t border-[#1c3e32] space-y-2 text-[11px] font-mono text-[#d6ccb6]/80">
                        <div className="flex items-center space-x-1.5 text-[#dfbe7b] font-semibold">
                          <FileText className="w-3.5 h-3.5" />
                          <span>SOURCE</span>
                        </div>

                        <div className="text-xs text-[#f5f1e7] font-sans font-medium">
                          {ev.authority}
                        </div>

                        <div className="text-[#d6ccb6]">
                          <strong>Document:</strong> {ev.document_name}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-[#d6ccb6]/60">
                          <span>Version: {ev.document_version}</span>
                          {ev.publication_date && <span>Pub: {ev.publication_date}</span>}
                        </div>

                        {ev.authenticity_hash && (
                          <div className="flex items-center space-x-1 text-[10px] text-[#2dd4bf]/80 truncate">
                            <Hash className="w-3 h-3 shrink-0" />
                            <span className="truncate">{ev.authenticity_hash}</span>
                          </div>
                        )}

                        {cit?.official_url && (
                          <a
                            href={cit.official_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 text-xs text-[#dfbe7b] hover:text-[#f5f1e7] hover:underline pt-1"
                          >
                            <span>Inspect Official Gazette / Source</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

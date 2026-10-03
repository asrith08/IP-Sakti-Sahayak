import React from 'react';
import { 
  MessageSquareText, 
  Layers, 
  FileSearch, 
  Cpu, 
  CheckCircle, 
  Scale,
  ArrowRight
} from 'lucide-react';

interface Stage {
  step: string;
  name: string;
  shortDesc: string;
  detail: string;
  authorityTag: string;
  icon: React.ElementType;
}

const STAGES: Stage[] = [
  {
    step: '01',
    name: 'Ask',
    shortDesc: 'Enter Natural Language Query',
    detail: 'Submit formulation details, intended therapeutic indications, botanical components, and target market jurisdictions.',
    authorityTag: 'User Intake',
    icon: MessageSquareText
  },
  {
    step: '02',
    name: 'Classify',
    shortDesc: 'Domain & Statutory Mapping',
    detail: 'Identifies patent, trademark, geographical indication, biological diversity, or drug licensing boundaries.',
    authorityTag: 'Taxonomy Match',
    icon: Layers
  },
  {
    step: '03',
    name: 'Evidence',
    shortDesc: 'Official Repository Retrieval',
    detail: 'Retrieves verified gazettes, Ayurvedic Pharmacopoeia monographs, TKDL prior art classifications, and USP/FDA guidelines.',
    authorityTag: 'Statutory Gazettes',
    icon: FileSearch
  },
  {
    step: '04',
    name: 'Analyze',
    shortDesc: 'Statutory Bar Evaluation',
    detail: 'Evaluates Section 3(p) traditional knowledge exclusions, Section 3(e) synergistic efficacy requirements, and Rule 158-B compliance.',
    authorityTag: 'Evidentiary Synthesis',
    icon: Cpu
  },
  {
    step: '05',
    name: 'Verify',
    shortDesc: 'Citation & Cryptographic Audit',
    detail: 'Cross-verifies claims against authentic publication gazettes, active amendment versions, and official regulatory URLs.',
    authorityTag: 'Official Source Audit',
    icon: CheckCircle
  },
  {
    step: '06',
    name: 'Decide',
    shortDesc: 'Actionable Pre-Filing Checklist',
    detail: 'Generates structured claims, documented risks, and an interactive task checklist with specific statutory deadlines.',
    authorityTag: 'Defensible Outcome',
    icon: Scale
  }
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-[#0b1813] relative overflow-hidden border-b border-[#c8a45d]/20">
      
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#142e25]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest text-[#dfbe7b] bg-[#142e25]/60 border border-[#c8a45d]/30 mb-4">
            Methodology & Pipeline
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#f5f1e7] font-serif-heading tracking-tight">
            How IP-SAKTI Sahayak Works
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#d6ccb6] font-light">
            A rigorous, multi-stage evidentiary pipeline transforming regulatory ambiguity into defensible decisions.
          </p>
        </div>

        {/* The 6-stage Flow Visual */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.step}
                className="relative bg-gradient-to-b from-[#11271f]/90 to-[#0c1a14]/95 border border-[#c8a45d]/20 hover:border-[#c8a45d]/50 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 shadow-lg group"
              >
                {/* Step indicator top row */}
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold text-[#c8a45d] px-2.5 py-1 rounded-md bg-[#08130f] border border-[#c8a45d]/30">
                    STAGE {stage.step}
                  </span>
                  <span className="text-[11px] font-mono text-[#2dd4bf] bg-[#142e25] px-2 py-0.5 rounded border border-[#14b8a6]/25">
                    {stage.authorityTag}
                  </span>
                </div>

                {/* Icon & Title */}
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#142e25] border border-[#c8a45d]/30 flex items-center justify-center group-hover:border-[#dfbe7b] transition-colors">
                    <Icon className="w-5 h-5 text-[#dfbe7b]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#f5f1e7] font-serif-heading">
                    {stage.name}
                  </h3>
                </div>

                <div className="text-sm font-medium text-[#dfbe7b]/90 mb-2 font-sans">
                  {stage.shortDesc}
                </div>

                <p className="text-xs sm:text-sm text-[#d6ccb6]/80 leading-relaxed font-sans">
                  {stage.detail}
                </p>

                {/* Connecting arrow indicator for visual flow (except last) */}
                {idx < STAGES.length - 1 && (
                  <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-[#08130f] border border-[#c8a45d]/30 flex items-center justify-center shadow-md">
                      <ArrowRight className="w-3.5 h-3.5 text-[#c8a45d]" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Flow Ribbon summary */}
        <div className="mt-12 p-4 sm:p-5 rounded-xl bg-[#08130f] border border-[#c8a45d]/30 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-[#d6ccb6]">
          <span className="font-semibold text-[#f5f1e7]">Pipeline Flow:</span>
          <span className="text-[#dfbe7b]">Ask</span>
          <span className="text-[#c8a45d]/40">→</span>
          <span className="text-[#dfbe7b]">Classify</span>
          <span className="text-[#c8a45d]/40">→</span>
          <span className="text-[#dfbe7b]">Evidence</span>
          <span className="text-[#c8a45d]/40">→</span>
          <span className="text-[#dfbe7b]">Analyze</span>
          <span className="text-[#c8a45d]/40">→</span>
          <span className="text-[#dfbe7b]">Verify</span>
          <span className="text-[#c8a45d]/40">→</span>
          <span className="font-semibold text-[#2dd4bf]">Decide</span>
        </div>

      </div>
    </section>
  );
};

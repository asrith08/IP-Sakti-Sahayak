import React from 'react';
import { Link } from '../../lib/router';
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const FinalCtaSection: React.FC = () => {
  return (
    <section className="py-20 lg:py-24 bg-gradient-to-b from-[#08130f] to-[#060e0b] relative overflow-hidden">
      
      {/* Background accents */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#142e25]/30 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#142e25] text-[#dfbe7b] border border-[#c8a45d]/40 mb-6">
          <ShieldCheck className="w-4 h-4 text-[#dfbe7b]" />
          <span>Ready for Statutory Evidence Synthesis</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#f5f1e7] font-serif-heading tracking-tight max-w-2xl mx-auto leading-tight">
          Clear the Regulatory Fog Around Your Ayurvedic Innovation
        </h2>

        <p className="mt-4 sm:mt-6 text-base sm:text-lg text-[#d6ccb6] max-w-2xl mx-auto font-light">
          Whether you are evaluating a novel polyherbal synergy, preparing an NBA Form III filing, or comparing US FDA dietary vs. drug pathways, IP-SAKTI Sahayak delivers traceable answers in seconds.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-[#eae3d2]">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#14b8a6]" />
            <span>No LLM hallucinations</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#14b8a6]" />
            <span>Patents Act 1970 § 3(p) & 3(e)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#14b8a6]" />
            <span>Multilingual IN • US • EU</span>
          </span>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/ask"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-3 px-9 py-4 rounded-xl text-base font-semibold bg-gradient-to-r from-[#c8a45d] to-[#dfbe7b] text-[#08130f] hover:brightness-105 shadow-[0_4px_24px_rgba(200,164,93,0.35)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Sparkles className="w-5 h-5 text-[#08130f]" />
            <span>Ask IP-SAKTI Now</span>
            <ArrowRight className="w-5 h-5 text-[#08130f]" />
          </Link>
        </div>

      </div>
    </section>
  );
};

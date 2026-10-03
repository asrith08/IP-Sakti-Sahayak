import React from 'react';
import { NextStepItem } from '../../types/api';
import { Link } from '../../lib/router';
import { ListOrdered, ArrowRight, CheckSquare, Clock, Building } from 'lucide-react';

interface NextStepsCardProps {
  steps: NextStepItem[];
  requestId: string;
}

export const NextStepsCard: React.FC<NextStepsCardProps> = ({ steps, requestId }) => {
  return (
    <div className="bg-[#0b1813] border border-[#c8a45d]/30 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1c3e32]">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#dfbe7b]">
            Section 10: Procedural Roadmap
          </span>
          <h2 className="text-2xl font-bold text-[#f5f1e7] font-serif-heading">
            Recommended Statutory Next Steps
          </h2>
        </div>

        <Link
          href={`/results/${requestId}/checklist`}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#c8a45d] to-[#dfbe7b] text-[#08130f] hover:brightness-105 transition-all shadow-md shrink-0"
        >
          <CheckSquare className="w-4 h-4 text-[#08130f]" />
          <span>Launch Actionable Checklist →</span>
        </Link>
      </div>

      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.step_number}
            className="p-5 rounded-xl bg-[#08130f] border border-[#1c3e32] hover:border-[#c8a45d]/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start space-x-4">
              <div className="w-9 h-9 rounded-xl bg-[#142e25] border border-[#c8a45d]/30 flex items-center justify-center font-mono font-bold text-sm text-[#dfbe7b] shrink-0 mt-0.5">
                0{step.step_number}
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-[#f5f1e7] font-serif-heading">
                  {step.action}
                </h4>
                {step.guidance_note && (
                  <p className="text-xs sm:text-sm text-[#d6ccb6]/80 font-sans leading-relaxed">
                    {step.guidance_note}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono text-[#d6ccb6]/70">
                  <span className="flex items-center space-x-1 text-[#2dd4bf]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Timeline: {step.timeline}</span>
                  </span>
                  <span className="flex items-center space-x-1 text-[#dfbe7b]">
                    <Building className="w-3.5 h-3.5" />
                    <span>Authority: {step.authority_to_approach}</span>
                  </span>
                </div>
              </div>
            </div>

            {step.required_forms && step.required_forms.length > 0 && (
              <div className="shrink-0 flex flex-wrap md:flex-col gap-1.5 md:items-end">
                {step.required_forms.map((form, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded bg-[#0f221b] border border-[#c8a45d]/25 text-[11px] font-mono text-[#dfbe7b]"
                  >
                    {form}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};

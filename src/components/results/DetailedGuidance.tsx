import React from 'react';
import { AnswerSection } from '../../types/api';
import { BookOpen, Scale } from 'lucide-react';

interface DetailedGuidanceProps {
  answer: AnswerSection;
}

export const DetailedGuidance: React.FC<DetailedGuidanceProps> = ({ answer }) => {
  return (
    <div className="space-y-6">
      <div className="bg-[#0b1813] border border-[#c8a45d]/25 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#dfbe7b] mb-4 pb-2 border-b border-[#1c3e32]">
          <BookOpen className="w-4 h-4 text-[#dfbe7b]" />
          <span>Section 4: Detailed Statutory & Regulatory Guidance</span>
        </div>

        <div className="space-y-4 text-sm sm:text-base text-[#d6ccb6] leading-relaxed">
          {answer.details.map((detail, index) => (
            <div
              key={index}
              className="p-4 rounded-xl bg-[#08130f] border border-[#1c3e32] hover:border-[#c8a45d]/40 transition-colors flex items-start space-x-3.5"
            >
              <span className="font-mono text-xs font-bold text-[#c8a45d] px-2 py-0.5 rounded bg-[#142e25] border border-[#c8a45d]/30 shrink-0 mt-0.5">
                0{index + 1}
              </span>
              <div className="flex-1 text-[#eae3d2] font-sans">
                {detail}
              </div>
            </div>
          ))}
        </div>

        {/* Statutory Basis listing */}
        {answer.statutoryBasis && answer.statutoryBasis.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#1c3e32]">
            <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#c8a45d] mb-3">
              <Scale className="w-3.5 h-3.5 text-[#c8a45d]" />
              <span>Direct Statutory Enactments</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {answer.statutoryBasis.map((sb, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#08130f] border border-[#c8a45d]/30 text-[#f5f1e7]"
                >
                  {sb}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

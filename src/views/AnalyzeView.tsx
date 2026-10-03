import React from 'react';
import { AnalysisStateMachine } from '../components/analysis/AnalysisStateMachine';
import { Link } from '../lib/router';
import { ArrowLeft, Cpu } from 'lucide-react';

export const AnalyzeView: React.FC = () => {
  return (
    <div className="w-full min-h-[85vh] py-12 sm:py-16 bg-[#08130f]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/ask"
            className="inline-flex items-center space-x-2 text-xs font-mono text-[#c8a45d] hover:text-[#f5f1e7] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Modify Query Parameters</span>
          </Link>
          <div className="flex items-center space-x-2 text-xs font-mono text-[#2dd4bf]">
            <Cpu className="w-3.5 h-3.5" />
            <span>API State Machine Engine v1.4</span>
          </div>
        </div>

        {/* State Machine Interface */}
        <AnalysisStateMachine />

      </div>
    </div>
  );
};

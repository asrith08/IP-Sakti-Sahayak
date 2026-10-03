import React from 'react';
import { AskForm } from '../components/ask/AskForm';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Link } from '../lib/router';
import askBgImage from '../assets/images/ayurveda_ask_manuscript_1789750103467.jpg';

export const AskView: React.FC = () => {
  return (
    <div className="relative w-full min-h-screen py-8 sm:py-14 bg-[#0a1813] overflow-x-hidden">
      {/* =========================================================================
          Ayurvedic Traditional Manuscript & Botanical Background
          - Desktop (lg and up): Full-bleed layout (100% identical to current approved desktop design)
          - Mobile & Tablet (< lg): Complete artwork visible without horizontal cropping,
            scaling proportionally to preserve original aspect ratio, deckled manuscript parchment,
            and all botanical elements (Paisley mandala, Haritaki sprig, sliced Amla, spices, mortar & pestle).
          ========================================================================= */}
      <div className="pointer-events-none select-none z-0">
        {/* Desktop Background (lg and up) - 100% identical to current approved desktop view */}
        <div className="hidden lg:block absolute inset-0 w-full h-full">
          <img
            src={askBgImage}
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('ask-manuscript-bg.jpg')) {
                target.src = '/images/ask-manuscript-bg.jpg';
              }
            }}
            alt="Ayurvedic Botanical Manuscript Background"
            aria-hidden="true"
            className="w-full h-full object-cover object-center opacity-100"
            referrerPolicy="no-referrer"
          />
          {/* Soft ambient vignette to integrate with navbar and footer */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#08130f]/40 via-transparent to-[#08130f]/50 pointer-events-none" />
        </div>

        {/* Mobile & Tablet Background (< lg) - Complete artwork scaled proportionally, 0 cropping */}
        <div className="lg:hidden fixed inset-0 w-full h-full flex items-center justify-center overflow-hidden">
          <img
            src={askBgImage}
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('ask-manuscript-bg.jpg')) {
                target.src = '/images/ask-manuscript-bg.jpg';
              }
            }}
            alt="Ayurvedic Botanical Manuscript Background"
            aria-hidden="true"
            className="w-full h-auto max-h-screen object-contain object-center opacity-95"
            referrerPolicy="no-referrer"
          />
          {/* Soft ambient vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#08130f]/40 via-transparent to-[#08130f]/50 pointer-events-none" />
        </div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back navigation */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-xs font-mono text-[#c8a45d] hover:text-[#f5f1e7] transition-colors group bg-[#0b1813]/80 px-3 py-1.5 rounded-lg border border-[#c8a45d]/25 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Return to Overview</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8 text-center sm:text-left space-y-3 pb-6 border-b border-[#c8a45d]/30 relative bg-[#0b1813]/70 backdrop-blur-md p-6 rounded-2xl border border-[#c8a45d]/25 shadow-xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono bg-[#142e25]/90 backdrop-blur-sm text-[#dfbe7b] border border-[#c8a45d]/40 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-[#dfbe7b]" />
            <span>Ayurveda Regulatory & IP Consultation Intake</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-bold text-[#f5f1e7] font-serif-heading tracking-tight drop-shadow-md">
            What would you like to know?
          </h1>
          
          <p className="text-sm sm:text-base text-[#d6ccb6] font-light max-w-3xl leading-relaxed">
            Submit your Ayurvedic formulation, active botanical components, or regulatory dilemma. 
            The system maps claims against the Indian Patents Act 1970 § 3(p), TKDL prior art, and global botanical standards.
          </p>

          {/* Traditional Devanagari Manuscript Inscription (from reference image) */}
          <div className="pt-2 flex items-center justify-between text-[11px] sm:text-xs text-[#dfbe7b]/60 font-serif tracking-wider select-none pointer-events-none border-t border-[#c8a45d]/15 mt-3">
            <span className="hidden sm:inline">॥ चरकसंहिता • सूत्रस्थानम् ॥</span>
            <span className="truncate">॥ नैकरसो हि सद्यः प्रायशोऽनुभवति रसान् • रसवीर्यविपाकप्रभावैः कर्म कुर्वन्ति द्रव्याणि ॥</span>
            <span className="hidden md:inline">॥ पारम्परिकज्ञानकोशः ॥</span>
          </div>
        </div>

        {/* Existing Controlled Form (Unchanged UI, Layout, Inputs, and Functionality) */}
        <div className="relative">
          <AskForm />
        </div>

      </div>
    </div>
  );
};



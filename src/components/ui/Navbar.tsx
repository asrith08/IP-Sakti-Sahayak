import React, { useState } from 'react';
import { Link, useRouter } from '../../lib/router';
import { Sparkles, ShieldCheck, ArrowRight, Menu, X, PlayCircle } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { pathname, navigate } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (pathname !== '/') {
      navigate('/#' + id);
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#08130f]/85 border-b border-[#c8a45d]/20 transition-all duration-300">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Left: Brand Identity */}
          <div className="flex items-center space-x-3 shrink-0">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1c3e32] to-[#0c1e18] border border-[#c8a45d]/40 flex items-center justify-center shadow-md group-hover:border-[#c8a45d] transition-all">
                <ShieldCheck className="w-5 h-5 text-[#dfbe7b]" />
              </div>
              <div className="flex flex-col">
                <span className="font-brand text-lg font-bold tracking-wider text-[#f5f1e7] group-hover:text-[#dfbe7b] transition-colors">
                  IP-SAKTI
                </span>
                <span className="text-[10px] tracking-widest uppercase font-medium text-[#c8a45d]/90 font-sans -mt-1">
                  Sahayak
                </span>
              </div>
            </Link>
            <div className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#142e25]/60 text-[#dfbe7b] border border-[#c8a45d]/25 ml-2">
              Ayurveda IP & Reg
            </div>
          </div>

          {/* Center: Distributed Navigation across available width */}
          <nav className="hidden md:flex items-center justify-center space-x-8 lg:space-x-10 text-sm font-medium text-[#d6ccb6]">
            <button
              onClick={() => scrollToSection('product')}
              className="hover:text-[#dfbe7b] transition-colors cursor-pointer"
            >
              Product
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[#dfbe7b] transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('capabilities')}
              className="hover:text-[#dfbe7b] transition-colors cursor-pointer"
            >
              Capabilities
            </button>
            <button
              onClick={() => scrollToSection('trust-sources')}
              className="hover:text-[#dfbe7b] transition-colors cursor-pointer"
            >
              Trust & Sources
            </button>
          </nav>

          {/* Right: Actions */}
          <div className="hidden md:flex items-center space-x-4 shrink-0">
            <button
              onClick={() => setShowDemoModal(true)}
              className="inline-flex items-center space-x-2 text-sm text-[#eae3d2] hover:text-[#dfbe7b] px-3 py-2 rounded-md transition-colors cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 text-[#c8a45d]" />
              <span>Watch Demo</span>
            </button>

            <Link
              href="/ask"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#c8a45d] to-[#dfbe7b] text-[#08130f] hover:brightness-105 shadow-[0_2px_12px_rgba(200,164,93,0.3)] transition-all transform active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-[#08130f]" />
              <span>Ask IP-SAKTI</span>
              <ArrowRight className="w-4 h-4 text-[#08130f]" />
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center space-x-3">
            <Link
              href="/ask"
              className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-[#c8a45d] text-[#08130f]"
            >
              Ask
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#d6ccb6] hover:text-[#dfbe7b]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-[#d6ccb6]" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#c8a45d]/20 bg-[#0b1813] px-5 py-6 space-y-4">
            <button
              onClick={() => scrollToSection('product')}
              className="block w-full text-left text-base font-medium text-[#eae3d2] py-2"
            >
              Product
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left text-base font-medium text-[#eae3d2] py-2"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('capabilities')}
              className="block w-full text-left text-base font-medium text-[#eae3d2] py-2"
            >
              Capabilities
            </button>
            <button
              onClick={() => scrollToSection('trust-sources')}
              className="block w-full text-left text-base font-medium text-[#eae3d2] py-2"
            >
              Trust & Sources
            </button>
            <div className="pt-4 border-t border-[#1c3e32] flex flex-col space-y-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowDemoModal(true);
                }}
                className="flex items-center space-x-2 text-sm text-[#dfbe7b] py-2"
              >
                <PlayCircle className="w-5 h-5 text-[#c8a45d]" />
                <span>Watch Product Tour Demo</span>
              </button>
              <Link
                href="/ask"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 rounded-lg text-sm font-semibold bg-[#c8a45d] text-[#08130f]"
              >
                Ask IP-SAKTI Sahayak
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Product Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-[#0f221b] border border-[#c8a45d]/40 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-4 right-4 p-2 text-[#d6ccb6] hover:text-[#f5f1e7] rounded-lg hover:bg-[#1c3e32]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-lg bg-[#c8a45d]/20 border border-[#c8a45d]/30">
                <PlayCircle className="w-6 h-6 text-[#dfbe7b]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#f5f1e7]">IP-SAKTI Sahayak Guided Tour</h3>
                <p className="text-xs text-[#c8a45d]">Ayurvedic Patent & Regulatory Intelligence Architecture</p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-[#d6ccb6] leading-relaxed my-4">
              <p>
                Welcome to the demonstration overview of <strong className="text-[#f5f1e7]">IP-SAKTI Sahayak</strong>. 
                Built as a pure client-side intelligence gateway, the interface coordinates five core regulatory domains:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#0b1813] border border-[#c8a45d]/20">
                <div className="flex items-start space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#c8a45d] mt-1.5 shrink-0" />
                  <span><strong>Patents Act Section 3(p)</strong> Traditional knowledge objection analysis</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#14b8a6] mt-1.5 shrink-0" />
                  <span><strong>Biological Diversity Act Sec 6</strong> Mandatory NBA Chennai approvals</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#dfbe7b] mt-1.5 shrink-0" />
                  <span><strong>TKDL Cross-Referencing</strong> Classical Ayurvedic scripture prior art verification</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#2dd4bf] mt-1.5 shrink-0" />
                  <span><strong>Multilingual Guidance</strong> English, हिन्दी, and తెలుగు statutory output</span>
                </div>
              </div>
              <p className="text-xs text-[#d6ccb6]/80 italic">
                Experience the live query entry, real-time pipeline state machine, and interactive claim-to-evidence audit graph.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#1c3e32]">
              <button
                onClick={() => setShowDemoModal(false)}
                className="px-4 py-2 text-sm text-[#d6ccb6] hover:text-[#f5f1e7]"
              >
                Close
              </button>
              <Link
                href="/ask"
                onClick={() => setShowDemoModal(false)}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#c8a45d] to-[#dfbe7b] text-[#08130f]"
              >
                Launch Ask Interface →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

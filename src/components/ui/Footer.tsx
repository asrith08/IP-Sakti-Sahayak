import React from 'react';
import { Link } from '../../lib/router';
import { ShieldCheck, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#060e0b] border-t border-[#c8a45d]/20 text-[#d6ccb6] text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#142e25] border border-[#c8a45d]/40 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#dfbe7b]" />
              </div>
              <span className="font-brand text-lg font-bold text-[#f5f1e7] tracking-wider">
                IP-SAKTI Sahayak
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#d6ccb6]/80 max-w-md leading-relaxed">
              A specialized regulatory intelligence platform providing source-backed, evidence-traceable 
              guidance for Ayurvedic formulations, geographical indications, and botanical patents across India, US, and international jurisdictions.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] bg-[#0f221b] border border-[#c8a45d]/25 text-[#dfbe7b]">
                Indian Patents Act 1970 § 3(p)
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] bg-[#0f221b] border border-[#14b8a6]/25 text-[#2dd4bf]">
                TKDL Compliant
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] bg-[#0f221b] border border-[#c8a45d]/25 text-[#dfbe7b]">
                Biological Diversity Act 2002 § 6
              </span>
            </div>
          </div>

          {/* Core Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-[#dfbe7b] font-mono">
              Product Navigation
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/" className="hover:text-[#dfbe7b] transition-colors">
                  Overview & Methodology
                </Link>
              </li>
              <li>
                <Link href="/ask" className="hover:text-[#dfbe7b] transition-colors">
                  Ask IP-SAKTI
                </Link>
              </li>
              <li>
                <Link href="/ask/analyze?question=Can%20I%20patent%20an%20Ayurvedic%20herbal%20formulation%20in%20India%3F&jurisdiction=IN&guidance_type=PATENT&language=en" className="hover:text-[#dfbe7b] transition-colors">
                  Analysis Pipeline Demo
                </Link>
              </li>
              <li>
                <Link href="/results/req_ayur_849201" className="hover:text-[#dfbe7b] transition-colors">
                  Sample Regulatory Dossier
                </Link>
              </li>
              <li>
                <Link href="/results/req_ayur_849201/checklist" className="hover:text-[#dfbe7b] transition-colors">
                  Actionable Pre-Filing Checklist
                </Link>
              </li>
            </ul>
          </div>

          {/* Regulatory Authorities */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-[#dfbe7b] font-mono">
              Official Repositories
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a
                  href="https://ipindia.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#dfbe7b] transition-colors inline-flex items-center space-x-1"
                >
                  <span>IPO (Controller General)</span>
                  <ExternalLink className="w-3 h-3 text-[#c8a45d]/60" />
                </a>
              </li>
              <li>
                <a
                  href="https://ayush.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#dfbe7b] transition-colors inline-flex items-center space-x-1"
                >
                  <span>Ministry of AYUSH</span>
                  <ExternalLink className="w-3 h-3 text-[#c8a45d]/60" />
                </a>
              </li>
              <li>
                <a
                  href="http://nbaindia.org"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#dfbe7b] transition-colors inline-flex items-center space-x-1"
                >
                  <span>National Biodiversity Authority</span>
                  <ExternalLink className="w-3 h-3 text-[#c8a45d]/60" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.fda.gov/media/93113/download"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#dfbe7b] transition-colors inline-flex items-center space-x-1"
                >
                  <span>US FDA Botanical Guidance</span>
                  <ExternalLink className="w-3 h-3 text-[#c8a45d]/60" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Mandatory Statutory Notice */}
        <div className="mt-10 pt-6 border-t border-[#1c3e32]/60 text-xs text-[#d6ccb6]/70 space-y-2">
          <p>
            <strong>Regulatory Notice & Disclaimer:</strong> IP-SAKTI Sahayak is a specialized technical presentation interface designed to synthesize public statutory frameworks, gazettes, and official guidance. It does not provide certified legal counsel, formal patent prosecution representation, or regulatory certification. Users must verify all outputs with accredited patent agents and designated statutory authorities.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 text-[11px] text-[#d6ccb6]/60">
            <span>© {new Date().getFullYear()} IP-SAKTI Sahayak. Dedicated to Evidence-Based Ayurvedic Innovation.</span>
            <span className="mt-2 sm:mt-0 font-mono text-[#c8a45d]/80">ISO 17025 / TKDL Cross-Validated Schemas</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

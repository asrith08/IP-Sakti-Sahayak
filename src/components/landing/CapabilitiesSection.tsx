import React from 'react';
import { 
  FileText, 
  Scale, 
  FlaskConical, 
  Languages, 
  ShieldCheck, 
  GitCompare, 
  TrendingUp, 
  CheckSquare,
  ArrowUpRight
} from 'lucide-react';
import { Link } from '../../lib/router';

interface CapabilityCard {
  title: string;
  category: string;
  description: string;
  statutoryDetail: string;
  icon: React.ElementType;
}

const CAPABILITIES: CapabilityCard[] = [
  {
    title: 'IP Guidance',
    category: 'Patent & Trademarks',
    description: 'Statutory evaluation under Section 3(p) for traditional knowledge exclusions and Section 3(e) synergistic efficacy requirements to defend patent claims.',
    statutoryDetail: 'Patents Act 1970 § 3(d), 3(e), 3(p)',
    icon: FileText
  },
  {
    title: 'Regulatory Guidance',
    category: 'AYUSH & Drugs Act',
    description: 'Step-by-step navigation of State Licensing Authority (AYUSH) manufacturing permits, Rule 158-B proof of safety, and GMP compliance under Schedule T.',
    statutoryDetail: 'Drugs and Cosmetics Rules 1945',
    icon: Scale
  },
  {
    title: 'Ayurveda Product Classification',
    category: 'Taxonomy Engine',
    description: 'Accurate differentiation between classical formulations, proprietary Ayurvedic medicines, botanical supplements, and cosmetic ayurvedic preparations.',
    statutoryDetail: 'Ayurvedic Pharmacopoeia (API)',
    icon: FlaskConical
  },
  {
    title: 'Multilingual Assistance',
    category: 'Cross-Language Precision',
    description: 'Native regulatory intelligence synthesized in English, Hindi (हिन्दी), and Telugu (తెలుగు) with preserved statutory terminology and Sanskrit botanical names.',
    statutoryDetail: 'Binomial & Classical Nomenclature',
    icon: Languages
  },
  {
    title: 'Evidence-Backed Answers',
    category: 'Statutory Traceability',
    description: 'Every statement is cryptographically mapped to published gazette notifications, high court rulings, and authentic institutional portals.',
    statutoryDetail: '100% Verifiable Gazette Hashes',
    icon: ShieldCheck
  },
  {
    title: 'Jurisdiction Comparison',
    category: 'Cross-Border Compliance',
    description: 'Side-by-side comparative analysis of market entry pathways across India (AYUSH), United States (FDA DSHEA vs. Botanical IND), and European Union (EMA THMPD).',
    statutoryDetail: 'IN • US • EU • WIPO',
    icon: GitCompare
  },
  {
    title: 'Regulatory Change Intelligence',
    category: 'Gazette Monitoring',
    description: 'Live alerts on amendments, such as Biological Diversity Amendment Act 2023 exemptions, and updated pharmacopoeial heavy metal contaminant standards.',
    statutoryDetail: 'Real-Time Gazette Tracking',
    icon: TrendingUp
  },
  {
    title: 'Actionable Checklists',
    category: 'Workflow Execution',
    description: 'Prioritized pre-filing compliance checklists with document requirements, authority routing (e.g. NBA Chennai), and statutory timeline tracking.',
    statutoryDetail: 'Interactive Pre-Filing Roadmap',
    icon: CheckSquare
  }
];

export const CapabilitiesSection: React.FC = () => {
  return (
    <section id="capabilities" className="py-20 lg:py-28 bg-[#08130f] relative overflow-hidden border-b border-[#c8a45d]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest text-[#dfbe7b] bg-[#142e25]/60 border border-[#c8a45d]/30 mb-4">
            Core Modules
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#f5f1e7] font-serif-heading tracking-tight">
            Specialized Regulatory Capabilities
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#d6ccb6] font-light">
            Engineered specifically to untangle the intersection of ancient Ayurvedic tradition and modern intellectual property jurisprudence.
          </p>
        </div>

        {/* 8 Capability Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.title}
                className="bg-[#0b1813] border border-[#c8a45d]/20 hover:border-[#c8a45d]/60 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#142e25] border border-[#c8a45d]/30 flex items-center justify-center group-hover:border-[#dfbe7b] transition-colors">
                      <Icon className="w-5 h-5 text-[#dfbe7b]" />
                    </div>
                    <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-[#08130f] text-[#c8a45d] border border-[#c8a45d]/20">
                      {cap.category}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#f5f1e7] mb-2 font-serif-heading group-hover:text-[#dfbe7b] transition-colors">
                    {cap.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#d6ccb6]/80 leading-relaxed font-sans mb-4">
                    {cap.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#1c3e32]/60 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-[#2dd4bf]">
                    {cap.statutoryDetail}
                  </span>
                  <Link
                    href="/ask"
                    className="p-1 rounded text-[#c8a45d] group-hover:text-[#dfbe7b] hover:bg-[#142e25] transition-colors"
                    aria-label={`Inquire about ${cap.title}`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

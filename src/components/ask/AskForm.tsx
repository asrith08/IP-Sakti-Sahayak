import React, { useState } from 'react';
import { useRouter } from '../../lib/router';
import { 
  JurisdictionCode, 
  GuidanceType, 
  LanguageCode, 
  ProductDetails 
} from '../../types/api';
import { 
  Sparkles, 
  ArrowRight, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  X, 
  Globe2, 
  FileCheck, 
  Languages 
} from 'lucide-react';

const JURISDICTIONS: { label: string; code: JurisdictionCode; flag: string; desc: string }[] = [
  { label: 'India', code: 'IN', flag: '🇮🇳', desc: 'IPO, AYUSH, NBA Chennai' },
  { label: 'United States', code: 'US', flag: '🇺🇸', desc: 'FDA, DSHEA, USP' },
  { label: 'European Union', code: 'EU', flag: '🇪🇺', desc: 'EMA, THMPD 2004/24/EC' },
  { label: 'WIPO', code: 'WO', flag: '🌐', desc: 'PCT, IGC Traditional Knowledge' },
  { label: 'Compare', code: 'COMPARE', flag: '⚖️', desc: 'Multi-jurisdiction synthesis' }
];

const GUIDANCE_TYPES: { label: string; type: GuidanceType; short: string }[] = [
  { label: 'Patent', type: 'PATENT', short: 'Sec 3(p) & 3(e) Synergistic Efficacy' },
  { label: 'Geographical Indication', type: 'GEOGRAPHICAL_INDICATION', short: 'Appellation & Heritage Origin' },
  { label: 'Traditional Knowledge', type: 'TRADITIONAL_KNOWLEDGE', short: 'TKDL Prior Art Verification' },
  { label: 'Trademark', type: 'TRADEMARK', short: 'Ayurvedic Class 05 & Brand Protection' },
  { label: 'Copyright', type: 'COPYRIGHT', short: 'Formulation Compendia & Literature' },
  { label: 'Regulatory', type: 'REGULATORY', short: 'AYUSH Rule 158-B & Licensing' },
  { label: 'Compliance', type: 'COMPLIANCE', short: 'NBA Form III & Biodiversity Acts' },
  { label: 'General', type: 'GENERAL', short: 'Holistic Regulatory Landscape' }
];

const LANGUAGES: { label: string; code: LanguageCode; native: string }[] = [
  { label: 'English', code: 'en', native: 'English' },
  { label: 'हिन्दी', code: 'hi', native: 'Hindi' },
  { label: 'తెలుగు', code: 'te', native: 'Telugu' }
];

const PRESET_QUESTIONS = [
  {
    title: 'Patenting Formulation in India',
    question: 'I have developed an Ayurvedic herbal formulation. Can I patent it in India?',
    jurisdiction: 'IN' as JurisdictionCode,
    guidance: 'PATENT' as GuidanceType
  },
  {
    title: 'US FDA Dietary vs Drug Entry',
    question: 'Can I export an Ayurvedic botanical supplement to the US under DSHEA without FDA pre-approval?',
    jurisdiction: 'US' as JurisdictionCode,
    guidance: 'REGULATORY' as GuidanceType
  },
  {
    title: 'TKDL Prior Art Clearance',
    question: 'How does the Indian Patent Office verify classical Ayurvedic formulas against the TKDL database?',
    jurisdiction: 'IN' as JurisdictionCode,
    guidance: 'TRADITIONAL_KNOWLEDGE' as GuidanceType
  },
  {
    title: 'NBA Biological Diversity Approval',
    question: 'Do I need prior approval from the National Biodiversity Authority (NBA) before filing a patent for an Ashwagandha extract?',
    jurisdiction: 'IN' as JurisdictionCode,
    guidance: 'COMPLIANCE' as GuidanceType
  }
];

export const AskForm: React.FC = () => {
  const { navigate } = useRouter();

  // Controlled states with default requirements: India, Regulatory, English
  const [question, setQuestion] = useState('I have developed an Ayurvedic herbal formulation. Can I patent it in India?');
  const [jurisdiction, setJurisdiction] = useState<JurisdictionCode>('IN');
  const [guidanceType, setGuidanceType] = useState<GuidanceType>('REGULATORY');
  const [language, setLanguage] = useState<LanguageCode>('en');

  // Optional Product details accordion
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [product, setProduct] = useState<ProductDetails>({
    name: 'Herbal Synergy Complex',
    description: 'Synergistic formulation combining standardized extracts of Withania somnifera and Curcuma longa for joint mobility.',
    ingredients: ['Withania somnifera (Ashwagandha)', 'Curcuma longa (Haridra)', 'Piper nigrum (Maricha)']
  });
  const [newIngredient, setNewIngredient] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAddIngredient = () => {
    if (newIngredient.trim()) {
      setProduct({
        ...product,
        ingredients: [...product.ingredients, newIngredient.trim()]
      });
      setNewIngredient('');
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setProduct({
      ...product,
      ingredients: product.ingredients.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setValidationError('Please enter your question before proceeding with analysis.');
      return;
    }
    setValidationError(null);

    // Build URL search parameters to pass through /ask/analyze as mandated
    const params = new URLSearchParams();
    params.set('question', question.trim());
    params.set('jurisdiction', jurisdiction);
    params.set('guidance_type', guidanceType);
    params.set('language', language);

    if (showProductDetails && product.name.trim()) {
      params.set('product_name', product.name.trim());
      if (product.description) params.set('product_desc', product.description.trim());
      if (product.ingredients.length > 0) {
        params.set('ingredients', JSON.stringify(product.ingredients));
      }
    }

    navigate(`/ask/analyze?${params.toString()}`);
  };

  const handleApplyPreset = (preset: typeof PRESET_QUESTIONS[0]) => {
    setQuestion(preset.question);
    setJurisdiction(preset.jurisdiction);
    setGuidanceType(preset.guidance);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* Quick Example Presets */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#dfbe7b] mb-3">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Quick Inquiries from Industry Innovators</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESET_QUESTIONS.map((p) => (
            <button
              key={p.title}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className="text-left p-3 rounded-xl bg-[#0a1b14]/85 backdrop-blur-sm border border-[#c8a45d]/25 hover:border-[#dfbe7b] text-xs transition-all hover:bg-[#122b20]/90 group cursor-pointer shadow-md"
            >
              <div className="font-semibold text-[#f5f1e7] group-hover:text-[#dfbe7b] mb-1">
                {p.title}
              </div>
              <div className="text-[#d6ccb6]/80 line-clamp-2">
                {p.question}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Question Input Field */}
      <div className="bg-[#0a1b14]/85 backdrop-blur-md border border-[#c8a45d]/35 rounded-2xl p-5 sm:p-6 shadow-2xl relative focus-within:border-[#dfbe7b] transition-all">
        <label htmlFor="question-input" className="block text-sm font-semibold text-[#dfbe7b] mb-2 font-mono uppercase tracking-wider">
          Query Specification
        </label>
        <textarea
          id="question-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={4}
          placeholder="Example: I have developed an Ayurvedic herbal formulation. Can I patent it in India?"
          className="w-full bg-[#06120d]/85 border border-[#1c3e32] focus:border-[#dfbe7b] rounded-xl p-4 text-base text-[#f5f1e7] placeholder-[#d6ccb6]/40 focus:outline-none focus:ring-1 focus:ring-[#dfbe7b]/50 transition-all font-sans resize-y leading-relaxed"
          required
        />
        <div className="mt-2 flex items-center justify-between text-xs text-[#d6ccb6]/70 font-mono">
          <span>Be specific regarding herb names, combination claims, and clinical intention.</span>
          <span>{question.length} chars</span>
        </div>

        {validationError && (
          <div className="mt-3 p-3 rounded-lg bg-red-950/60 border border-red-500/50 text-xs text-red-200">
            {validationError}
          </div>
        )}
      </div>

      {/* Controls: Jurisdiction, Guidance, Language */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Jurisdiction Control */}
        <div className="bg-[#0a1b14]/85 backdrop-blur-md border border-[#c8a45d]/25 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#dfbe7b] mb-3">
            <Globe2 className="w-4 h-4 text-[#dfbe7b]" />
            <span>Target Jurisdiction</span>
          </div>
          <div className="space-y-2">
            {JURISDICTIONS.map((j) => (
              <label
                key={j.code}
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all text-xs sm:text-sm ${
                  jurisdiction === j.code
                    ? 'bg-[#142e25] border-[#dfbe7b] text-[#f5f1e7] shadow-sm'
                    : 'bg-[#08130f]/60 border-[#1c3e32] text-[#d6ccb6] hover:border-[#c8a45d]/40'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <input
                    type="radio"
                    name="jurisdiction"
                    value={j.code}
                    checked={jurisdiction === j.code}
                    onChange={() => setJurisdiction(j.code)}
                    className="accent-[#dfbe7b] w-4 h-4"
                  />
                  <span className="text-base">{j.flag}</span>
                  <span className="font-semibold">{j.label}</span>
                </div>
                <span className="text-[11px] font-mono text-[#c8a45d]/80">{j.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 2. Guidance Type Control */}
        <div className="bg-[#0a1b14]/85 backdrop-blur-md border border-[#c8a45d]/25 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#dfbe7b] mb-3">
            <FileCheck className="w-4 h-4 text-[#dfbe7b]" />
            <span>Guidance Domain</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {GUIDANCE_TYPES.map((g) => (
              <button
                key={g.type}
                type="button"
                onClick={() => setGuidanceType(g.type)}
                className={`text-left p-2.5 rounded-xl border transition-all text-xs cursor-pointer ${
                  guidanceType === g.type
                    ? 'bg-[#142e25] border-[#dfbe7b] text-[#f5f1e7] shadow-sm'
                    : 'bg-[#08130f]/60 border-[#1c3e32] text-[#d6ccb6] hover:border-[#c8a45d]/40'
                }`}
              >
                <div className="font-semibold text-xs text-[#f5f1e7]">{g.label}</div>
                <div className="text-[10px] text-[#c8a45d]/70 font-mono truncate">{g.short}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Language Control */}
        <div className="bg-[#0a1b14]/85 backdrop-blur-md border border-[#c8a45d]/25 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#dfbe7b] mb-3">
              <Languages className="w-4 h-4 text-[#dfbe7b]" />
              <span>Synthesis Language</span>
            </div>
            <div className="space-y-2">
              {LANGUAGES.map((l) => (
                <label
                  key={l.code}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    language === l.code
                      ? 'bg-[#142e25] border-[#dfbe7b] text-[#f5f1e7]'
                      : 'bg-[#08130f]/60 border-[#1c3e32] text-[#d6ccb6] hover:border-[#c8a45d]/40'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="language"
                      value={l.code}
                      checked={language === l.code}
                      onChange={() => setLanguage(l.code)}
                      className="accent-[#dfbe7b] w-4 h-4"
                    />
                    <span className="font-semibold text-sm">{l.label}</span>
                  </div>
                  <span className="text-xs font-mono text-[#c8a45d]">{l.native}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[#06120d]/80 border border-[#1c3e32] text-xs text-[#d6ccb6]/80 font-mono">
            <span className="text-[#2dd4bf] font-semibold">Active Profile:</span> {jurisdiction} • {guidanceType} • {language.toUpperCase()}
          </div>
        </div>

      </div>

      {/* Optional Product Specification Drawer */}
      <div className="border border-[#c8a45d]/25 rounded-2xl bg-[#0a1b14]/85 backdrop-blur-md shadow-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowProductDetails(!showProductDetails)}
          className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-sm font-semibold text-[#eae3d2] hover:bg-[#0f221b] transition-colors"
        >
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#142e25] text-[#dfbe7b] border border-[#c8a45d]/30">
              OPTIONAL
            </span>
            <span>Specify Formulation & Botanical Ingredients</span>
          </div>
          {showProductDetails ? <ChevronUp className="w-5 h-5 text-[#c8a45d]" /> : <ChevronDown className="w-5 h-5 text-[#c8a45d]" />}
        </button>

        {showProductDetails && (
          <div className="p-5 sm:p-6 border-t border-[#1c3e32] space-y-4 bg-[#06120d]/90">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#dfbe7b] mb-1">
                  Product / Formulation Name
                </label>
                <input
                  type="text"
                  value={product.name}
                  onChange={(e) => setProduct({ ...product, name: e.target.value })}
                  placeholder="e.g. Synergistic Arthritic Relief Compound"
                  className="w-full bg-[#0b1813] border border-[#1c3e32] rounded-xl px-3 py-2 text-sm text-[#f5f1e7] focus:outline-none focus:border-[#dfbe7b]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#dfbe7b] mb-1">
                  Intended Delivery Format
                </label>
                <input
                  type="text"
                  value={product.dosageForm || 'Hydro-alcoholic standardized extract in capsule'}
                  onChange={(e) => setProduct({ ...product, dosageForm: e.target.value })}
                  placeholder="e.g. Polyherbal decoction, Kwatha, Vati, Gel"
                  className="w-full bg-[#0b1813] border border-[#1c3e32] rounded-xl px-3 py-2 text-sm text-[#f5f1e7] focus:outline-none focus:border-[#dfbe7b]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#dfbe7b] mb-1">
                Formulation Botanical Components (Sanskrit & Binomial Latin)
              </label>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  placeholder="e.g. Zingiber officinale (Shunthi / Ginger)"
                  className="flex-1 bg-[#0b1813] border border-[#1c3e32] rounded-xl px-3 py-2 text-sm text-[#f5f1e7] focus:outline-none focus:border-[#dfbe7b]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddIngredient();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="px-4 py-2 bg-[#142e25] hover:bg-[#1c3e32] text-[#dfbe7b] border border-[#c8a45d]/40 rounded-xl text-sm font-semibold flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.ingredients.map((ing, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-[#0f221b] border border-[#c8a45d]/30 text-xs text-[#eae3d2]"
                  >
                    <span>{ing}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(index)}
                      className="text-[#c8a45d] hover:text-red-400 ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Submit Action CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#1c3e32]">
        <div className="text-xs text-[#d6ccb6]/70 font-mono">
          Route: Submits request payload to <code className="text-[#dfbe7b]">/ask/analyze</code>
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-3 px-9 py-4 rounded-xl text-base font-semibold bg-gradient-to-r from-[#c8a45d] to-[#dfbe7b] text-[#08130f] hover:brightness-105 shadow-[0_4px_24px_rgba(200,164,93,0.35)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-[#08130f]" />
          <span>Analyze with IP-SAKTI →</span>
        </button>
      </div>

    </form>
  );
};

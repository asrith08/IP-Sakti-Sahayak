import React from 'react';
import { Link } from '../../lib/router';
import { Sparkles, ArrowRight, BookOpen, CheckCircle2, Globe, ShieldCheck, Scale } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-[#08130f] border-b border-[#c8a45d]/20">
      
      {/* Visual Background Layer: EXACT Asset Preserved /images/ayurveda-hero/ayurveda-hero.png
          Positioned so the Ayurvedic practitioner is prominently framed on the RIGHT / CENTER-RIGHT */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <img
          src="/images/ayurveda-hero/ayurveda-hero.png"
          alt="Ayurvedic practitioner studying traditional medicinal herbs and classical scriptures"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-[72%_30%] sm:object-[76%_32%] md:object-[80%_35%] lg:object-[83%_36%] xl:object-[85%_35%] transition-all duration-1000 ease-out"
        />

        {/* Directional Cinematic Gradient Scrim:
            Deep, opaque forest obsidian on the LEFT (42-48% width text zone) ensuring pristine WCAG AAA legibility,
            fading naturally into transparent on the RIGHT / CENTER-RIGHT so the practitioner is luminously visible */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#08130f] via-[#08130f]/95 via-30% md:via-42% lg:via-[#08130f]/75 lg:via-48% to-transparent" />
        
        {/* Soft edge gradients for seamless transition with navbar and next section */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#08130f] via-[#08130f]/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#08130f] via-[#08130f]/80 to-transparent" />

        {/* Subtle warm amber/forest ambient aura behind the practitioner & herbal laboratory */}
        <div className="absolute top-1/3 right-[15%] w-80 h-80 bg-[#c8a45d]/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Foreground Content Container:
          Shifted to the LEFT (42%–48% container width, 6–9vw left padding)
          Right and center-right are reserved for the Ayurvedic practitioner */}
      <div className="relative z-10 w-full py-16 sm:py-20 lg:py-24 pl-5 sm:pl-8 md:pl-12 lg:pl-[7.5vw] xl:pl-[8.5vw] pr-5 sm:pr-8 lg:pr-12">
        <div className="w-full max-w-xl lg:max-w-[46rem] text-left">
          
          {/* Eyebrow badge */}
          <div className="hero-fade-delayed-1 inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#0f221b]/90 text-[#dfbe7b] border border-[#c8a45d]/35 backdrop-blur-md mb-6 sm:mb-8 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-[#dfbe7b] shrink-0" />
            <span className="tracking-wide">Multilingual Statutory &amp; IP Intelligence</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] animate-pulse shrink-0" />
          </div>

          {/* Primary Headline with Natural Breeze & Leaf Motion:
              Line-by-line entrance with micro-rotation & drift, transitioning into continuous organic breeze sway */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-[4.25rem] font-bold tracking-tight text-[#f5f1e7] font-serif-heading leading-[1.14]">
            <span className="hero-text-line-1 block">
              Navigate Ayurveda
            </span>
            <span className="hero-text-line-2 block text-transparent bg-clip-text bg-gradient-to-r from-[#dfbe7b] via-[#c8a45d] to-[#dfbe7b]">
              IP &amp; Regulation
            </span>
            <span className="hero-text-line-3 block text-[#f5f1e7]">
              with Evidence.
            </span>
          </h1>

          {/* Supporting Message: Left-aligned, high readability */}
          <p className="hero-fade-delayed-2 mt-6 sm:mt-7 text-base sm:text-lg text-[#d6ccb6] font-sans font-light leading-relaxed max-w-xl">
            The specialized decision-intelligence assistant for Ayurvedic researchers, innovators, and manufacturers. 
            Grounded in official gazettes, TKDL prior art, and statutory frameworks across India, US, and international jurisdictions.
          </p>

          {/* Value Pillars Pill Row */}
          <div className="hero-fade-delayed-3 mt-7 sm:mt-8 flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-[#eae3d2]">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#0f221b]/90 border border-[#c8a45d]/25 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#14b8a6] shrink-0" />
              <span>Source-Backed Guidance</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#0f221b]/90 border border-[#c8a45d]/25 shadow-sm">
              <Scale className="w-3.5 h-3.5 text-[#dfbe7b] shrink-0" />
              <span>Patents Act § 3(p) Defense</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#0f221b]/90 border border-[#c8a45d]/25 shadow-sm">
              <span className="font-bold text-[#2dd4bf]">EN • हि • తె</span>
              <span>Multilingual Statutory</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#0f221b]/90 border border-[#c8a45d]/25 shadow-sm">
              <BookOpen className="w-3.5 h-3.5 text-[#c8a45d] shrink-0" />
              <span>TKDL Cross-Verification</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="hero-fade-delayed-4 mt-9 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
            <Link
              href="/ask"
              className="inline-flex items-center justify-center space-x-3 px-8 py-4 rounded-xl text-base font-semibold bg-gradient-to-r from-[#c8a45d] to-[#dfbe7b] text-[#08130f] hover:brightness-105 shadow-[0_4px_24px_rgba(200,164,93,0.35)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center"
            >
              <Sparkles className="w-5 h-5 text-[#08130f] shrink-0" />
              <span>Ask IP-SAKTI Sahayak</span>
              <ArrowRight className="w-5 h-5 text-[#08130f] shrink-0" />
            </Link>

            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center space-x-2 px-7 py-4 rounded-xl text-base font-medium text-[#eae3d2] bg-[#0f221b]/90 hover:bg-[#142e25] border border-[#c8a45d]/30 transition-all hover:border-[#c8a45d]/60 text-center"
            >
              <span>Explore How It Works</span>
            </a>
          </div>

          {/* Regulatory Trust Metrics Strip */}
          <div className="hero-fade-delayed-4 mt-12 sm:mt-14 pt-6 sm:pt-7 border-t border-[#1c3e32]/80 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-xl">
            <div className="space-y-0.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#f5f1e7] font-mono">34M+</div>
              <div className="text-xs text-[#c8a45d]">TKDL Prior Art</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#f5f1e7] font-mono">§ 3(p) &amp; 3(e)</div>
              <div className="text-xs text-[#c8a45d]">Defense Matrix</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#f5f1e7] font-mono">Form III</div>
              <div className="text-xs text-[#c8a45d]">NBA Gateways</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#14b8a6] font-mono">100%</div>
              <div className="text-xs text-[#c8a45d]">Statutory Sources</div>
            </div>
          </div>

        </div>
      </div>

      {/* Heritage Accreditation Tag for the Ayurvedic Practitioner (Right/Center-Right) */}
      <div className="hidden lg:flex absolute bottom-8 right-[4vw] xl:right-[6vw] z-10 items-center space-x-2.5 px-4 py-2 rounded-full bg-[#08130f]/75 border border-[#c8a45d]/30 backdrop-blur-md text-xs text-[#eae3d2] shadow-xl pointer-events-none">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#dfbe7b] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#dfbe7b]" />
        </span>
        <span className="font-serif-heading font-medium text-[#dfbe7b]">Vaidya Heritage &amp; Traditional Knowledge</span>
        <span className="text-[#c8a45d]/40">•</span>
        <span className="text-[#d6ccb6]/80 text-[11px]">Direct Scripture Traceability</span>
      </div>

    </section>
  );
};


import React from 'react';
import { HeroSection } from '../components/landing/HeroSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { CapabilitiesSection } from '../components/landing/CapabilitiesSection';
import { TrustSourcesSection } from '../components/landing/TrustSourcesSection';
import { FinalCtaSection } from '../components/landing/FinalCtaSection';

export const LandingView: React.FC = () => {
  return (
    <div id="product" className="w-full">
      <HeroSection />
      <HowItWorksSection />
      <CapabilitiesSection />
      <TrustSourcesSection />
      <FinalCtaSection />
    </div>
  );
};

import React from 'react';
import { RouterProvider, useRouter, parseRouteParams } from './lib/router';
import { Navbar } from './components/ui/Navbar';
import { Footer } from './components/ui/Footer';
import { LandingView } from './views/LandingView';
import { AskView } from './views/AskView';
import { AnalyzeView } from './views/AnalyzeView';
import { ResultsView } from './views/ResultsView';
import { ChecklistView } from './views/ChecklistView';

const AppContent: React.FC = () => {
  const { pathname } = useRouter();
  const { matchedRoute } = parseRouteParams(pathname);

  const renderCurrentView = () => {
    switch (matchedRoute) {
      case '/ask/analyze':
        return <AnalyzeView />;
      case '/ask':
        return <AskView />;
      case '/results/[id]/checklist':
        return <ChecklistView />;
      case '/results/[id]':
        return <ResultsView />;
      case '/':
      default:
        return <LandingView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#08130f] text-[#f5f1e7] selection:bg-[#c8a45d]/30 selection:text-[#faebd7]">
      <Navbar />
      <main className="flex-1 w-full">
        {renderCurrentView()}
      </main>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}

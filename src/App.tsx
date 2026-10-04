import React, { useEffect } from 'react';
import { RouterProvider, useRouter, parseRouteParams } from './lib/router';
import { AuthProvider, useAuth } from './lib/auth';
import { Navbar } from './components/ui/Navbar';
import { Footer } from './components/ui/Footer';
import { LoginView } from './views/LoginView';
import { LandingView } from './views/LandingView';
import { AskView } from './views/AskView';
import { AnalyzeView } from './views/AnalyzeView';
import { ResultsView } from './views/ResultsView';
import { ChecklistView } from './views/ChecklistView';
import { ProfileView } from './views/ProfileView';

const ProtectedLoading: React.FC = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-[#f5f1e7] text-base">Loading...</div>
  </div>
);

const AppContent: React.FC = () => {
  const { pathname, navigate } = useRouter();
  const { matchedRoute } = parseRouteParams(pathname);
  const { user, loading: authLoading } = useAuth();

  const protectedRoutes = new Set<string>([
    '/ask',
    '/ask/analyze',
    '/results/[id]',
    '/results/[id]/checklist',
    '/profile',
  ]);

  useEffect(() => {
    if (!authLoading && !user && protectedRoutes.has(matchedRoute)) {
      navigate('/login');
    }
  }, [authLoading, user, matchedRoute, navigate]);

  if (!authLoading && !user && protectedRoutes.has(matchedRoute)) {
    // Unauthenticated user accessing a protected route; redirect handled in effect.
    // Show minimal loading while redirect occurs.
    return <ProtectedLoading />;
  }

  if (authLoading && protectedRoutes.has(matchedRoute)) {
    return <ProtectedLoading />;
  }

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
      case '/profile':
        return <ProfileView />;
      case '/login':
        return <LoginView />;
      case '/':
        return <LandingView />;
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
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </RouterProvider>
  );
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface RouteParams {
  id?: string;
  [key: string]: string | undefined;
}

interface RouterContextType {
  pathname: string;
  search: string;
  searchParams: URLSearchParams;
  params: RouteParams;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextType>({
  pathname: '/',
  search: '',
  searchParams: new URLSearchParams(),
  params: {},
  navigate: () => {}
});

export function parseRouteParams(pathname: string): { matchedRoute: string; params: RouteParams } {
  // /results/:id/checklist
  const checklistMatch = pathname.match(/^\/results\/([^/]+)\/checklist\/?$/);
  if (checklistMatch) {
    return {
      matchedRoute: '/results/[id]/checklist',
      params: { id: decodeURIComponent(checklistMatch[1]) }
    };
  }

  // /results/:id
  const resultsMatch = pathname.match(/^\/results\/([^/]+)\/?$/);
  if (resultsMatch) {
    return {
      matchedRoute: '/results/[id]',
      params: { id: decodeURIComponent(resultsMatch[1]) }
    };
  }

  if (pathname === '/ask/analyze' || pathname.startsWith('/ask/analyze/')) {
    return { matchedRoute: '/ask/analyze', params: {} };
  }

  if (pathname === '/ask' || pathname.startsWith('/ask/')) {
    return { matchedRoute: '/ask', params: {} };
  }

  return { matchedRoute: '/', params: {} };
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [currentSearch, setCurrentSearch] = useState<string>(() => {
    return window.location.search || '';
  });

  const updateLocation = useCallback(() => {
    setCurrentPath(window.location.pathname || '/');
    setCurrentSearch(window.location.search || '');
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      updateLocation();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [updateLocation]);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState({}, '', to);
    } else {
      window.history.pushState({}, '', to);
    }
    updateLocation();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [updateLocation]);

  const { params } = parseRouteParams(currentPath);
  const searchParams = new URLSearchParams(currentSearch);

  return (
    <RouterContext.Provider
      value={{
        pathname: currentPath,
        search: currentSearch,
        searchParams,
        params,
        navigate
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

export function useRouter() {
  return useContext(RouterContext);
}

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  replace?: boolean;
}

export const Link: React.FC<LinkProps> = ({ href, children, replace, onClick, ...rest }) => {
  const { navigate } = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);

    // If external link or open in new tab
    if (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('mailto:') ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      rest.target === '_blank'
    ) {
      return;
    }

    e.preventDefault();
    navigate(href, { replace });
  };

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
};

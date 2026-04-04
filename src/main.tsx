import { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

import LandingPage from './components/LandingPage.tsx';
import PublicLegalDocumentPage from './components/legal/PublicLegalDocumentPage.tsx';
import RouteLoadingFallback from './components/RouteLoadingFallback.tsx';
import ErrorFallback from './ErrorFallback.tsx';
import { resolveLegalDocumentTypeFromPath } from './lib/legal.ts';

import './main.css';
import './styles/theme.css';
import './index.css';

const AuthenticatedRoot = lazy(() => import('./AuthenticatedRoot.tsx'));

function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}

const currentPath = normalizePathname(window.location.pathname);
const isPublicLanding = currentPath === '/';
const publicLegalDocumentType = resolveLegalDocumentTypeFromPath(currentPath);

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    {isPublicLanding ? (
      <LandingPage onNavigateToLogin={() => window.location.assign('/login')} />
    ) : publicLegalDocumentType ? (
      <PublicLegalDocumentPage documentType={publicLegalDocumentType} />
    ) : (
      <Suspense fallback={<RouteLoadingFallback />}>
        <AuthenticatedRoot />
      </Suspense>
    )}
  </ErrorBoundary>
);

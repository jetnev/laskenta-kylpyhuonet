import { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

import AuthCallbackPage from './components/AuthCallbackPage.tsx';
import LandingPage from './components/LandingPage.tsx';
import PublicMarketingPage from './components/public/PublicMarketingPage.tsx';
import PublicLegalDocumentPage from './components/legal/PublicLegalDocumentPage.tsx';
import RouteLoadingFallback from './components/RouteLoadingFallback.tsx';
import ErrorFallback from './ErrorFallback.tsx';
import { AUTH_CALLBACK_PATH } from './lib/auth-callback.ts';
import { resolveLegalDocumentTypeFromPath } from './lib/legal.ts';
import { resolvePublicMarketingPage } from './lib/public-site.ts';

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
const isPublicAuthCallback = currentPath === AUTH_CALLBACK_PATH;
const publicMarketingPage = resolvePublicMarketingPage(currentPath);
const publicLegalDocumentType = resolveLegalDocumentTypeFromPath(currentPath);

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    {isPublicLanding ? (
      <LandingPage onNavigateToLogin={() => window.location.assign('/login')} />
    ) : isPublicAuthCallback ? (
      <AuthCallbackPage />
    ) : publicMarketingPage ? (
      <PublicMarketingPage page={publicMarketingPage} />
    ) : publicLegalDocumentType ? (
      <PublicLegalDocumentPage documentType={publicLegalDocumentType} />
    ) : (
      <Suspense fallback={<RouteLoadingFallback />}>
        <AuthenticatedRoot />
      </Suspense>
    )}
  </ErrorBoundary>
);

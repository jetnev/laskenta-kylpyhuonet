import { useEffect, useMemo } from 'react';
import { Button } from './components/ui/button';

type Props = {
  error: Error;
  resetErrorBoundary: () => void;
};

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk [\w-]+ failed/i,
  /dynamically imported module/i,
];

function isChunkLoadError(error: Error) {
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(error.message || ''));
}

export default function ErrorFallback({ error, resetErrorBoundary }: Props) {
  const chunkLoadError = useMemo(() => isChunkLoadError(error), [error]);

  useEffect(() => {
    if (!chunkLoadError || typeof window === 'undefined') {
      return;
    }

    const storageKey = 'laskenta:last-chunk-reload';
    const now = Date.now();

    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        const previous = JSON.parse(raw) as { path?: string; ts?: number };
        if (
          previous.path === window.location.pathname &&
          typeof previous.ts === 'number' &&
          now - previous.ts < 15000
        ) {
          return;
        }
      }
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({ path: window.location.pathname, ts: now })
      );
    } catch {
      // Ignore sessionStorage issues and continue with a manual reload button.
    }

    window.location.reload();
  }, [chunkLoadError]);

  const handleRetry = () => {
    if (chunkLoadError) {
      window.location.reload();
      return;
    }
    resetErrorBoundary();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          {chunkLoadError ? 'Sivusta on julkaistu uusi versio' : 'Jokin meni pieleen'}
        </h1>
        <p className="text-muted-foreground">
          {chunkLoadError
            ? 'Sivu tarvitsee päivityksen, jotta uusin sovellusversio latautuu oikein.'
            : error.message}
        </p>
        <Button onClick={handleRetry}>
          {chunkLoadError ? 'Päivitä sivu' : 'Yritä uudelleen'}
        </Button>
      </div>
    </div>
  );
}

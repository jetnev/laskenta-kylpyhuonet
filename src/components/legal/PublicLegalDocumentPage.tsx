import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import LegalDocumentArticle from './LegalDocumentArticle';
import LegalDocumentLinks from './LegalDocumentLinks';
import { applyDocumentMetadata } from '../../lib/document-metadata';
import { listPublicActiveLegalDocuments, getLegalDocumentTypeLabel } from '../../lib/legal';
import { APP_NAME, buildDocumentTitle, buildPublicLegalDescription } from '../../lib/site-brand';
import type { LegalDocumentType, LegalDocumentVersionRow } from '../../lib/supabase';

interface PublicLegalDocumentPageProps {
  documentType: LegalDocumentType;
}

export default function PublicLegalDocumentPage({ documentType }: PublicLegalDocumentPageProps) {
  const [documents, setDocuments] = useState<LegalDocumentVersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void listPublicActiveLegalDocuments()
      .then((nextDocuments) => {
        if (!active) {
          return;
        }

        setDocuments(nextDocuments);
        setError(null);
      })
      .catch((reason) => {
        if (!active) {
          return;
        }

        setError(reason instanceof Error ? reason.message : 'Dokumentin lataus epäonnistui.');
        setDocuments([]);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const currentDocument = useMemo(
    () => documents.find((document) => document.document_type === documentType) ?? null,
    [documentType, documents]
  );

  const pageTitle = getLegalDocumentTypeLabel(documentType);

  useEffect(() => {
    applyDocumentMetadata({
      title: buildDocumentTitle(pageTitle),
      description: buildPublicLegalDescription(pageTitle),
      pathname: window.location.pathname,
      siteUrl: import.meta.env.VITE_SITE_URL?.trim(),
      ogType: 'article',
    });
  }, [pageTitle]);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_42%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.05),transparent_30%)] pointer-events-none" />

      <header className="relative z-10 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold tracking-tight text-slate-950">{APP_NAME}</div>
            <p className="mt-1 text-sm text-slate-500">Voimassa olevat juridiset dokumentit ovat luettavissa ilman kirjautumista.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" type="button" onClick={() => window.location.assign('/')}>
              <ArrowLeft className="h-4 w-4" />
              Takaisin etusivulle
            </Button>
            <Button type="button" onClick={() => window.location.assign('/login')}>
              Kirjaudu sisään
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="mb-8 space-y-4">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Julkinen dokumenttinäkymä</div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">{pageTitle}</h1>
              <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
                Tämä sivu näyttää tällä hetkellä voimassa olevan version. Dokumentin versio, voimaantuloaika ja sisältötunniste näkyvät samassa näkymässä auditoitavuutta varten.
              </p>
            </div>
            <LegalDocumentLinks className="text-sm" />
          </div>
        </div>

        {loading && (
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-sm text-slate-600 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.4)]">
            Ladataan dokumenttia...
          </div>
        )}

        {!loading && error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && !currentDocument && (
          <Alert>
            <AlertDescription>Tälle dokumentille ei löytynyt julkaistua versiota.</AlertDescription>
          </Alert>
        )}

        {!loading && !error && currentDocument && (
          <LegalDocumentArticle document={currentDocument} eyebrow="Julkinen dokumentti" />
        )}
      </main>
    </div>
  );
}

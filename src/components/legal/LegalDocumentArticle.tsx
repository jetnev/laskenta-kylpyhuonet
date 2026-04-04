import { useMemo, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  formatLegalHash,
  getLegalDocumentStatusLabel,
  getLegalDocumentTypeLabel,
  renderLegalDocumentHtml,
} from '../../lib/legal';
import type { LegalDocumentVersionRow } from '../../lib/supabase';

interface LegalDocumentArticleProps {
  document: LegalDocumentVersionRow;
  eyebrow?: string;
  showPrintActions?: boolean;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('fi-FI');
}

export default function LegalDocumentArticle({
  document,
  eyebrow,
  showPrintActions = true,
}: LegalDocumentArticleProps) {
  const [copied, setCopied] = useState(false);
  const renderedHtml = useMemo(() => renderLegalDocumentHtml(document.content_md), [document.content_md]);

  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(document.content_hash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_70px_-46px_rgba(15,23,42,0.4)] print:shadow-none">
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {eyebrow || getLegalDocumentTypeLabel(document.document_type)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">
                {document.title}
              </h1>
              {document.change_summary && (
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{document.change_summary}</p>
              )}
            </div>
          </div>

          <div className="legal-print-actions flex flex-wrap gap-2">
            <Badge variant="secondary">Versio {document.version_label}</Badge>
            <Badge variant={document.status === 'active' ? 'default' : 'outline'}>
              {getLegalDocumentStatusLabel(document.status)}
            </Badge>
            {showPrintActions && (
              <>
                <Button type="button" variant="outline" onClick={() => void handleCopyHash()}>
                  {copied ? 'Hash kopioitu' : 'Kopioi hash'}
                </Button>
                <Button type="button" variant="outline" onClick={() => window.print()}>
                  Tulosta
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Voimassa alkaen</div>
            <div className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(document.effective_at)}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Julkaistu</div>
            <div className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(document.published_at)}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Sisältötunniste (SHA-256)</div>
            <div className="mt-1 break-all font-mono text-xs text-slate-900">{formatLegalHash(document.content_hash)}</div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 sm:px-8 sm:py-10">
        <div className="legal-document-body" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
      </div>
    </article>
  );
}

import { useMemo, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  extractLegalToc,
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

function formatDate(value?: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('fi-FI', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function LegalDocumentArticle({
  document,
  eyebrow,
  showPrintActions = true,
}: LegalDocumentArticleProps) {
  const [copied, setCopied] = useState(false);
  const renderedHtml = useMemo(() => renderLegalDocumentHtml(document.content_md), [document.content_md]);
  const toc = useMemo(() => extractLegalToc(document.content_md), [document.content_md]);

  const showToc = toc.length >= 3;

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
    <article className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_28px_70px_-46px_rgba(15,23,42,0.4)] print:rounded-none print:border-0 print:shadow-none">

      {/* ── DOCUMENT HEADER ── */}
      <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-6 pt-7 pb-6 sm:px-10 sm:pt-9 sm:pb-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

          {/* Title block */}
          <div className="space-y-2 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {eyebrow || getLegalDocumentTypeLabel(document.document_type)}
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-[2rem] leading-tight">
              {document.title}
            </h1>
            {document.change_summary && (
              <p className="pt-1 text-sm leading-7 text-slate-500">{document.change_summary}</p>
            )}
          </div>

          {/* Badges + print actions */}
          <div className="flex flex-col gap-2 shrink-0 sm:items-end sm:pt-1">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">v {document.version_label}</Badge>
              <Badge variant={document.status === 'active' ? 'default' : 'outline'}>
                {getLegalDocumentStatusLabel(document.status)}
              </Badge>
            </div>
            {showPrintActions && (
              <div className="legal-print-actions flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void handleCopyHash()}>
                  {copied ? 'Hash kopioitu ✓' : 'Kopioi hash'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
                  Tulosta / PDF
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Metadata row — compact, no boxes */}
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-100 pt-5">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Voimassa alkaen</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-800">{formatDate(document.effective_at)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Julkaistu</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-800">{formatDate(document.published_at)}</dd>
          </div>
          <div className="sm:ml-auto print:hidden">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Sisältötunniste (SHA-256)</dt>
            <dd className="mt-0.5 break-all font-mono text-xs text-slate-500">{formatLegalHash(document.content_hash)}</dd>
          </div>
        </dl>
      </div>

      {/* ── BODY ── */}
      <div className="px-6 py-8 sm:px-10 sm:py-10">

        {/* Table of contents */}
        {showToc && (
          <nav
            aria-label="Sisällysluettelo"
            className="mb-10 rounded-[18px] border border-slate-200/70 bg-slate-50/60 px-5 py-5 print:hidden"
          >
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Sisällysluettelo</p>
            <ol className="space-y-1.5">
              {toc.map((entry) => (
                <li
                  key={entry.id}
                  style={{ paddingLeft: `${(entry.depth - 1) * 1.25}rem` }}
                >
                  <a
                    href={`#${entry.id}`}
                    className="text-sm text-slate-600 hover:text-slate-950 underline-offset-2 hover:underline transition-colors"
                  >
                    {entry.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Document text */}
        <div
          className="legal-document-body"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      </div>
    </article>
  );
}

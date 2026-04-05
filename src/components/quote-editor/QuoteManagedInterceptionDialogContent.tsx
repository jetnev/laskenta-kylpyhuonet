import { ArrowSquareOut, WarningCircle, XCircle } from '@phosphor-icons/react';

import type { TenderIntelligenceQuoteEditorHandoffLink } from '../../features/tender-intelligence/lib/tender-intelligence-handoff';
import type { QuoteTenderManagedEditorStateStatus } from '../../features/tender-intelligence/lib/quote-managed-surface-inspector';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export interface QuoteManagedInterceptionDialogRequest {
  kind: 'edit' | 'action';
  status: QuoteTenderManagedEditorStateStatus;
  title: string;
  description: string;
  issueMessages?: string[];
  confirmLabel?: string;
  closeLabel?: string;
  tenderIntelligenceLink?: TenderIntelligenceQuoteEditorHandoffLink | null;
}

interface QuoteManagedInterceptionDialogContentProps {
  request: QuoteManagedInterceptionDialogRequest;
  onClose: () => void;
  onConfirm: () => void;
}

function resolveStatusMeta(status: QuoteTenderManagedEditorStateStatus) {
  switch (status) {
    case 'clean':
      return {
        badgeLabel: 'Vahvistus tarvitaan',
        badgeVariant: 'outline' as const,
        icon: WarningCircle,
        iconClassName: 'text-slate-700',
        panelClassName: 'border-slate-200 bg-slate-50/80 text-slate-900',
      };
    case 'warning':
      return {
        badgeLabel: 'Varoitus',
        badgeVariant: 'outline' as const,
        icon: WarningCircle,
        iconClassName: 'text-amber-700',
        panelClassName: 'border-amber-200 bg-amber-50/80 text-amber-950',
      };
    case 'danger':
      return {
        badgeLabel: 'Estetty',
        badgeVariant: 'destructive' as const,
        icon: XCircle,
        iconClassName: 'text-red-700',
        panelClassName: 'border-red-200 bg-red-50/80 text-red-950',
      };
    default:
      return {
        badgeLabel: status,
        badgeVariant: 'outline' as const,
        icon: WarningCircle,
        iconClassName: 'text-slate-700',
        panelClassName: 'border-slate-200 bg-slate-50/80 text-slate-900',
      };
  }
}

export default function QuoteManagedInterceptionDialogContent({
  request,
  onClose,
  onConfirm,
}: QuoteManagedInterceptionDialogContentProps) {
  const statusMeta = resolveStatusMeta(request.status);
  const StatusIcon = statusMeta.icon;
  const visibleIssueMessages = request.issueMessages?.slice(0, 3) ?? [];

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Tarjousäly {request.kind === 'edit' ? 'edit guard' : 'action guard'}</Badge>
          <Badge variant={statusMeta.badgeVariant}>{statusMeta.badgeLabel}</Badge>
        </div>
        <div className="flex items-start gap-2 text-left text-lg font-semibold leading-7 tracking-[-0.02em] text-slate-950">
          <StatusIcon className={cn('mt-0.5 h-5 w-5 flex-none', statusMeta.iconClassName)} />
          <span>{request.title}</span>
        </div>
      </div>

      <div className="space-y-4 text-sm">
        <div className={cn('rounded-2xl border px-4 py-4 leading-6', statusMeta.panelClassName)}>
          {request.description}
        </div>

        {visibleIssueMessages.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-slate-700">
            <div className="font-medium text-slate-950">
              {request.status === 'danger'
                ? 'Tarkista nämä ennen kuin palaat Tarjousälyyn:'
                : 'Nämä havainnot liittyvät tähän hallittuun sisältöön:'}
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 leading-6">
              {visibleIssueMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose}>{request.closeLabel ?? 'Peru'}</Button>
        {request.status === 'danger' ? (
          request.tenderIntelligenceLink ? (
            <Button asChild>
              <a href={request.tenderIntelligenceLink.url}>
                <ArrowSquareOut className="h-4 w-4" />
                {request.tenderIntelligenceLink.label}
              </a>
            </Button>
          ) : null
        ) : (
          <Button onClick={onConfirm}>{request.confirmLabel ?? 'Jatka tästä huolimatta'}</Button>
        )}
      </div>
    </>
  );
}
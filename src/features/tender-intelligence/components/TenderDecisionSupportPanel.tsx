import { CheckCircle, ClockCountdown, WarningCircle, WarningOctagon } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import type { TenderDecisionSupportSignalStatus, TenderDecisionSupportSummary } from '../lib/tender-decision-support';
import { TENDER_GO_NO_GO_META, formatTenderConfidence, formatTenderTimestamp, type TenderBadgeVariant } from '../lib/tender-intelligence-ui';

interface TenderDecisionSupportPanelProps {
  decisionSupport: TenderDecisionSupportSummary;
}

const SIGNAL_STATUS_META: Record<
  TenderDecisionSupportSignalStatus,
  { label: string; variant: TenderBadgeVariant; cardClassName: string }
> = {
  positive: {
    label: 'Kunnossa',
    variant: 'default',
    cardClassName: 'border-emerald-200 bg-emerald-50/70',
  },
  warning: {
    label: 'Vaatii toimia',
    variant: 'outline',
    cardClassName: 'border-amber-200 bg-amber-50/70',
  },
  critical: {
    label: 'Blokkeri',
    variant: 'destructive',
    cardClassName: 'border-red-200 bg-red-50/70',
  },
  neutral: {
    label: 'Ei vielä dataa',
    variant: 'secondary',
    cardClassName: 'border-slate-200 bg-slate-50/70',
  },
};

function renderStatusIcon(status: TenderDecisionSupportSignalStatus) {
  switch (status) {
    case 'positive':
      return <CheckCircle className="h-4 w-4 text-emerald-700" />;
    case 'warning':
      return <WarningCircle className="h-4 w-4 text-amber-700" />;
    case 'critical':
      return <WarningOctagon className="h-4 w-4 text-red-700" />;
    default:
      return <ClockCountdown className="h-4 w-4 text-slate-500" />;
  }
}

export default function TenderDecisionSupportPanel({ decisionSupport }: TenderDecisionSupportPanelProps) {
  const storedMeta = TENDER_GO_NO_GO_META[decisionSupport.storedRecommendation];
  const operationalMeta = TENDER_GO_NO_GO_META[decisionSupport.operationalRecommendation];

  return (
    <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <WarningCircle className="h-5 w-5 text-slate-500" />
              Päätöstuki
            </CardTitle>
            <CardDescription>
              Tallennettu baseline-suositus ja nykyisestä workflow-tilasta johdettu operatiivinen tila näytetään erikseen. Näin näet heti,
              onko ongelma analyysipohjassa, puutteissa, riskeissä vai keskeneräisessä katselmoinnissa.
            </CardDescription>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Blokkerit</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{decisionSupport.criticalCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Varoitukset</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{decisionSupport.warningCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tarkistamatta</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{decisionSupport.workflowSummary.unreviewed}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Avoimet tehtävät</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{decisionSupport.stats.openReviewTaskCount}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tallennettu baseline</p>
              <Badge variant={storedMeta.variant}>{storedMeta.label}</Badge>
              {decisionSupport.storedConfidence != null && (
                <Badge variant="outline">Luottamus {formatTenderConfidence(decisionSupport.storedConfidence)}</Badge>
              )}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {decisionSupport.storedSummary ?? 'Tallennettua baseline-suositusta ei ole vielä päivitetty päätöskäyttöön.'}
            </p>
            {decisionSupport.storedUpdatedAt && (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">Päivitetty {formatTenderTimestamp(decisionSupport.storedUpdatedAt)}</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-900 bg-slate-950 px-5 py-5 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">Operatiivinen tila</p>
              <Badge variant={operationalMeta.variant}>{operationalMeta.label}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-100">{decisionSupport.operationalSummary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="border border-white/15 bg-white/10 text-white hover:bg-white/10">{decisionSupport.stats.totalResults} tulosriviä</Badge>
              <Badge className="border border-white/15 bg-white/10 text-white hover:bg-white/10">{decisionSupport.positiveCount} kunnossa</Badge>
              <Badge className="border border-white/15 bg-white/10 text-white hover:bg-white/10">{decisionSupport.neutralCount} odottaa dataa</Badge>
            </div>
          </div>
        </div>

        {decisionSupport.blockingReasons.length > 0 ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
            <div className="flex items-center gap-2 text-red-700">
              <WarningOctagon className="h-4 w-4" />
              <p className="text-sm font-medium">Nykyiset blokkerit</p>
            </div>
            <div className="mt-3 space-y-2 text-sm leading-6 text-red-700">
              {decisionSupport.blockingReasons.map((reason) => (
                <p key={reason}>• {reason}</p>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-700">
            Nykyisessä näkymässä ei ole tunnistettu erillisiä kriittisiä blokkeririvejä. Päätöstä voidaan jatkaa workflow-signaalien puitteissa.
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center gap-2 text-slate-950">
            <CheckCircle className="h-4 w-4 text-slate-500" />
            <p className="text-sm font-medium">Suositellut seuraavat toimet</p>
          </div>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {decisionSupport.nextActions.map((action, index) => (
              <p key={action}>
                {index + 1}. {action}
              </p>
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {decisionSupport.signals.map((signal) => {
            const statusMeta = SIGNAL_STATUS_META[signal.status];

            return (
              <div key={signal.key} className={`rounded-2xl border px-4 py-4 ${statusMeta.cardClassName}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-950">
                      {renderStatusIcon(signal.status)}
                      <p className="text-sm font-medium">{signal.title}</p>
                    </div>
                    <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                  </div>
                  <Badge variant="outline">{signal.countLabel}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{signal.summary}</p>
                {signal.recommendedAction && (
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">Seuraava toimi: {signal.recommendedAction}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
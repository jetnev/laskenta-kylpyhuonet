import { CheckCircle, ClockCountdown, PlayCircle, SpinnerGap, WarningCircle } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { getLatestSuccessfulTenderAnalysisJob, getTenderAnalysisStartState, isTenderAnalysisJobActive } from '../lib/tender-analysis';
import {
  TENDER_ANALYSIS_JOB_STATUS_META,
  TENDER_ANALYSIS_JOB_TYPE_META,
  formatTenderTimestamp,
} from '../lib/tender-intelligence-ui';
import type { TenderPackageDetails } from '../types/tender-intelligence';

interface TenderAnalysisPanelProps {
  selectedPackage: TenderPackageDetails;
  loading?: boolean;
  starting?: boolean;
  onStartAnalysis: (packageId: string) => Promise<void>;
}

export default function TenderAnalysisPanel({
  selectedPackage,
  loading = false,
  starting = false,
  onStartAnalysis,
}: TenderAnalysisPanelProps) {
  const latestJob = selectedPackage.latestAnalysisJob;
  const latestSuccessfulJob = getLatestSuccessfulTenderAnalysisJob(selectedPackage.analysisJobs);
  const startState = getTenderAnalysisStartState({
    documentCount: selectedPackage.documents.length,
    latestAnalysisJob: latestJob,
  });
  const activeJob = latestJob ? isTenderAnalysisJobActive(latestJob.status) : false;
  const busy = starting || activeJob;
  const statusMeta = latestJob ? TENDER_ANALYSIS_JOB_STATUS_META[latestJob.status] : null;
  const typeMeta = latestJob
    ? TENDER_ANALYSIS_JOB_TYPE_META[latestJob.jobType]
    : TENDER_ANALYSIS_JOB_TYPE_META.placeholder_analysis;

  const handleStart = async () => {
    try {
      await onStartAnalysis(selectedPackage.package.id);
    } catch {
      // Parent hook surfaces the actionable error state in the workspace.
    }
  };

  return (
    <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-slate-500" />
              Analyysi
            </CardTitle>
            <CardDescription>
              Placeholder-ajon skeleton käyttää oikeaa analyysijobin domainia, kuljettaa jobin tilasta toiseen ja jättää selkeän adapterirajan myöhemmälle worker- tai edge-function -ajolle.
            </CardDescription>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:min-w-72">
            <Button type="button" className="justify-between" disabled={!startState.canStart || loading || busy} onClick={() => void handleStart()}>
              {busy ? 'Analysoidaan...' : 'Käynnistä analyysi'}
              {busy ? <SpinnerGap className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            </Button>
            <p className="text-xs leading-5 text-muted-foreground">
              {startState.canStart
                ? 'Tämä ajo ei vielä lue dokumenttien sisältöä. Se vain luo, jonottaa, suorittaa ja päättää placeholder-jobin näkyvästi.'
                : startState.reason}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 pt-6 xl:grid-cols-[minmax(0,1.25fr)_340px]">
        <div className="space-y-4">
          {!latestJob ? (
            <div className="rounded-2xl border border-dashed px-4 py-8 text-sm leading-6 text-muted-foreground">
              Analyysiä ei ole vielä käynnistetty tälle paketille. Lisää vähintään yksi dokumentti ja käynnistä sen jälkeen ensimmäinen placeholder-ajo tästä paneelista.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                {statusMeta && <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>}
                <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
              </div>

              <p className="mt-4 text-sm font-medium text-slate-950">{latestJob.stageLabel}</p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pyydetty</p>
                  <p className="mt-2 text-sm text-slate-900">{formatTenderTimestamp(latestJob.requestedAt)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Aloitettu</p>
                  <p className="mt-2 text-sm text-slate-900">{latestJob.startedAt ? formatTenderTimestamp(latestJob.startedAt) : 'Ei vielä aloitettu'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Päättynyt</p>
                  <p className="mt-2 text-sm text-slate-900">{latestJob.completedAt ? formatTenderTimestamp(latestJob.completedAt) : 'Kesken'}</p>
                </div>
              </div>

              {busy && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-700">
                  <SpinnerGap className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                  <span>Jobi etenee näkyvästi tilojen pending -&gt; queued -&gt; running -&gt; completed läpi, mutta varsinainen analyysimoottori korvataan myöhemmässä vaiheessa.</span>
                </div>
              )}

              {latestJob.errorMessage && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                  <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{latestJob.errorMessage}</span>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-dashed px-4 py-6 text-sm leading-6 text-muted-foreground">
            Varsinainen dokumenttien tekstinpurku, OCR, AI-providerit, vaatimusmalli, riskinosto ja tarjousluonnoksen generointi jätetään tarkoituksella myöhempiin vaiheisiin. Tämä vaihe rakentaa vain analyysijobin elinkaaren rungon ja näkyvän tilan.
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Dokumentit</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{selectedPackage.documents.length}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Analyysin käynnistys sallitaan vasta kun pakettiin on liitetty vähintään yksi dokumentti.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Jobit</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{selectedPackage.analysisJobs.length}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Kaikki ajot tallentuvat samaan Tarjousälyn job-historiaan, vaikka varsinainen worker puuttuu vielä.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-2 text-slate-950">
              <CheckCircle className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Viimeisin onnistunut ajo</p>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-950">
              {latestSuccessfulJob?.completedAt ? formatTenderTimestamp(latestSuccessfulJob.completedAt) : 'Ei vielä onnistunutta ajoa'}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {latestSuccessfulJob ? latestSuccessfulJob.stageLabel : 'Ensimmäinen onnistunut placeholder-ajo näkyy tässä ja toimii myöhemmän oikean analyysipalvelun vaihtopisteenä.'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-2 text-slate-950">
              <ClockCountdown className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Suoritusmalli</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Nykyinen placeholder-run suoritetaan kevyesti frontend-orchestrationina, mutta repository- ja adapteriraja pidetään samana, jotta toteutus voidaan vaihtaa myöhemmin oikeaan backend-worker-virtaan.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
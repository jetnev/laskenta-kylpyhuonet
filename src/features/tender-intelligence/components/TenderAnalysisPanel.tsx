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
  const analysisReadiness = selectedPackage.analysisReadiness;
  const coverage = analysisReadiness.coverage;
  const startState = getTenderAnalysisStartState({
    analysisReadiness,
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
              Analyysiajo käynnistyy server-side Edge Function -rajan kautta vasta kun vähintään yhdelle tuetulle dokumentille on tallennettu extracted chunk -dataa. Deterministinen sääntökerros löytää määräaika-, liite- ja referenssiosumia ilman LLM:ää ja muodostaa nyt myös ensimmäiset draft artefaktit suoraan evidence-sidotuista löydöksistä.
            </CardDescription>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:min-w-72">
            <Button type="button" className="justify-between" disabled={!startState.canStart || loading || busy} onClick={() => void handleStart()}>
              {busy ? 'Analysoidaan...' : 'Käynnistä analyysi'}
              {busy ? <SpinnerGap className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            </Button>
            <p className="text-xs leading-5 text-muted-foreground">
              {startState.canStart
                ? 'Analyysi käynnistetään palvelinpuolella. Sääntöpohjaiset löydökset ja deterministiset draft artefaktit kirjoitetaan pysyviin result-tauluihin ja niiden provenance tallennetaan extracted chunk -lähteisiin.'
                : startState.reason}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 pt-6 xl:grid-cols-[minmax(0,1.25fr)_340px]">
        <div className="space-y-4">
          {!latestJob ? (
            <div className="rounded-2xl border border-dashed px-4 py-8 text-sm leading-6 text-muted-foreground">
              Analyysiä ei ole vielä käynnistetty tälle paketille. Lisää vähintään yksi tuettu dokumentti, pura siitä extracted chunk -data ja käynnistä sen jälkeen ensimmäinen sääntöpohjainen baseline-ajo tästä paneelista.
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
                  <span>Analyysiajo etenee server-sidellä tilojen pending → queued → running → completed läpi. Palvelin tallentaa sääntöpohjaiset löydökset sekä ensimmäiset draft artefaktit result-domainiin ja liittää niihin evidence-rivit oikeista extracted chunkeista.</span>
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

          {startState.canStart ? (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Paketti on valmis baseline-analyysiin: vähintään yksi dokumentti on purettu ja evidence-riveille on olemassa oikea chunk-lähde.</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700">
              <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{startState.reason}</span>
            </div>
          )}

          <div className="rounded-2xl border border-dashed px-4 py-6 text-sm leading-6 text-muted-foreground">
            Analyysi kulkee nyt palvelinrajan (Edge Function) kautta ja käyttää extracted chunk -dataa lähtöaineistona. Tämän vaiheen löydökset pysyvät deterministisinä: deadline-, liite- ja referenssiosumat näkyvät evidenssin kanssa, ja draft artefaktit muodostetaan samoista löydöksistä ilman OCR:ää, AI-provideria tai vapaata sisällöntuotantoa.
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Dokumentit</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{selectedPackage.documents.length}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Paketti voi sisältää useita tiedostoja, mutta analyysi tarvitsee lisäksi vähintään yhden onnistuneen extractionin.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Puretut dokumentit</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{coverage.extractedDocuments}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Tuetuista dokumenteista {coverage.supportedDocuments} on extraction-kelpoisia ja {coverage.extractedDocuments} on jo purettu evidence-pohjaista analyysiä varten.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Evidence-chunkit</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{coverage.extractedChunks}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {coverage.extractedChunks > 0
                ? 'Deterministinen baseline käyttää näitä chunk-rivejä provenance-lähteinä requirement-, missing item-, risk-, draft artifact- ja review task -tuloksille.'
                : 'Yhtään analyysiin kelpaavaa chunkia ei ole vielä tallennettu, joten evidence-pohjainen ajo pysyy estettynä.'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Jobit</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{selectedPackage.analysisJobs.length}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Kaikki ajot tallentuvat samaan Tarjousälyn job-historiaan. Runner hylkää nyt ajot, joilta puuttuu extraction-aware evidence-lähde, ja kirjoittaa vain chunk-osumiin sidottuja löydöksiä ja draft artefakteja.</p>
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
              {latestSuccessfulJob ? latestSuccessfulJob.stageLabel : 'Ensimmäinen onnistunut baseline-ajo näkyy tässä ja toimii myöhemmän analyysipalvelun vaihtopisteenä.'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-2 text-slate-950">
              <ClockCountdown className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Suoritusmalli</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Sääntöpohjainen baseline-run suoritetaan Supabase Edge Function -rajapinnan kautta. Oikea analyysimoottori voidaan vaihtaa tämän rajan taakse ilman frontend-muutoksia, kunhan se tuottaa edelleen chunk-tason provenancea.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
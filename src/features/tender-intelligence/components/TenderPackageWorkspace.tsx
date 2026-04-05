import { ArrowRight, FileText, WarningCircle } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import TenderAnalysisPanel from './TenderAnalysisPanel';
import TenderDocumentsPanel from './TenderDocumentsPanel';
import TenderResultPanels from './TenderResultPanels';
import {
  TENDER_ANALYSIS_JOB_STATUS_META,
  TENDER_GO_NO_GO_META,
  TENDER_PACKAGE_STATUS_META,
  TENDER_REVIEW_TASK_STATUS_META,
  formatTenderTimestamp,
  getTenderTextPreview,
} from '../lib/tender-intelligence-ui';
import { TENDER_INTELLIGENCE_BACKEND_PLAN } from '../services/tender-intelligence-backend-adapter';
import type { TenderDocumentsUploadResult } from '../hooks/use-tender-intelligence';
import type { TenderPackageDetails } from '../types/tender-intelligence';

interface TenderPanelProps {
  title: string;
  value: string;
  description: string;
}

function TenderPanel({ title, value, description }: TenderPanelProps) {
  return (
    <Card className="border-slate-200/80 bg-white/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
      <CardHeader className="space-y-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-xl tracking-[-0.02em]">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

interface TenderPackageWorkspaceProps {
  selectedPackage: TenderPackageDetails | null;
  loading?: boolean;
  notFound?: boolean;
  uploading?: boolean;
  analysisStarting?: boolean;
  deletingDocumentIds?: string[];
  error?: string | null;
  onCreateClick: () => void;
  onStartAnalysis: (packageId: string) => Promise<void>;
  onUploadDocuments: (packageId: string, files: File[]) => Promise<TenderDocumentsUploadResult>;
  onDeleteDocument: (documentId: string) => Promise<void>;
}

export default function TenderPackageWorkspace({
  selectedPackage,
  loading = false,
  notFound = false,
  uploading = false,
  analysisStarting = false,
  deletingDocumentIds = [],
  error = null,
  onCreateClick,
  onStartAnalysis,
  onUploadDocuments,
  onDeleteDocument,
}: TenderPackageWorkspaceProps) {
  if (loading && !selectedPackage) {
    return (
      <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
        <CardContent className="px-6 py-12 text-center text-sm text-muted-foreground">
          Ladataan Tarjousälyn työtilaa...
        </CardContent>
      </Card>
    );
  }

  if (notFound) {
    return (
      <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
        <CardHeader>
          <CardTitle>Pakettia ei löytynyt</CardTitle>
          <CardDescription>
            Valittua tarjouspyyntöpakettia ei löytynyt enää organisaation Tarjousäly-datasta. Valitse toinen paketti listalta tai luo uusi.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end">
          <Button onClick={onCreateClick}>Luo tarjouspyyntöpaketti</Button>
        </CardContent>
      </Card>
    );
  }

  if (!selectedPackage) {
    return (
      <Card className="overflow-hidden border-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_32px_80px_-48px_rgba(15,23,42,0.75)]">
        <CardHeader className="space-y-4 border-b border-white/10 pb-6">
          <Badge className="w-fit border border-white/15 bg-white/10 text-white hover:bg-white/10">Phase 4 / Analysis result domain foundation</Badge>
          <div className="space-y-3">
            <CardTitle className="text-3xl tracking-[-0.03em] text-white">Tarjousälyllä on nyt pysyvä analyysitulosten domain omassa feature-rajassaan</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7 text-slate-200">
              Luo ensimmäinen tarjouspyyntöpaketti. Dokumentit tallentuvat organisaation omaan Storage-domainiin, analyysijobi toimii näkyvästi ja completed-vaihe kirjoittaa nyt placeholder-tulokset pysyviin result-tauluihin. Parsinta, OCR, AI ja varsinainen analyysimoottori jätetään edelleen myöhempiin vaiheisiin.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TenderPanel
              title="Dokumentit"
              value="0"
              description="Dokumenttipaneeli osaa jo ladata tiedostot oikeaan Storage-bucketiin heti kun ensimmäinen paketti on luotu."
            />
            <TenderPanel
              title="Analyysijobit"
              value="0"
              description="Ensimmäinen placeholder-run käyttää samaa job-mallia, jonka oikea analyysipalvelu ottaa myöhemmin käyttöön."
            />
            <TenderPanel
              title="Puutteet"
              value="0"
              description="Puute- ja tarkennuslista pysyy omassa domainissaan eikä kirjoita nykyisiin quote-riveihin."
            />
            <TenderPanel
              title="Riskit"
              value="0"
              description="Riskinostot tulevat myöhemmin analyysikerroksesta. Phase 0 varaa vain oman paikkansa UI:ssa ja domainissa."
            />
            <TenderPanel
              title="Go / No-Go"
              value="Odottaa analyysiä"
              description="Päätöstuki rakennetaan myöhemmin omaksi tulosobjektikseen. Tässä vaiheessa näkyvä analyysitila syntyy jobin elinkaaresta ja result-domainin placeholder-riveistä, ei vielä sisällön tulkinnasta."
            />
            <TenderPanel
              title="Luonnos"
              value="Placeholder"
              description="Luonnosartifaktit säilytetään erillään nykyisestä tarjouseditorista, kunnes import-adapteri rakennetaan hallitusti."
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button className="gap-2" onClick={onCreateClick}>
              Luo tarjouspyyntöpaketti
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const packageStatus = TENDER_PACKAGE_STATUS_META[selectedPackage.package.status];
  const analysisStatus = selectedPackage.latestAnalysisJob
    ? TENDER_ANALYSIS_JOB_STATUS_META[selectedPackage.latestAnalysisJob.status]
    : null;
  const goNoGo = selectedPackage.results.goNoGoAssessment;
  const goNoGoMeta = goNoGo ? TENDER_GO_NO_GO_META[goNoGo.recommendation] : null;
  const nextReviewTask = selectedPackage.results.reviewTasks[0] ?? null;
  const nextReviewTaskMeta = nextReviewTask ? TENDER_REVIEW_TASK_STATUS_META[nextReviewTask.status] : null;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_32px_80px_-48px_rgba(15,23,42,0.75)]">
        <CardHeader className="space-y-5 border-b border-white/10 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border border-white/15 bg-white/10 text-white hover:bg-white/10">Tarjousäly</Badge>
            <Badge variant={packageStatus.variant}>{packageStatus.label}</Badge>
            {analysisStatus && <Badge variant={analysisStatus.variant}>{analysisStatus.label}</Badge>}
          </div>
          <div className="space-y-3">
            <CardTitle className="text-3xl tracking-[-0.03em] text-white">{selectedPackage.package.name}</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7 text-slate-200">
              Tämä tarjouspyyntöpaketti elää omassa Tarjousäly-domainissaan. Dokumentit tallentuvat Supabase Storageen, analyysijobi toimii näkyvästi ja result-domain kirjoittuu nyt pysyvästi omiin tauluihinsa, mutta nykyinen quote-editori, exportit, laskentalogiikka ja raportointi eivät edelleenkään ole kytketty tähän näkymään.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">Luotu</p>
            <p className="mt-2 text-sm text-slate-100">{formatTenderTimestamp(selectedPackage.package.createdAt)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">Viimeisin job</p>
            <p className="mt-2 text-sm text-slate-100">{selectedPackage.latestAnalysisJob?.stageLabel || 'Ei käynnistetty'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">Data status</p>
            <p className="mt-2 text-sm text-slate-100">Paketti, dokumenttimetadata, analyysijobit ja analyysitulosten result-domain luetaan nyt suoraan Supabasesta ilman kytkentää tarjousytimeen.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TenderPanel
          title="Dokumentit"
          value={String(selectedPackage.documents.length)}
          description={
            selectedPackage.documents.length > 0
              ? `${selectedPackage.documents.length} dokumenttia näkyy paketin omassa Storage- ja metadata-tilassa.`
              : 'Dokumentteja ei ole lisätty. Upload-virta on valmis, mutta analyysiä ei vielä käynnistetä.'
          }
        />
        <TenderPanel
          title="Vaatimukset"
          value={String(selectedPackage.results.requirements.length)}
          description={
            selectedPackage.results.requirements.length > 0
              ? 'Placeholder-vaatimukset luetaan nyt oikeasta result-domainista eikä enää muistissa muodostetusta välirakenteesta.'
              : 'Vaatimuslista pysyy tyhjänä kunnes ensimmäinen completed-ajon placeholder-seed on kirjoitettu tietokantaan.'
          }
        />
        <TenderPanel
          title="Puutteet"
          value={String(selectedPackage.results.missingItems.length)}
          description={
            selectedPackage.results.missingItems.length > 0
              ? 'Avoimet puutteet näkyvät tässä omana tulosobjektinaan.'
              : 'Puutelistat muodostuvat myöhemmin ilman että nykyiseen tarjousdomainiin lisätään väliaikaisia hakkeja.'
          }
        />
        <TenderPanel
          title="Riskit"
          value={String(selectedPackage.results.riskFlags.length)}
          description={
            selectedPackage.results.riskFlags.length > 0
              ? 'Riskit säilyvät omassa domain-kerroksessaan ennen mahdollista hyväksyttyä importtia.'
              : 'Riskianalyysiä ei vielä tehdä. Tässä näkyy valmis paikka myöhemmälle worker- ja AI-integraatiolle.'
          }
        />
        <TenderPanel
          title="Go / No-Go"
          value={goNoGoMeta?.label || 'Odottaa analyysiä'}
          description={goNoGo?.summary || 'Go / No-Go -päätöstukea ei ole vielä muodostettu.'}
        />
        <TenderPanel
          title="Luonnos"
          value={String(selectedPackage.results.draftArtifacts.length)}
          description={
            getTenderTextPreview(selectedPackage.results.draftArtifacts[0]?.contentMd, 120) ||
            'Luonnosartifaktit tuotetaan myöhemmin vasta analyysi- ja hyväksyntävaiheen jälkeen.'
          }
        />
      </div>

      <TenderAnalysisPanel
        selectedPackage={selectedPackage}
        loading={loading}
        starting={analysisStarting}
        onStartAnalysis={onStartAnalysis}
      />

      <TenderResultPanels selectedPackage={selectedPackage} />

      <TenderDocumentsPanel
        selectedPackage={selectedPackage}
        loading={loading}
        uploading={uploading}
        deletingDocumentIds={deletingDocumentIds}
        error={error}
        onUploadDocuments={onUploadDocuments}
        onDeleteDocument={onDeleteDocument}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              Katselmointi ja jatkovaihe
            </CardTitle>
            <CardDescription>
              Placeholder-ajon skeleton käyttää nyt samaa repository- ja adapterirajaa, johon myöhemmät analyysijobit, parsinta ja oikeat tulosmallit voidaan kytkeä ilman muutoksia nykyiseen tarjousytimeen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {nextReviewTask ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  {nextReviewTaskMeta && <Badge variant={nextReviewTaskMeta.variant}>{nextReviewTaskMeta.label}</Badge>}
                  <span className="text-sm font-medium text-slate-900">Seuraava tehtävä</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{nextReviewTask.title}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
                Katselmointitehtäviä ei ole vielä muodostettu.
              </div>
            )}

            <div className="rounded-2xl border border-dashed px-4 py-8 text-sm leading-6 text-muted-foreground">
              Referenssiehdotukset, puuteanalyysi ja varsinainen luonnoksen generointi tulevat myöhemmin omasta analyysipalvelusta. Phase 4 pitää nämä riippuvuudet tietoisesti irti nykyisestä tarjouseditorista, vaikka dokumentit, analyysijobi ja pysyvä result-domain jo toimivat omassa feature-alueessaan.
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <WarningCircle className="h-5 w-5 text-slate-500" />
              Adapterivalmius
            </CardTitle>
            <CardDescription>
              Seuraava vaihe voidaan toteuttaa ilman että Tarjousälyä tarvitsee tunkea nykyiseen use-data.ts-monoliittiin tai nykyiseen tarjouseditoriin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-6 text-sm text-slate-700">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="font-medium text-slate-900">Persistence</p>
              <p className="mt-2">{TENDER_INTELLIGENCE_BACKEND_PLAN.persistence}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="font-medium text-slate-900">Document storage</p>
              <p className="mt-2">{TENDER_INTELLIGENCE_BACKEND_PLAN.documentStorage}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="font-medium text-slate-900">Analysis execution</p>
              <p className="mt-2">{TENDER_INTELLIGENCE_BACKEND_PLAN.analysisExecution}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
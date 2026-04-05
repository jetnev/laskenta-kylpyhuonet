import { Plus, Sparkle, Stack } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import CreateTenderPackageDialog from '../components/CreateTenderPackageDialog';
import TenderPackageList from '../components/TenderPackageList';
import TenderPackageWorkspace from '../components/TenderPackageWorkspace';
import { useTenderIntelligence } from '../hooks/use-tender-intelligence';

const SUMMARY_CARDS = [
  {
    key: 'packages',
    label: 'Paketit',
    description: 'Oman domainin tarjouspyyntöpaketit',
  },
  {
    key: 'openReviewTasks',
    label: 'Avoimet tehtävät',
    description: 'Katselmoinnin placeholder-työt',
  },
  {
    key: 'openRisks',
    label: 'Riskit',
    description: 'Tässä vaiheessa odottaa analyysiä',
  },
  {
    key: 'documents',
    label: 'Dokumentit',
    description: 'Metadata- ja placeholder-dokumentit',
  },
] as const;

export default function TenderIntelligencePage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const {
    packages,
    selectedPackage,
    selectedPackageId,
    selectedPackageMissing,
    loading,
    creating,
    error,
    overview,
    canCreate,
    selectPackage,
    createPackage,
  } = useTenderIntelligence();

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <Card className="overflow-hidden border-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_32px_80px_-48px_rgba(15,23,42,0.75)]">
        <CardContent className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <Badge className="w-fit border border-white/15 bg-white/10 text-white hover:bg-white/10">Tarjousäly / Phase 1</Badge>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">Pysyvä Supabase-data tarjouspyyntöpaketeille ilman muutoksia tarjousytimeen</h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
                  Tarjousäly käyttää nyt omaa organisaatio-scoped Supabase-domainiaan. Tässä vaiheessa rakennetaan pysyvä CRUD-perusta tarjouspyyntöpaketeille, mutta dokumenttiupload, analyysipalvelu ja tarjousluonnoksen generointi jätetään edelleen myöhempiin vaiheisiin.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:min-w-56">
              <Button className="justify-between bg-white text-slate-950 hover:bg-slate-100" onClick={() => setShowCreateDialog(true)} disabled={!canCreate || creating}>
                Luo tarjouspyyntöpaketti
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="justify-between border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" disabled>
                Analyysipalvelu tulossa
                <Sparkle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {SUMMARY_CARDS.map((card) => (
              <div key={card.key} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">{overview[card.key]}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{card.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <TenderPackageList
          packages={packages}
          selectedPackageId={selectedPackageId}
          loading={loading}
          createDisabled={!canCreate || creating}
          onCreateClick={() => setShowCreateDialog(true)}
          onSelectPackage={selectPackage}
        />
        <TenderPackageWorkspace
          selectedPackage={selectedPackage}
          loading={loading}
          notFound={selectedPackageMissing}
          onCreateClick={() => setShowCreateDialog(true)}
        />
      </div>

      <Card className="border-dashed border-slate-200 bg-slate-50/70 shadow-none">
        <CardContent className="flex flex-col gap-4 px-6 py-5 text-sm text-slate-700 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-950">
              <Stack className="h-4 w-4" />
              <span className="font-medium">Mitä tämä vaihe jo tekee</span>
            </div>
            <p>Tarjouspyyntöpaketit tallentuvat nyt oikeasti Supabaseen ja näkyvät omalle organisaatiolle myös sivun päivityksen jälkeen.</p>
          </div>
          <div className="space-y-2 sm:max-w-sm">
            <p className="font-medium text-slate-950">Mitä tästä puuttuu tarkoituksella</p>
            <p>Ei vielä dokumenttiuploadia, OCR:ää, AI-provider-koodia, analyysipalvelua tai kytkentää nykyiseen tarjouseditoriin.</p>
          </div>
        </CardContent>
      </Card>

      <CreateTenderPackageDialog
        open={showCreateDialog}
        submitting={creating}
        onOpenChange={setShowCreateDialog}
        onCreate={async ({ name }) => {
          const created = await createPackage({ name });
          toast.success(`Tarjouspyyntöpaketti “${created.package.name}” tallennettiin organisaation Tarjousäly-dataan.`);
        }}
      />
    </div>
  );
}
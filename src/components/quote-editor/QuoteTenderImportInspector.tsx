import { ArrowSquareOut, Sparkle, WarningCircle } from '@phosphor-icons/react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import type {
  QuoteTenderManagedBlockDiagnostics,
  QuoteTenderManagedSurfaceDiagnostics,
  QuoteTenderManagedSurfaceHealthStatus,
} from '../../features/tender-intelligence/lib/quote-managed-surface-inspector';
import { cn } from '../../lib/utils';

export interface QuoteTenderImportSourceSummary {
  draftPackageId: string;
  draftPackageTitle: string | null;
  tenderPackageId: string | null;
  tenderPackageTitle: string | null;
}

interface QuoteTenderImportInspectorProps {
  diagnostics: QuoteTenderManagedSurfaceDiagnostics;
  source?: QuoteTenderImportSourceSummary | null;
  tenderIntelligenceUrl?: string | null;
}

function resolveHealthMeta(status: QuoteTenderManagedSurfaceHealthStatus) {
  switch (status) {
    case 'clean':
      return {
        label: 'Ajan tasalla',
        variant: 'default' as const,
      };
    case 'needs_attention':
      return {
        label: 'Tarkista',
        variant: 'outline' as const,
      };
    case 'inconsistent':
      return {
        label: 'Ristiriita',
        variant: 'destructive' as const,
      };
    default:
      return {
        label: status,
        variant: 'outline' as const,
      };
  }
}

function resolveDetectedFieldLabel(field: QuoteTenderImportInspectorProps['diagnostics']['detected_fields'][number]) {
  switch (field) {
    case 'notes':
      return 'notes';
    case 'internalNotes':
      return 'internalNotes';
    case 'sections':
      return 'sections';
    default:
      return field;
  }
}

function resolveBlockTargetLabel(block: QuoteTenderManagedBlockDiagnostics) {
  if (block.has_section_row && block.text_fields.length > 0) {
    return block.text_fields.includes('internalNotes') ? 'internalNotes + section' : 'notes + section';
  }

  if (block.has_section_row) {
    return 'section';
  }

  if (block.text_fields.includes('internalNotes')) {
    return 'internalNotes';
  }

  return 'notes';
}

export default function QuoteTenderImportInspector({
  diagnostics,
  source = null,
  tenderIntelligenceUrl = null,
}: QuoteTenderImportInspectorProps) {
  if (!diagnostics.has_tarjousaly_managed_surface) {
    return null;
  }

  const healthMeta = resolveHealthMeta(diagnostics.health_status);
  const cleanBlockCount = diagnostics.blocks.filter((block) => !block.unknown_marker && block.health_status === 'clean').length;
  const attentionBlockCount = diagnostics.blocks.filter((block) => block.health_status === 'needs_attention').length;
  const inconsistentBlockCount = diagnostics.blocks.filter((block) => block.health_status === 'inconsistent').length;

  return (
    <Card className="border-sky-200 bg-sky-50/70 p-5">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Tarjousäly-importti</Badge>
              <Badge variant={healthMeta.variant}>{healthMeta.label}</Badge>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Sparkle className="h-4 w-4 text-sky-700" />
                Quote sisältää Tarjousälyn hallitsemaa managed surfacea
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Tarjousäly hallitsee vain nimettyjä lohkoja. Muu editorin sisältö ei kuulu Tarjousälyn hallintaan, ja hallitut päivitykset kannattaa tehdä Tarjousälyn re-importin kautta.
              </p>
            </div>
          </div>

          {tenderIntelligenceUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={tenderIntelligenceUrl}>
                <ArrowSquareOut className="h-4 w-4" />
                Avaa Tarjousäly
              </a>
            </Button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-sky-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-900">Hallitut lohkot</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{diagnostics.managed_blocks_total}</div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-900">Kohdekentät</div>
            <div className="mt-1 text-sm font-medium text-slate-950">{diagnostics.detected_fields.map(resolveDetectedFieldLabel).join(' / ') || 'notes'}</div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-900">Hallitut sectionit</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{diagnostics.managed_sections_total}</div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-900">Notes-lohkot</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{diagnostics.managed_notes_blocks_total}</div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="rounded-2xl border border-sky-200 bg-white px-4 py-4">
            <div className="text-sm font-medium text-slate-950">Lähde</div>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>Lähde: Tarjousäly-importti</p>
              <p>Draft package: {source?.draftPackageTitle ?? source?.draftPackageId ?? diagnostics.primary_draft_package_id ?? 'Löytyy managed markkereista'}</p>
              {(source?.draftPackageId ?? diagnostics.primary_draft_package_id) && (
                <p className="text-xs text-slate-500">ID {(source?.draftPackageId ?? diagnostics.primary_draft_package_id)!}</p>
              )}
              <p>Tender package: {source?.tenderPackageTitle ?? source?.tenderPackageId ?? (diagnostics.multiple_draft_package_sources ? 'Useita lähteitä' : 'Ei vahvistettu')}</p>
              {diagnostics.multiple_draft_package_sources && (
                <>
                  <p className="text-xs text-red-700">Quote sisältää useamman draft package -lähteen markkereita.</p>
                  <p className="text-xs text-slate-500">Draft package ID:t: {diagnostics.draft_package_ids.join(', ')}</p>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-white px-4 py-4">
            <div className="text-sm font-medium text-slate-950">Tilan yhteenveto</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ajan tasalla</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{cleanBlockCount}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tarkista</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{attentionBlockCount}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ristiriidat</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{inconsistentBlockCount}</div>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p>Tee päivitykset Tarjousälyn draft package / re-import -näkymästä, ei editorissa sokkona.</p>
              <p>Hallittu päivitys tapahtuu Tarjousälyn puolella, ei tästä editorista käsin.</p>
            </div>
          </div>
        </div>

        {(diagnostics.duplicate_marker_blocks_total > 0 || diagnostics.unknown_marker_blocks_total > 0 || diagnostics.probable_drift_blocks_total > 0) && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            <div className="flex items-start gap-2">
              <WarningCircle className="mt-0.5 h-4 w-4 flex-none" />
              <div className="space-y-1 leading-6">
                {diagnostics.probable_drift_blocks_total > 0 && <p>{diagnostics.probable_drift_blocks_total} managed lohkoa tarvitsee tarkistuksen ennen seuraavaa re-importia.</p>}
                {diagnostics.duplicate_marker_blocks_total > 0 && <p>{diagnostics.duplicate_marker_blocks_total} lohkolla on duplikaattimarkkereita.</p>}
                {diagnostics.unknown_marker_blocks_total > 0 && <p>{diagnostics.unknown_marker_blocks_total} marker-lohkoa ei tunnistettu Tarjousälyn tunnetuksi blokiksi.</p>}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-950">Hallitut lohkot</div>
          <div className="grid gap-3 xl:grid-cols-2">
            {diagnostics.blocks.map((block) => {
              const blockHealthMeta = resolveHealthMeta(block.health_status);

              return (
                <div
                  key={block.marker_key}
                  className={cn(
                    'rounded-2xl border bg-white px-4 py-3 text-sm text-slate-700',
                    block.health_status === 'clean' ? 'border-slate-200' : 'border-amber-200',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={blockHealthMeta.variant}>{blockHealthMeta.label}</Badge>
                    <Badge variant="outline">{resolveBlockTargetLabel(block)}</Badge>
                    {block.unknown_marker && <Badge variant="destructive">Tuntematon marker</Badge>}
                  </div>
                  <p className="mt-2 font-medium text-slate-950">{block.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{block.marker_key}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
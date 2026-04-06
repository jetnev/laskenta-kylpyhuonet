import { ClockCountdown, Plus } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { buildTenderPackageLinkItems } from '../lib/tender-package-links';
import { TENDER_PACKAGE_STATUS_META, formatCountLabel, formatTenderTimestamp } from '../lib/tender-intelligence-ui';
import type { TenderPackage } from '../types/tender-intelligence';

interface TenderPackageListProps {
  packages: TenderPackage[];
  selectedPackageId: string | null;
  customerNameById?: Record<string, string>;
  projectNameById?: Record<string, string>;
  quoteLabelById?: Record<string, string>;
  loading?: boolean;
  createDisabled?: boolean;
  onCreateClick: () => void;
  onSelectPackage: (packageId: string) => void;
}

export default function TenderPackageList({
  packages,
  selectedPackageId,
  customerNameById = {},
  projectNameById = {},
  quoteLabelById = {},
  loading = false,
  createDisabled = false,
  onCreateClick,
  onSelectPackage,
}: TenderPackageListProps) {
  return (
    <Card className="h-full border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Tarjouspyyntöpaketit</CardTitle>
            <CardDescription>
              Lista tulee nyt organisaation omasta Tarjousäly-datasta. Nykyinen tarjousdomain on edelleen rajattu tämän näkymän ulkopuolelle.
            </CardDescription>
          </div>
          <Button size="sm" className="gap-2" onClick={onCreateClick} disabled={createDisabled}>
            <Plus className="h-4 w-4" />
            Uusi
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-6">
        {loading ? (
          <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            Ladataan Tarjousälyn organisaatiodataa...
          </div>
        ) : packages.length === 0 ? (
          <div className="rounded-3xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
            Organisaatiolle ei ole vielä tallennettu tarjouspyyntöpaketteja. Ensimmäinen paketti luodaan tästä näkymästä ja säilyy myös sivun päivityksen yli.
          </div>
        ) : (
          packages.map((item) => {
            const statusMeta = TENDER_PACKAGE_STATUS_META[item.status];
            const isActive = selectedPackageId === item.id;
            const linkItems = buildTenderPackageLinkItems(item, {
              customerNameById,
              projectNameById,
              quoteLabelById,
            });

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPackage(item.id)}
                className={cn(
                  'w-full rounded-2xl border px-4 py-4 text-left transition-colors',
                  isActive
                    ? 'border-slate-950 bg-slate-950 text-white shadow-[0_28px_80px_-48px_rgba(15,23,42,0.8)]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold tracking-[-0.02em]">{item.name}</p>
                    <div className={cn('mt-2 flex items-center gap-2 text-xs', isActive ? 'text-slate-300' : 'text-muted-foreground')}>
                      <ClockCountdown className="h-3.5 w-3.5" />
                      <span>Päivitetty {formatTenderTimestamp(item.updatedAt)}</span>
                    </div>
                    {linkItems.length > 0 && (
                      <div className={cn('mt-3 flex flex-wrap gap-2 text-xs', isActive ? 'text-slate-200' : 'text-slate-600')}>
                        {linkItems.map((linkItem) => (
                          <span
                            key={`${item.id}-${linkItem.key}`}
                            className={cn(
                              'rounded-full border px-2.5 py-1',
                              isActive ? 'border-white/15 bg-white/10 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-700'
                            )}
                          >
                            {linkItem.label}: {linkItem.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className={cn('rounded-full border px-2.5 py-1', isActive ? 'border-white/15 bg-white/10 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-700')}>
                    {formatCountLabel(item.summary.documentCount, 'dokumentti')}
                  </span>
                  <span className={cn('rounded-full border px-2.5 py-1', isActive ? 'border-white/15 bg-white/10 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-700')}>
                    {formatCountLabel(item.summary.missingItemCount, 'puute')}
                  </span>
                  <span className={cn('rounded-full border px-2.5 py-1', isActive ? 'border-white/15 bg-white/10 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-700')}>
                    {formatCountLabel(item.summary.reviewTaskCount, 'tehtävä')}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
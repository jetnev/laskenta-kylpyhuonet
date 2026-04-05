import { useEffect, useMemo, useState } from 'react';
import { ArrowSquareOut, CheckCircle, FloppyDisk, WarningCircle, XCircle } from '@phosphor-icons/react';

import type { TenderIntelligenceQuoteEditorHandoffLink } from '../../features/tender-intelligence/lib/tender-intelligence-handoff';
import type { QuoteTenderManagedEditorState } from '../../features/tender-intelligence/lib/quote-managed-surface-inspector';
import { resolveQuoteTenderManagedSaveGuardDecision } from '../../features/tender-intelligence/lib/quote-managed-surface-inspector';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface QuoteManagedSaveGuardProps {
  state: QuoteTenderManagedEditorState;
  isEditable: boolean;
  onSave: () => void;
  tenderIntelligenceLink?: TenderIntelligenceQuoteEditorHandoffLink | null;
}

function resolveStatusMeta(status: QuoteTenderManagedEditorState['status']) {
  switch (status) {
    case 'clean':
      return {
        title: 'Tarjousälyn hallinnoitu sisältö kunnossa',
        description: 'Managed markerit, kenttälinkit ja section-rakenne näyttävät ehjiltä. Voit tallentaa luonnoksen normaalisti.',
        badgeLabel: 'Kunnossa',
        badgeVariant: 'outline' as const,
        icon: CheckCircle,
        cardClassName: 'border-emerald-200 bg-emerald-50/70',
        iconClassName: 'text-emerald-700',
      };
    case 'warning':
      return {
        title: 'Tarjousälyn hallinnoidussa sisällössä muutoksia',
        description: 'Tarjousäly tunnistaa managed surface -rakenteen edelleen, mutta vähintään yksi hallittu lohko on muuttunut editorissa.',
        badgeLabel: 'Varoitus',
        badgeVariant: 'outline' as const,
        icon: WarningCircle,
        cardClassName: 'border-amber-200 bg-amber-50/80',
        iconClassName: 'text-amber-700',
      };
    case 'danger':
      return {
        title: 'Tarjousälyn hallinnoitu sisältö on rikkoutunut',
        description: 'Managed markerit tai niiden sidokset eivät ole enää turvallisesti tulkittavissa. Normaali tallennus on estetty.',
        badgeLabel: 'Estetty',
        badgeVariant: 'destructive' as const,
        icon: XCircle,
        cardClassName: 'border-red-200 bg-red-50/80',
        iconClassName: 'text-red-700',
      };
    default:
      return {
        title: status,
        description: '',
        badgeLabel: status,
        badgeVariant: 'outline' as const,
        icon: WarningCircle,
        cardClassName: 'border-slate-200 bg-slate-50',
        iconClassName: 'text-slate-700',
      };
  }
}

export default function QuoteManagedSaveGuard({
  state,
  isEditable,
  onSave,
  tenderIntelligenceLink = null,
}: QuoteManagedSaveGuardProps) {
  const [warningConfirmationRequested, setWarningConfirmationRequested] = useState(false);
  const statusMeta = useMemo(() => resolveStatusMeta(state.status), [state.status]);
  const visibleIssues = useMemo(() => state.issues.slice(0, 4), [state.issues]);
  const hiddenIssueCount = Math.max(0, state.issues.length - visibleIssues.length);
  const StatusIcon = statusMeta.icon;

  useEffect(() => {
    setWarningConfirmationRequested(false);
  }, [state.status, state.warning_count, state.danger_count]);

  if (!state.has_tarjousaly_managed_surface) {
    return null;
  }

  const handleSave = () => {
    const decision = resolveQuoteTenderManagedSaveGuardDecision(state, warningConfirmationRequested);

    if (decision === 'allow') {
      onSave();
      setWarningConfirmationRequested(false);
      return;
    }

    if (decision === 'confirm') {
      setWarningConfirmationRequested(true);
    }
  };

  return (
    <Card className={cn('p-5', statusMeta.cardClassName)} data-testid="quote-managed-save-guard">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Tarjousäly save guard</Badge>
              <Badge variant={statusMeta.badgeVariant}>{statusMeta.badgeLabel}</Badge>
              {state.warning_count > 0 && <Badge variant="outline">{state.warning_count} varoitusta</Badge>}
              {state.danger_count > 0 && <Badge variant="destructive">{state.danger_count} estävää poikkeamaa</Badge>}
            </div>
            <div className="flex items-start gap-2">
              <StatusIcon className={cn('mt-0.5 h-5 w-5 flex-none', statusMeta.iconClassName)} />
              <div>
                <div className="text-sm font-semibold text-slate-950">{statusMeta.title}</div>
                <p className="mt-1 text-sm leading-6 text-slate-700">{statusMeta.description}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {state.status === 'danger' && tenderIntelligenceLink && (
              <Button asChild size="sm" variant="outline">
                <a href={tenderIntelligenceLink.url}>
                  <ArrowSquareOut className="h-4 w-4" />
                  {tenderIntelligenceLink.label}
                </a>
              </Button>
            )}
            {isEditable && state.status !== 'danger' && (
              <Button size="sm" onClick={handleSave}>
                <FloppyDisk className="h-4 w-4" />
                {warningConfirmationRequested ? 'Tallenna tästä huolimatta' : 'Tallenna luonnos'}
              </Button>
            )}
          </div>
        </div>

        {visibleIssues.length > 0 && (
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4 text-sm text-slate-700">
            <div className="font-medium text-slate-950">
              {state.status === 'danger' ? 'Tallennus estyy näiden managed-surface-poikkeamien vuoksi:' : 'Tarkista nämä Tarjousälyn hallinnoidut muutokset ennen tallennusta:'}
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 leading-6">
              {visibleIssues.map((issue) => (
                <li key={[issue.code, issue.marker_key ?? '', issue.field ?? ''].join('::')}>{issue.message}</li>
              ))}
            </ul>
            {hiddenIssueCount > 0 && (
              <p className="mt-2 text-xs text-slate-500">Lisäksi {hiddenIssueCount} muuta havaintoa.</p>
            )}
          </div>
        )}

        {warningConfirmationRequested && state.status === 'warning' && isEditable && (
          <div className="rounded-2xl border border-amber-300 bg-white/85 px-4 py-4 text-sm text-amber-950">
            <div className="font-medium">Vahvista tallennus tietoisesti</div>
            <p className="mt-1 leading-6">
              Tarjousälyn hallinnoitu lohko on muuttunut, mutta rakenne on vielä tunnistettavissa. Jatka tallennusta vain, jos tiedät miksi managed sisältöä on muokattu editorissa.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={handleSave}>
                <FloppyDisk className="h-4 w-4" />
                Tallenna tästä huolimatta
              </Button>
              <Button size="sm" variant="outline" onClick={() => setWarningConfirmationRequested(false)}>
                Peru
              </Button>
            </div>
          </div>
        )}

        {state.status === 'danger' && (
          <div className="rounded-2xl border border-red-300 bg-white/85 px-4 py-4 text-sm text-red-950">
            <div className="font-medium">Normaali tallennus on estetty</div>
            <p className="mt-1 leading-6">
              Palaa Tarjousälyyn, tee korjaava re-import tai korjaa managed surface ennen kuin jatkat tästä editorista.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
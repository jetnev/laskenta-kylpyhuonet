import FieldHelpLabel from '../FieldHelpLabel';
import type { QuoteTenderManagedEditTarget } from '../../features/tender-intelligence/lib/quote-managed-surface-inspector';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import type { Quote } from '../../lib/types';
import HelpTooltip from './HelpTooltip';
import VisibilityBadge from './VisibilityBadge';

interface QuoteNotesPanelsProps {
  quote: Quote;
  isEditable: boolean;
  onUpdateField: (field: 'notes' | 'internalNotes', value: string) => void;
  fieldHelp: {
    notes: string;
    internalNotes: string;
  };
  managedTargets?: {
    notes: QuoteTenderManagedEditTarget;
    internalNotes: QuoteTenderManagedEditTarget;
  };
  managedUnlockState?: {
    notes: boolean;
    internalNotes: boolean;
  };
}

function renderManagedFieldNotice(target: QuoteTenderManagedEditTarget | undefined, unlocked: boolean | undefined) {
  if (!target?.is_tarjousaly_managed) {
    return null;
  }

  const blockLabel = target.titles.length === 1
    ? `lohkoa "${target.titles[0]}"`
    : `${target.titles.length} Tarjousälyn hallinnoimaa lohkoa`;
  const text = target.status === 'danger'
    ? `Tämä kenttä sisältää ${blockLabel}. Managed surface on danger-tilassa, joten suora muokkaus estetään.`
    : target.status === 'warning'
      ? unlocked
        ? `Tämä kenttä sisältää ${blockLabel}. Kenttä on jo warning-tilassa ja muokkaus on avattu tälle sessiolle vahvistuksen jälkeen.`
        : `Tämä kenttä sisältää ${blockLabel}. Kenttä on jo warning-tilassa ja lisämuokkaus vaatii vahvistuksen.`
      : unlocked
        ? `Tämä kenttä sisältää ${blockLabel}. Muokkaus on avattu tälle sessiolle vahvistuksen jälkeen.`
        : `Tämä kenttä sisältää ${blockLabel}. Suora muokkaus vaatii ensin vahvistuksen.`;

  return (
    <div className={[
      'rounded-2xl border px-4 py-3 text-xs leading-6',
      target.status === 'danger'
        ? 'border-red-200 bg-red-50/80 text-red-950'
        : target.status === 'warning'
          ? 'border-amber-200 bg-amber-50/80 text-amber-950'
          : 'border-slate-200 bg-slate-50/80 text-slate-700',
    ].join(' ')}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={target.status === 'danger' ? 'destructive' : 'outline'}>
          {target.status === 'danger' ? 'Tarjousäly / estetty' : target.status === 'warning' ? 'Tarjousäly / varoitus' : 'Tarjousäly / vahvistus'}
        </Badge>
      </div>
      <p className="mt-2">{text}</p>
    </div>
  );
}

export default function QuoteNotesPanels({
  quote,
  isEditable,
  onUpdateField,
  fieldHelp,
  managedTargets,
  managedUnlockState,
}: QuoteNotesPanelsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-base font-semibold tracking-[-0.03em] text-slate-950">Huomiot ja rajaukset</h4>
        <HelpTooltip
          label="Huomiot ja rajaukset"
          help="Pidä asiakkaalle näkyvät huomiot ja sisäinen työnohjaus eri kentissä. Näin tarjous pysyy asiakkaalle selkeänä ilman, että oma tiimi menettää tarvittavia muistiinpanoja."
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Asiakasnäkyvät huomiot</h5>
            <VisibilityBadge tone="customer" />
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Kirjaa tähän rajaukset, oletukset, lisäselitteet ja muut tiedot, jotka haluat mukaan asiakkaan tarjoukseen ja tulosteisiin.
          </p>
          <div className="mt-4 space-y-2">
            {renderManagedFieldNotice(managedTargets?.notes, managedUnlockState?.notes)}
            <FieldHelpLabel htmlFor="quote-notes" label="Tarjoushuomautukset" help={fieldHelp.notes} />
            <Textarea
              id="quote-notes"
              value={quote.notes || ''}
              onChange={(event) => onUpdateField('notes', event.target.value)}
              disabled={!isEditable}
              rows={6}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-950">Sisäinen työnohjaus</h5>
            <VisibilityBadge tone="internal" />
          </div>
          <p className="mt-2 text-sm leading-6 text-amber-900/80">
            Käytä tätä omille muistioille, työjärjestykselle ja kannattavuuden tai toteutuksen huomioille. Tätä sisältöä ei näytetä asiakkaalle.
          </p>
          <div className="mt-4 space-y-2">
            {renderManagedFieldNotice(managedTargets?.internalNotes, managedUnlockState?.internalNotes)}
            <FieldHelpLabel htmlFor="internal-notes" label="Sisäiset muistiinpanot" help={fieldHelp.internalNotes} />
            <Textarea
              id="internal-notes"
              value={quote.internalNotes || ''}
              onChange={(event) => onUpdateField('internalNotes', event.target.value)}
              disabled={!isEditable}
              rows={6}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
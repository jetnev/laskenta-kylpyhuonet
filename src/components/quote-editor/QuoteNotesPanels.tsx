import FieldHelpLabel from '../FieldHelpLabel';
import { Textarea } from '../ui/textarea';
import type { Quote } from '../../lib/types';
import HelpTooltip from './HelpTooltip';
import VisibilityBadge from './VisibilityBadge';

interface QuoteNotesPanelsProps {
  quote: Quote;
  isEditable: boolean;
  onUpdateQuote: (quoteId: string, updates: Partial<Quote>) => void;
  fieldHelp: {
    notes: string;
    internalNotes: string;
  };
}

export default function QuoteNotesPanels({
  quote,
  isEditable,
  onUpdateQuote,
  fieldHelp,
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
            <FieldHelpLabel htmlFor="quote-notes" label="Tarjoushuomautukset" help={fieldHelp.notes} />
            <Textarea
              id="quote-notes"
              value={quote.notes || ''}
              onChange={(event) => onUpdateQuote(quote.id, { notes: event.target.value })}
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
            <FieldHelpLabel htmlFor="internal-notes" label="Sisäiset muistiinpanot" help={fieldHelp.internalNotes} />
            <Textarea
              id="internal-notes"
              value={quote.internalNotes || ''}
              onChange={(event) => onUpdateQuote(quote.id, { internalNotes: event.target.value })}
              disabled={!isEditable}
              rows={6}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
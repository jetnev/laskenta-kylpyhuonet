import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import FieldHelpLabel from '../FieldHelpLabel';
import VisibilityBadge from './VisibilityBadge';
import type { Quote } from '../../lib/types';
import { formatCurrency } from '../../lib/calculations';

interface AdditionalCostsSectionProps {
  quote: Quote;
  total: number;
  travelCosts: number;
  open: boolean;
  isEditable: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateQuote: (quoteId: string, updates: Partial<Quote>) => void;
  fieldHelp: Record<string, string>;
  hasPotentialDoubleInstallationCharge: boolean;
}

export default function AdditionalCostsSection({
  quote,
  total,
  travelCosts,
  open,
  isEditable,
  onOpenChange,
  onUpdateQuote,
  fieldHelp,
  hasPotentialDoubleInstallationCharge,
}: AdditionalCostsSectionProps) {
  const activeLabels = [
    quote.projectCosts > 0 && `Muut projektikulut ${formatCurrency(quote.projectCosts)}`,
    quote.deliveryCosts > 0 && `Toimituskulut ${formatCurrency(quote.deliveryCosts)}`,
    quote.installationCosts > 0 && `Erillinen asennuskulu ${formatCurrency(quote.installationCosts)}`,
    travelCosts > 0 && `Ajokulut ${formatCurrency(travelCosts)}`,
    quote.disposalCosts > 0 && `Jäte ${formatCurrency(quote.disposalCosts)}`,
    quote.demolitionCosts > 0 && `Purku ${formatCurrency(quote.demolitionCosts)}`,
    quote.protectionCosts > 0 && `Suojaus ${formatCurrency(quote.protectionCosts)}`,
    quote.permitCosts > 0 && `Luvat ${formatCurrency(quote.permitCosts)}`,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Lisäkulut ja työmaan erät</h4>
            <VisibilityBadge tone="optional" />
            <VisibilityBadge tone="customer" label="Näkyvät asiakkaalle erillisinä erinä" />
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            Käytä tätä vaihetta vain silloin, kun haluat veloittaa logistiikan, työmaan suojauksen, purun tai muut projektikulut erillisenä kokonaisuutena tarjousrivien lisäksi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Yhteissumma</div>
            <div className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(total)}</div>
          </div>
          <Button type="button" variant="outline" onClick={() => onOpenChange(!open)}>
            {open ? 'Piilota lisäkulut' : 'Avaa lisäkulut'}
          </Button>
        </div>
      </div>

      {!open && (
        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-4 text-sm text-slate-600">
            {activeLabels.length > 0
              ? 'Lisäkulut on eritelty, mutta ne pysyvät poissa näkyvistä kunnes tarvitset niitä.'
              : 'Lisäkulut ovat oletuksena kevyesti piilossa, jotta tarjousrivit pysyvät editorin päätyönä.'}
          </div>
          {activeLabels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeLabels.map((label) => (
                <span key={label} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {open && (
        <div className="mt-6 space-y-5">
          {hasPotentialDoubleInstallationCharge && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-950">
              <AlertDescription>
                Erillinen asennuskulu on käytössä samalla kun tarjousriveillä on asennuksen kustannuksia. Tarkista, ettei sama asennustyö veloitu kahteen kertaan.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h5 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">A. Logistiikka</h5>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="delivery-costs" label="Toimituskulut" help={fieldHelp.deliveryCosts} />
                  <Input id="delivery-costs" type="number" min="0" step="0.01" value={quote.deliveryCosts} onChange={(event) => onUpdateQuote(quote.id, { deliveryCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="travel-kilometers" label="Kilometrit" help={fieldHelp.travelKilometers} />
                  <Input id="travel-kilometers" type="number" min="0" step="1" value={quote.travelKilometers ?? 0} onChange={(event) => onUpdateQuote(quote.id, { travelKilometers: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="travel-rate" label="Km-hinta" help={fieldHelp.travelRatePerKm} />
                  <Input id="travel-rate" type="number" min="0" step="0.01" value={quote.travelRatePerKm ?? 0} onChange={(event) => onUpdateQuote(quote.id, { travelRatePerKm: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel label="Ajokulu yhteensä" help={fieldHelp.travelCosts} />
                  <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm font-medium text-slate-950">{formatCurrency(travelCosts)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h5 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">B. Työmaa ja suojaus</h5>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="protection-costs" label="Suojaus- ja peittokulut" help={fieldHelp.protectionCosts} />
                  <Input id="protection-costs" type="number" min="0" step="0.01" value={quote.protectionCosts ?? 0} onChange={(event) => onUpdateQuote(quote.id, { protectionCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="permit-costs" label="Lupa- ja käsittelymaksut" help={fieldHelp.permitCosts} />
                  <Input id="permit-costs" type="number" min="0" step="0.01" value={quote.permitCosts ?? 0} onChange={(event) => onUpdateQuote(quote.id, { permitCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <FieldHelpLabel htmlFor="project-costs" label="Muut projektikulut" help={fieldHelp.projectCosts} />
                  <Input id="project-costs" type="number" min="0" step="0.01" value={quote.projectCosts} onChange={(event) => onUpdateQuote(quote.id, { projectCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h5 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">C. Purku ja jäte</h5>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="demolition-costs" label="Purkutyön lisäkulut" help={fieldHelp.demolitionCosts} />
                  <Input id="demolition-costs" type="number" min="0" step="0.01" value={quote.demolitionCosts ?? 0} onChange={(event) => onUpdateQuote(quote.id, { demolitionCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="disposal-costs" label="Kaatopaikka- ja jätemaksut" help={fieldHelp.disposalCosts} />
                  <Input id="disposal-costs" type="number" min="0" step="0.01" value={quote.disposalCosts ?? 0} onChange={(event) => onUpdateQuote(quote.id, { disposalCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h5 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">D. Erilliset rivit</h5>
              <div className="mt-4 space-y-2">
                <FieldHelpLabel htmlFor="installation-costs" label="Asennuskulut erillisenä rivinä" help={fieldHelp.installationCosts} />
                <Input id="installation-costs" type="number" min="0" step="0.01" value={quote.installationCosts} onChange={(event) => onUpdateQuote(quote.id, { installationCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                <p className="text-xs leading-6 text-slate-500">
                  Käytä tätä vain silloin, kun asennus halutaan laskuttaa omana kokonaisuutenaan eikä sisällyttää rivien yksikköhintaan.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

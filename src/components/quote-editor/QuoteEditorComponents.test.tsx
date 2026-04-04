import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { formatCurrency } from '../../lib/calculations';
import type { Quote } from '../../lib/types';
import AdditionalCostsSection from './AdditionalCostsSection';
import QuoteCompletionChecklist from './QuoteCompletionChecklist';
import QuoteEditorStepper from './QuoteEditorStepper';
import QuoteNotesPanels from './QuoteNotesPanels';
import QuotePricingModeSelector from './QuotePricingModeSelector';

function createQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'quote-1',
    ownerUserId: 'user-1',
    projectId: 'project-1',
    title: 'Kylpyhuonetarjous',
    quoteNumber: 'TAR-1',
    revisionNumber: 1,
    status: 'draft',
    vatPercent: 25.5,
    validUntil: '2026-05-01',
    notes: '',
    internalNotes: '',
    scheduleMilestones: [],
    termsSnapshotContentMd: 'Vakioehdot',
    discountType: 'none',
    discountValue: 0,
    projectCosts: 0,
    deliveryCosts: 0,
    installationCosts: 0,
    travelKilometers: 0,
    travelRatePerKm: 0,
    disposalCosts: 0,
    demolitionCosts: 0,
    protectionCosts: 0,
    permitCosts: 0,
    selectedMarginPercent: 30,
    pricingMode: 'margin',
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    ...overrides,
  };
}

const fieldHelp = {
  projectCosts: 'Projektikulut',
  deliveryCosts: 'Toimituskulut',
  installationCosts: 'Asennuskulut',
  travelKilometers: 'Kilometrit',
  travelRatePerKm: 'Km-hinta',
  travelCosts: 'Ajokulut',
  disposalCosts: 'Jätemaksut',
  demolitionCosts: 'Purkukulut',
  protectionCosts: 'Suojaus',
  permitCosts: 'Luvat',
  notes: 'Asiakasnäkyvät huomiot',
  internalNotes: 'Sisäiset huomiot',
};

describe('quote editor workflow components', () => {
  it('renders the stepper and checklist summaries', () => {
    const markup = renderToStaticMarkup(
      <>
        <QuoteEditorStepper
          activeStep="rows"
          onStepChange={() => undefined}
          steps={[
            { id: 'basics', title: 'Perustiedot', description: 'Tunnisteet', status: 'completed', summary: 'Valmis' },
            { id: 'rows', title: 'Tarjousrivit', description: 'Rivit', status: 'in-progress', summary: '2 laskutettavaa riviä' },
            { id: 'costs', title: 'Lisäkulut', description: 'Valinnainen', status: 'not-started', summary: 'Valinnainen vaihe', optional: true },
            { id: 'finishing', title: 'Ehdot ja huomiot', description: 'Viimeistely', status: 'not-started', summary: 'Ei aloitettu' },
            { id: 'review', title: 'Viimeistely ja lähetys', description: 'Tarkistus', status: 'not-started', summary: 'Ei aloitettu' },
          ]}
        />
        <QuoteCompletionChecklist
          onJumpToStep={() => undefined}
          items={[
            { id: 'rows', stepId: 'rows', label: 'Tarjousrivit', message: 'Tarjouksessa ei ole rivejä.', state: 'missing' },
            { id: 'vat', stepId: 'basics', label: 'ALV-asetus', message: 'ALV 25,5 % on asetettu.', state: 'ok' },
          ]}
        />
      </>
    );

    expect(markup).toContain('Tarjouksen vaiheet');
    expect(markup).toContain('Perustiedot');
    expect(markup).toContain('Tarjousrivit');
    expect(markup).toContain('Valmis lähetykseen?');
    expect(markup).toContain('Tarjouksessa ei ole rivejä.');
  });

  it('renders all pricing workflows with the new selector copy', () => {
    const markup = renderToStaticMarkup(
      <QuotePricingModeSelector value="manual" onChange={() => undefined} canUseMargin={false} />
    );

    expect(markup).toContain('Kateohjattu');
    expect(markup).toContain('Manuaalinen asiakashinta');
    expect(markup).toContain('Rivin kokonaishinta');
    expect(markup).toContain('Syötä asiakkaalle menevä veroton hinta itse.');
    expect(markup).toContain('disabled');
  });

  it('keeps additional costs collapsed by default while still showing active totals', () => {
    const quote = createQuote({
      projectCosts: 100,
      deliveryCosts: 50,
      travelKilometers: 20,
      travelRatePerKm: 1,
    });
    const total = quote.projectCosts + quote.deliveryCosts + (quote.travelKilometers * quote.travelRatePerKm);
    const markup = renderToStaticMarkup(
      <AdditionalCostsSection
        quote={quote}
        total={total}
        travelCosts={20}
        open={false}
        isEditable
        onOpenChange={() => undefined}
        onUpdateQuote={() => undefined}
        fieldHelp={fieldHelp}
        hasPotentialDoubleInstallationCharge={false}
      />
    );

    expect(markup).toContain('Lisäkulut ja työmaan erät');
    expect(markup).toContain('Lisäkulut on eritelty');
    expect(markup).toContain(`Muut projektikulut ${formatCurrency(100)}`);
    expect(markup).toContain(`Toimituskulut ${formatCurrency(50)}`);
    expect(markup).toContain(`Ajokulut ${formatCurrency(20)}`);
    expect(markup).toContain(formatCurrency(total));
  });

  it('separates customer and internal notes with badges and tooltip affordance', () => {
    const markup = renderToStaticMarkup(
      <QuoteNotesPanels
        quote={createQuote({ notes: 'Asiakkaalle', internalNotes: 'Sisäinen' })}
        isEditable
        onUpdateQuote={() => undefined}
        fieldHelp={{ notes: fieldHelp.notes, internalNotes: fieldHelp.internalNotes }}
      />
    );

    expect(markup).toContain('Tarjoushuomautukset');
    expect(markup).toContain('Sisäiset muistiinpanot');
    expect(markup).toContain('Näkyy asiakkaalle');
    expect(markup).toContain('Vain sisäinen');
    expect(markup).toContain('aria-label="Ohje: Huomiot ja rajaukset"');
  });
});
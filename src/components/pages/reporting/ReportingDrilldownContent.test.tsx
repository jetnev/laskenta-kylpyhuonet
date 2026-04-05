import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { QuoteFamilySummary, ReportCustomerSummary, ReportProjectSummary } from '../../../lib/reporting';
import ReportingDrilldownContent from './ReportingDrilldownContent';
import { getReportingDrilldownDescription } from './ReportingDrilldownMeta';

const longQuoteName = 'Erittäin pitkä tarjousnimi joka ei saa rikkoa modaalin sarakerakennetta vaikka se olisi poikkeuksellisen pitkä ja moniosainen';
const longCustomerName = 'Todella pitkä asiakasnimi joka sisältää useita sanoja ja jonka pitää pysyä omassa sarakkeessaan ilman ylivuotoa';
const longOwnerName = 'Poikkeuksellisen pitkä vastuuhenkilön nimi joka ei saa työntää numero- tai badge-sarakkeita rikki';

const family = {
  id: 'family-1',
  latestQuoteTitle: longQuoteName,
  projectName: 'Porrashuoneremontti vaihe 3',
  projectId: 'project-1',
  latestQuoteId: 'quote-1',
  latestQuoteNumber: 'TAR-2026-0001',
  customerName: longCustomerName,
  latestStatus: 'sent',
  latestStatusVariant: 'secondary',
  latestStatusLabel: 'Lähetetty ja odottaa päätöstä',
  latestSubtotal: 128000,
  latestMarginPercent: 19.4,
  marginGapPercent: -4.6,
  belowTargetMargin: true,
  revisionCount: 6,
  ownerLabel: longOwnerName,
  isOpen: true,
  hasOwner: true,
  ageDays: 18,
  expiresInDays: 5,
  actualValue: null,
  primaryDeviationReason: 'Tarjouskate alittaa tavoitteen',
  lastActivityAt: '2026-04-04T10:00:00.000Z',
} as QuoteFamilySummary;

const customer = {
  id: 'customer-1',
  name: longCustomerName,
  ownerLabel: longOwnerName,
  quoteCount: 12,
  totalValue: 99000,
  marginPercent: 21.2,
  acceptanceRatePercent: 55.4,
} as ReportCustomerSummary;

const project = {
  id: 'project-1',
  name: 'Hyvin pitkä projektille annettu nimi joka ei saa mennä muiden sarakkeiden päälle modaalissa',
  ownerLabel: longOwnerName,
  customerName: longCustomerName,
  riskReason: 'Poikkeuksellisen pitkä riskiperuste joka saa näkyä vain hallitusti asiakkaan alla.',
  quoteValue: 145000,
  actualValue: 151200,
  quoteToActualDeltaPercent: -4.1,
  projectStage: 'Toteutus käynnissä pitkällä vaihekuvauksella',
  projectStageVariant: 'outline',
} as ReportProjectSummary;

describe('ReportingDrilldownContent', () => {
  it('renders family drill-downs as lighter action cards with a clear hierarchy and CTA', () => {
    const markup = renderToStaticMarkup(
      <ReportingDrilldownContent
        kind="families"
        title="Tarjouskate alittaa tavoitteen"
        families={[family, family]}
        customers={[]}
        projects={[]}
        onOpenQuote={() => undefined}
      />
    );

    expect(markup).toContain('2 tarjouskohdetta');
    expect(markup).toContain('Avaa tarjous');
    expect(markup.match(/Avaa tarjous/g)).toHaveLength(2);
    expect(markup).toContain('Syy');
    expect(markup).toContain('line-clamp-2');
    expect(markup).toContain('grid grid-cols-2 gap-x-6 gap-y-3');
    expect(markup).toContain('border-t border-border/50 pt-4');
    expect(markup).toContain('rounded-full border-border/70 px-4');
    expect(markup).toContain('rounded-[28px]');
    expect(markup).toContain(longQuoteName);
    expect(markup).toContain(longCustomerName);
    expect(markup).toContain(longOwnerName);
    expect(markup).toContain('Kate jää 4,6 prosenttiyksikköä tavoitteen alle.');
    expect(markup).not.toContain('Miksi näkyy tässä');
  });

  it('handles a single family card without collapsing the layout', () => {
    const markup = renderToStaticMarkup(
      <ReportingDrilldownContent
        kind="family-detail"
        title="TAR-2026-0001"
        families={[family]}
        customers={[]}
        projects={[]}
        onOpenQuote={() => undefined}
      />
    );

    expect(markup).toContain('1 tarjouskohde');
    expect(markup.match(/Avaa tarjous/g)).toHaveLength(1);
    expect(markup).toContain('Tarjouskate alittaa tavoitteen');
  });

  it('keeps customer and project drill-down tables compact with titles for long text', () => {
    const customerMarkup = renderToStaticMarkup(
      <ReportingDrilldownContent kind="customers" families={[]} customers={[customer]} projects={[]} />
    );
    const projectMarkup = renderToStaticMarkup(
      <ReportingDrilldownContent kind="projects" families={[]} customers={[]} projects={[project, project]} />
    );

    expect(customerMarkup).toContain('min-w-[760px]');
    expect(customerMarkup).toContain(longCustomerName);
    expect(projectMarkup).toContain('min-w-[900px]');
    expect(projectMarkup).toContain('Toteutus käynnissä pitkällä vaihekuvauksella');
    expect(projectMarkup).toContain('title="Hyvin pitkä projektille annettu nimi joka ei saa mennä muiden sarakkeiden päälle modaalissa');
  });

  it('describes the action-list strategy for the dialog', () => {
    expect(getReportingDrilldownDescription('families')).toContain('tila, arvo, kate ja vastuuhenkilö');
    expect(getReportingDrilldownDescription('projects')).toContain('projektipoikkeamat, vastuuhenkilöt');
  });
});
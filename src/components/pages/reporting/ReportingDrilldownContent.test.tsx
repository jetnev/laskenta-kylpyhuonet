import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { QuoteFamilySummary, ReportCustomerSummary, ReportProjectSummary } from '../../../lib/reporting';
import ReportingDrilldownContent, { getReportingDrilldownDescription } from './ReportingDrilldownContent';

const longQuoteName = 'Erittäin pitkä tarjousnimi joka ei saa rikkoa modaalin sarakerakennetta vaikka se olisi poikkeuksellisen pitkä ja moniosainen';
const longCustomerName = 'Todella pitkä asiakasnimi joka sisältää useita sanoja ja jonka pitää pysyä omassa sarakkeessaan ilman ylivuotoa';
const longOwnerName = 'Poikkeuksellisen pitkä vastuuhenkilön nimi joka ei saa työntää numero- tai badge-sarakkeita rikki';

const family = {
  id: 'family-1',
  latestQuoteTitle: longQuoteName,
  projectName: 'Porrashuoneremontti vaihe 3',
  latestQuoteNumber: 'TAR-2026-0001',
  customerName: longCustomerName,
  latestStatusVariant: 'secondary',
  latestStatusLabel: 'Lähetetty ja odottaa päätöstä',
  latestSubtotal: 128000,
  latestMarginPercent: 19.4,
  revisionCount: 6,
  ownerLabel: longOwnerName,
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
  it('renders fixed-layout family tables with truncation and compact columns', () => {
    const markup = renderToStaticMarkup(
      <ReportingDrilldownContent kind="families" families={[family, family]} customers={[]} projects={[]} />
    );

    expect(markup).toContain('table-fixed');
    expect(markup).toContain('min-w-[980px]');
    expect(markup).toContain('line-clamp-2');
    expect(markup).toContain(longQuoteName);
    expect(markup).toContain(longOwnerName);
    expect(markup).toContain('inline-flex max-w-full items-center whitespace-nowrap');
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

  it('describes the horizontal-scroll and truncation strategy for the dialog', () => {
    expect(getReportingDrilldownDescription('families')).toContain('vaakasuunnassa');
    expect(getReportingDrilldownDescription('projects')).toContain('euro- tai vaihe-sarakkeet');
  });
});
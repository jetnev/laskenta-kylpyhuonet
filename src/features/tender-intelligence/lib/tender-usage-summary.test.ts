import { describe, expect, it } from 'vitest';

import { buildTenderUsageSummary } from './tender-usage-summary';
import type { TenderUsageEventRow } from '../types/tender-intelligence-db';

function createUsageRow(partial: Partial<TenderUsageEventRow>): TenderUsageEventRow {
  return {
    id: partial.id ?? '11111111-1111-4111-8111-111111111111',
    organization_id: partial.organization_id ?? '22222222-2222-4222-8222-222222222222',
    actor_user_id: partial.actor_user_id ?? '33333333-3333-4333-8333-333333333333',
    tender_package_id: partial.tender_package_id ?? '44444444-4444-4444-8444-444444444444',
    tender_document_id: partial.tender_document_id ?? null,
    tender_analysis_job_id: partial.tender_analysis_job_id ?? null,
    tender_draft_package_id: partial.tender_draft_package_id ?? null,
    event_type: partial.event_type ?? 'tender.package.created',
    event_status: partial.event_status ?? 'success',
    quantity: partial.quantity ?? 1,
    metered_units: partial.metered_units ?? 1,
    metadata: partial.metadata ?? {},
    occurred_at: partial.occurred_at ?? '2026-04-08T10:00:00.000Z',
    created_at: partial.created_at ?? '2026-04-08T10:00:00.000Z',
    updated_at: partial.updated_at ?? '2026-04-08T10:00:00.000Z',
  };
}

describe('buildTenderUsageSummary', () => {
  it('aggregates usage totals by event type and overall totals', () => {
    const rows: TenderUsageEventRow[] = [
      createUsageRow({
        event_type: 'tender.document.uploaded',
        quantity: 1,
        metered_units: 520,
        occurred_at: '2026-04-08T08:00:00.000Z',
      }),
      createUsageRow({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        event_type: 'tender.document.uploaded',
        quantity: 1,
        metered_units: 240,
        occurred_at: '2026-04-08T09:00:00.000Z',
      }),
      createUsageRow({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        event_type: 'tender.analysis.started',
        quantity: 1,
        metered_units: 3,
        occurred_at: '2026-04-08T09:30:00.000Z',
      }),
    ];

    const summary = buildTenderUsageSummary(rows, 30);

    expect(summary.windowDays).toBe(30);
    expect(summary.totalEvents).toBe(3);
    expect(summary.totalQuantity).toBe(3);
    expect(summary.totalMeteredUnits).toBe(763);
    expect(summary.lastEventAt).toBe('2026-04-08T09:30:00.000Z');
    expect(summary.events).toEqual([
      {
        eventType: 'tender.document.uploaded',
        eventCount: 2,
        quantityTotal: 2,
        meteredUnitsTotal: 760,
      },
      {
        eventType: 'tender.analysis.started',
        eventCount: 1,
        quantityTotal: 1,
        meteredUnitsTotal: 3,
      },
    ]);
  });

  it('returns empty summary with normalized window when there are no events', () => {
    const summary = buildTenderUsageSummary([], 0);

    expect(summary.windowDays).toBe(1);
    expect(summary.totalEvents).toBe(0);
    expect(summary.totalQuantity).toBe(0);
    expect(summary.totalMeteredUnits).toBe(0);
    expect(summary.lastEventAt).toBeNull();
    expect(summary.events).toEqual([]);
  });
});

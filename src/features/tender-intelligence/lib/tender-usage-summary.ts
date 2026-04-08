import type { TenderUsageSummary, TenderUsageEventType } from '../types/tender-intelligence';
import { tenderUsageEventTypeSchema } from '../types/tender-intelligence';
import type { TenderUsageEventRow } from '../types/tender-intelligence-db';

const ALL_TENDER_USAGE_EVENT_TYPES = [...tenderUsageEventTypeSchema.options] as TenderUsageEventType[];

export function buildTenderUsageSummary(rows: TenderUsageEventRow[], windowDays: number): TenderUsageSummary {
  const safeWindowDays = Math.max(1, Math.floor(windowDays));
  const byType = new Map<TenderUsageEventType, { eventCount: number; quantityTotal: number; meteredUnitsTotal: number }>();

  for (const row of rows) {
    const previous = byType.get(row.event_type) ?? {
      eventCount: 0,
      quantityTotal: 0,
      meteredUnitsTotal: 0,
    };

    byType.set(row.event_type, {
      eventCount: previous.eventCount + 1,
      quantityTotal: previous.quantityTotal + row.quantity,
      meteredUnitsTotal: previous.meteredUnitsTotal + row.metered_units,
    });
  }

  const events = ALL_TENDER_USAGE_EVENT_TYPES
    .map((eventType) => {
      const aggregate = byType.get(eventType);

      return {
        eventType,
        eventCount: aggregate?.eventCount ?? 0,
        quantityTotal: aggregate?.quantityTotal ?? 0,
        meteredUnitsTotal: aggregate?.meteredUnitsTotal ?? 0,
      };
    })
    .filter((entry) => entry.eventCount > 0)
    .sort((left, right) => {
      if (right.meteredUnitsTotal !== left.meteredUnitsTotal) {
        return right.meteredUnitsTotal - left.meteredUnitsTotal;
      }

      return left.eventType.localeCompare(right.eventType);
    });

  const totals = events.reduce(
    (accumulator, entry) => ({
      totalEvents: accumulator.totalEvents + entry.eventCount,
      totalQuantity: accumulator.totalQuantity + entry.quantityTotal,
      totalMeteredUnits: accumulator.totalMeteredUnits + entry.meteredUnitsTotal,
    }),
    {
      totalEvents: 0,
      totalQuantity: 0,
      totalMeteredUnits: 0,
    },
  );

  const lastEventAt = rows.reduce<string | null>((latest, row) => {
    if (!latest || row.occurred_at > latest) {
      return row.occurred_at;
    }

    return latest;
  }, null);

  return {
    windowDays: safeWindowDays,
    totalEvents: totals.totalEvents,
    totalQuantity: totals.totalQuantity,
    totalMeteredUnits: totals.totalMeteredUnits,
    lastEventAt,
    events,
  };
}

import { describe, expect, it } from 'vitest';
import {
  calculateDaysUntil,
  collectNewDeadlineNotifications,
  collectUpcomingDeadlines,
} from './use-deadline-notifications';
import type { Quote, ScheduleMilestone } from '../lib/types';

const BASE_DATE = new Date(2026, 3, 8, 12, 0, 0, 0);

function offsetIso(days: number) {
  const value = new Date(BASE_DATE);
  value.setDate(value.getDate() + days);
  value.setHours(12, 0, 0, 0);
  return value.toISOString();
}

function makeMilestone(overrides: Partial<ScheduleMilestone> = {}): ScheduleMilestone {
  return {
    id: 'milestone-1',
    title: 'Asennus alkaa',
    type: 'start',
    targetDate: offsetIso(7),
    ...overrides,
  };
}

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'quote-1',
    ownerUserId: 'user-1',
    createdAt: BASE_DATE.toISOString(),
    updatedAt: BASE_DATE.toISOString(),
    projectId: 'project-1',
    title: 'Testitarjous',
    quoteNumber: 'TAR-001',
    revisionNumber: 1,
    status: 'sent',
    vatPercent: 25.5,
    scheduleMilestones: [makeMilestone()],
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
    ...overrides,
  };
}

function getProject(projectId: string) {
  const projects: Record<string, { customerId: string; name: string }> = {
    'project-1': { customerId: 'customer-1', name: 'Kohde A' },
    'project-2': { customerId: 'customer-2', name: 'Kohde B' },
    'project-3': { customerId: 'missing-customer', name: 'Kohde C' },
  };

  return projects[projectId];
}

function getCustomer(customerId: string) {
  const customers: Record<string, { name: string }> = {
    'customer-1': { name: 'Asiakas A' },
    'customer-2': { name: 'Asiakas B' },
  };

  return customers[customerId];
}

describe('calculateDaysUntil', () => {
  it('returns zero for the same day', () => {
    expect(calculateDaysUntil(offsetIso(0), BASE_DATE)).toBe(0);
  });

  it('returns positive days for future dates', () => {
    expect(calculateDaysUntil(offsetIso(1), BASE_DATE)).toBe(1);
    expect(calculateDaysUntil(offsetIso(7), BASE_DATE)).toBe(7);
  });

  it('returns negative days for past dates', () => {
    expect(calculateDaysUntil(offsetIso(-1), BASE_DATE)).toBe(-1);
  });
});

describe('collectNewDeadlineNotifications', () => {
  it('collects only notifyable upcoming milestones for non-draft quotes', () => {
    const quotes = [
      makeQuote({
        id: 'quote-sent',
        scheduleMilestones: [
          makeMilestone({ id: 'm-7', targetDate: offsetIso(7) }),
          makeMilestone({ id: 'm-5', targetDate: offsetIso(5) }),
        ],
      }),
      makeQuote({
        id: 'quote-draft',
        status: 'draft',
        scheduleMilestones: [makeMilestone({ id: 'm-draft', targetDate: offsetIso(7) })],
      }),
    ];

    const notifications = collectNewDeadlineNotifications({
      quotes,
      getProject,
      getCustomer,
      notifiedDeadlines: [],
      notifyDaysBefore: [7, 3, 1],
      currentDate: BASE_DATE,
      nowIso: BASE_DATE.toISOString(),
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].id).toBe('quote-sent-m-7-7');
    expect(notifications[0].projectName).toBe('Kohde A');
    expect(notifications[0].customerName).toBe('Asiakas A');
  });

  it('does not create duplicates for already notified milestones', () => {
    const quotes = [makeQuote({ id: 'quote-1', scheduleMilestones: [makeMilestone({ id: 'm-1', targetDate: offsetIso(3) })] })];

    const notifications = collectNewDeadlineNotifications({
      quotes,
      getProject,
      getCustomer,
      notifiedDeadlines: [
        {
          id: 'quote-1-m-1-3',
          quoteId: 'quote-1',
          projectId: 'project-1',
          milestoneId: 'm-1',
          milestoneName: 'Asennus alkaa',
          targetDate: offsetIso(3),
          daysUntil: 3,
          projectName: 'Kohde A',
          customerName: 'Asiakas A',
          notifiedAt: BASE_DATE.toISOString(),
        },
      ],
      notifyDaysBefore: [3],
      currentDate: BASE_DATE,
    });

    expect(notifications).toEqual([]);
  });

  it('falls back to the milestone type and missing customer label when needed', () => {
    const quotes = [
      makeQuote({
        id: 'quote-2',
        projectId: 'project-3',
        scheduleMilestones: [makeMilestone({ id: 'm-2', title: '', type: 'delivery', targetDate: offsetIso(1) })],
      }),
    ];

    const notifications = collectNewDeadlineNotifications({
      quotes,
      getProject,
      getCustomer,
      notifiedDeadlines: [],
      notifyDaysBefore: [1],
      currentDate: BASE_DATE,
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].milestoneName).toBe('delivery');
    expect(notifications[0].customerName).toBe('Ei asiakasta');
  });

  it('skips past milestones and quotes whose project cannot be resolved', () => {
    const quotes = [
      makeQuote({
        id: 'quote-past',
        scheduleMilestones: [makeMilestone({ id: 'm-past', targetDate: offsetIso(-1) })],
      }),
      makeQuote({
        id: 'quote-no-project',
        projectId: 'missing-project',
        scheduleMilestones: [makeMilestone({ id: 'm-future', targetDate: offsetIso(7) })],
      }),
    ];

    const notifications = collectNewDeadlineNotifications({
      quotes,
      getProject,
      getCustomer,
      notifiedDeadlines: [],
      notifyDaysBefore: [7, 1],
      currentDate: BASE_DATE,
    });

    expect(notifications).toEqual([]);
  });
});

describe('collectUpcomingDeadlines', () => {
  it('returns upcoming milestones sorted by nearest first', () => {
    const quotes = [
      makeQuote({
        id: 'quote-a',
        scheduleMilestones: [
          makeMilestone({ id: 'm-10', targetDate: offsetIso(10) }),
          makeMilestone({ id: 'm-2', targetDate: offsetIso(2) }),
        ],
      }),
      makeQuote({
        id: 'quote-b',
        projectId: 'project-2',
        scheduleMilestones: [makeMilestone({ id: 'm-0', targetDate: offsetIso(0) })],
      }),
    ];

    const upcoming = collectUpcomingDeadlines({
      quotes,
      getProject,
      getCustomer,
      currentDate: BASE_DATE,
    });

    expect(upcoming.map((item) => item.daysUntil)).toEqual([0, 2, 10]);
    expect(upcoming.map((item) => item.projectName)).toEqual(['Kohde B', 'Kohde A', 'Kohde A']);
  });

  it('excludes past, over-30-day, draft and rejected milestones', () => {
    const quotes = [
      makeQuote({ id: 'quote-valid', scheduleMilestones: [makeMilestone({ id: 'm-valid', targetDate: offsetIso(30) })] }),
      makeQuote({ id: 'quote-past', scheduleMilestones: [makeMilestone({ id: 'm-past', targetDate: offsetIso(-1) })] }),
      makeQuote({ id: 'quote-far', scheduleMilestones: [makeMilestone({ id: 'm-far', targetDate: offsetIso(31) })] }),
      makeQuote({ id: 'quote-draft', status: 'draft', scheduleMilestones: [makeMilestone({ id: 'm-draft', targetDate: offsetIso(1) })] }),
      makeQuote({ id: 'quote-rejected', status: 'rejected', scheduleMilestones: [makeMilestone({ id: 'm-rejected', targetDate: offsetIso(1) })] }),
    ];

    const upcoming = collectUpcomingDeadlines({
      quotes,
      getProject,
      getCustomer,
      currentDate: BASE_DATE,
    });

    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].id).toBe('quote-valid-m-valid');
    expect(upcoming[0].daysUntil).toBe(30);
  });
});
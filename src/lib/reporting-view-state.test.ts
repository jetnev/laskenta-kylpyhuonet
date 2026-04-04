import { describe, expect, it } from 'vitest';
import type { ReportingModel } from './reporting';
import { selectReportingViewState } from './reporting-view-state';

const baseModel = {
  meta: {
    hasQuotes: true,
    filteredFamilies: 1,
  },
  families: [],
  customers: [],
  projects: [],
  products: [],
  kpis: {
    openQuoteBookValue: 0,
    averageMarginPercent: 0,
    acceptanceRatePercent: 0,
  },
  statusSummary: [],
} as unknown as ReportingModel;

describe('selectReportingViewState', () => {
  it('stays in initial loading before any complete reporting model exists', () => {
    const viewState = selectReportingViewState({
      datasetsLoaded: false,
      liveModel: baseModel,
      stableModel: null,
    });

    expect(viewState.model).toBeNull();
    expect(viewState.hasLoadedOnce).toBe(false);
    expect(viewState.isInitialLoading).toBe(true);
    expect(viewState.isRefreshing).toBe(false);
  });

  it('keeps the last rendered reporting model visible during background refresh', () => {
    const stableModel = {
      ...baseModel,
      customers: [{ id: 'customer-1' }],
    } as unknown as ReportingModel;

    const liveModel = {
      ...baseModel,
      customers: [],
    } as unknown as ReportingModel;

    const viewState = selectReportingViewState({
      datasetsLoaded: false,
      liveModel,
      stableModel,
    });

    expect(viewState.model).toBe(stableModel);
    expect(viewState.hasLoadedOnce).toBe(true);
    expect(viewState.isInitialLoading).toBe(false);
    expect(viewState.isRefreshing).toBe(true);
  });

  it('switches to the live model once all reporting datasets are loaded', () => {
    const stableModel = {
      ...baseModel,
      customers: [{ id: 'old-customer' }],
    } as unknown as ReportingModel;

    const liveModel = {
      ...baseModel,
      customers: [{ id: 'new-customer' }],
    } as unknown as ReportingModel;

    const viewState = selectReportingViewState({
      datasetsLoaded: true,
      liveModel,
      stableModel,
    });

    expect(viewState.model).toBe(liveModel);
    expect(viewState.hasLoadedOnce).toBe(true);
    expect(viewState.isInitialLoading).toBe(false);
    expect(viewState.isRefreshing).toBe(false);
  });
});
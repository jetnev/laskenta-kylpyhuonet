import type { ReportingModel } from './reporting';

export interface ReportingViewState {
  model: ReportingModel | null;
  hasLoadedOnce: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
}

export function selectReportingViewState({
  datasetsLoaded,
  liveModel,
  stableModel,
}: {
  datasetsLoaded: boolean;
  liveModel: ReportingModel;
  stableModel: ReportingModel | null;
}): ReportingViewState {
  if (datasetsLoaded) {
    return {
      model: liveModel,
      hasLoadedOnce: true,
      isInitialLoading: false,
      isRefreshing: false,
    };
  }

  if (stableModel) {
    return {
      model: stableModel,
      hasLoadedOnce: true,
      isInitialLoading: false,
      isRefreshing: true,
    };
  }

  return {
    model: null,
    hasLoadedOnce: false,
    isInitialLoading: true,
    isRefreshing: false,
  };
}
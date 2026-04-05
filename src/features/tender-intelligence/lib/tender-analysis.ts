import type { TenderAnalysisJob, TenderAnalysisJobStatus } from '../types/tender-intelligence';

export interface TenderAnalysisStartState {
  canStart: boolean;
  reason: string | null;
}

export function isTenderAnalysisJobActive(status: TenderAnalysisJobStatus) {
  return status === 'pending' || status === 'queued' || status === 'running';
}

export function getTenderAnalysisStartState(input: {
  documentCount: number;
  latestAnalysisJob?: TenderAnalysisJob | null;
}): TenderAnalysisStartState {
  if (input.documentCount < 1) {
    return {
      canStart: false,
      reason: 'Lisää pakettiin vähintään yksi dokumentti ennen analyysin käynnistämistä.',
    };
  }

  if (input.latestAnalysisJob && isTenderAnalysisJobActive(input.latestAnalysisJob.status)) {
    return {
      canStart: false,
      reason: 'Paketille on jo käynnissä analyysiajo. Odota nykyisen ajon valmistumista.',
    };
  }

  return {
    canStart: true,
    reason: null,
  };
}

export function getLatestSuccessfulTenderAnalysisJob(jobs: TenderAnalysisJob[]) {
  return [...jobs]
    .filter((job) => job.status === 'completed')
    .sort((left, right) => {
      const leftTimestamp = new Date(left.completedAt ?? left.requestedAt).getTime();
      const rightTimestamp = new Date(right.completedAt ?? right.requestedAt).getTime();
      return rightTimestamp - leftTimestamp;
    })[0] ?? null;
}
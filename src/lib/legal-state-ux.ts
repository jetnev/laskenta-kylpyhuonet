export interface LegalAcceptanceSubject {
  id: string;
  organizationRole?: string | null;
}

export function getLegalAcceptanceSubjectKey(subject: LegalAcceptanceSubject | null): string | null {
  if (!subject) {
    return null;
  }

  return `${subject.id}:${subject.organizationRole ?? ''}`;
}

export function shouldBlockAppForLegalState(params: {
  hasResolvedState: boolean;
  loading: boolean;
  error: string | null;
}) {
  if (params.hasResolvedState) {
    return false;
  }

  return params.loading || Boolean(params.error);
}

export function sanitizeLegalLoadError(error: unknown): string {
  if (error instanceof Error) {
    return error.message || 'Sopimusasiakirjojen tarkistus epäonnistui.';
  }
  return 'Sopimusasiakirjojen tarkistus epäonnistui.';
}
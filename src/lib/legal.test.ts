import { describe, expect, it } from 'vitest';
import {
  buildCurrentStateLegalDocumentTemplate,
  buildSignupLegalAcceptanceBundle,
  evaluateLegalAcceptanceState,
  findLegalDocumentPlaceholders,
  getRequiredLegalDocuments,
  resolveLegalDocumentTypeFromPath,
  suggestNextLegalVersionLabel,
} from './legal';
import type { LegalDocumentAcceptanceRow, LegalDocumentVersionRow } from './supabase';

function createDocument(overrides: Partial<LegalDocumentVersionRow> = {}): LegalDocumentVersionRow {
  return {
    id: overrides.id || 'doc-1',
    document_type: overrides.document_type || 'terms',
    title: overrides.title || 'Käyttöehdot',
    version_label: overrides.version_label || '1.0.0',
    effective_at: overrides.effective_at || '2025-01-01T00:00:00.000Z',
    status: overrides.status || 'active',
    acceptance_requirement: overrides.acceptance_requirement || 'all-users',
    requires_reacceptance: overrides.requires_reacceptance ?? true,
    change_summary: overrides.change_summary ?? null,
    locale: overrides.locale || 'fi-FI',
    content_md: overrides.content_md || '# Otsikko',
    content_hash: overrides.content_hash || 'hash-1',
    created_by_user_id: overrides.created_by_user_id ?? null,
    updated_by_user_id: overrides.updated_by_user_id ?? null,
    created_at: overrides.created_at || '2025-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at || '2025-01-01T00:00:00.000Z',
    published_at: overrides.published_at || '2025-01-01T00:00:00.000Z',
  };
}

function createAcceptance(overrides: Partial<LegalDocumentAcceptanceRow> = {}): LegalDocumentAcceptanceRow {
  return {
    id: overrides.id || 'acc-1',
    document_version_id: overrides.document_version_id || 'doc-1',
    document_type: overrides.document_type || 'terms',
    version_label: overrides.version_label || '1.0.0',
    content_hash: overrides.content_hash || 'hash-1',
    user_id: overrides.user_id || 'user-1',
    organization_id: overrides.organization_id ?? 'org-1',
    accepted_at: overrides.accepted_at || '2025-01-02T00:00:00.000Z',
    ip_address: overrides.ip_address ?? null,
    user_agent: overrides.user_agent ?? 'Vitest',
    acceptance_source: overrides.acceptance_source || 'signup',
    locale: overrides.locale ?? 'fi-FI',
    accepted_on_behalf_of_organization: overrides.accepted_on_behalf_of_organization ?? false,
  };
}

describe('resolveLegalDocumentTypeFromPath', () => {
  it('resolves public legal routes and aliases', () => {
    expect(resolveLegalDocumentTypeFromPath('/kayttoehdot')).toBe('terms');
    expect(resolveLegalDocumentTypeFromPath('/tietosuoja/')).toBe('privacy');
    expect(resolveLegalDocumentTypeFromPath('/dpa')).toBe('dpa');
    expect(resolveLegalDocumentTypeFromPath('/tuntematon')).toBeNull();
  });
});

describe('buildCurrentStateLegalDocumentTemplate', () => {
  it('returns current-state legal content aligned to Projekta runtime facts', () => {
    const terms = buildCurrentStateLegalDocumentTemplate('terms');
    const privacy = buildCurrentStateLegalDocumentTemplate('privacy');
    const dpa = buildCurrentStateLegalDocumentTemplate('dpa');
    const cookies = buildCurrentStateLegalDocumentTemplate('cookies');

    expect(terms.contentMd).toContain('Jetnev Oy');
    expect(terms.contentMd).toContain('Tarjousäly');
    expect(privacy.contentMd).toContain('Supabase');
    expect(privacy.contentMd).toContain('Cloudflare');
    expect(dpa.acceptanceRequirement).toBe('organization-owner');
    expect(cookies.acceptanceRequirement).toBe('none');
  });
});

describe('findLegalDocumentPlaceholders', () => {
  it('returns unique placeholder markers from markdown content', () => {
    expect(findLegalDocumentPlaceholders('A [PLACEHOLDER_ONE] and [PLACEHOLDER_ONE] plus [PLACEHOLDER_TWO].')).toEqual([
      '[PLACEHOLDER_ONE]',
      '[PLACEHOLDER_TWO]',
    ]);
  });
});

describe('getRequiredLegalDocuments', () => {
  const activeDocuments = [
    createDocument({ id: 'terms-v1', document_type: 'terms', acceptance_requirement: 'all-users' }),
    createDocument({ id: 'privacy-v1', document_type: 'privacy', acceptance_requirement: 'all-users' }),
    createDocument({ id: 'dpa-v1', document_type: 'dpa', acceptance_requirement: 'organization-owner' }),
    createDocument({ id: 'cookies-v1', document_type: 'cookies', acceptance_requirement: 'none' }),
  ];

  it('returns owner-required and all-user documents for the organization owner', () => {
    expect(getRequiredLegalDocuments(activeDocuments, { organizationRole: 'owner' }).map((document) => document.id)).toEqual([
      'terms-v1',
      'privacy-v1',
      'dpa-v1',
    ]);
  });

  it('excludes organization-owner documents and cookie info for employees', () => {
    expect(getRequiredLegalDocuments(activeDocuments, { organizationRole: 'employee' }).map((document) => document.id)).toEqual([
      'terms-v1',
      'privacy-v1',
    ]);
  });
});

describe('buildSignupLegalAcceptanceBundle', () => {
  const signupDocuments = [
    createDocument({ id: 'terms-v1', document_type: 'terms', acceptance_requirement: 'all-users' }),
    createDocument({ id: 'privacy-v1', document_type: 'privacy', acceptance_requirement: 'all-users' }),
    createDocument({ id: 'dpa-v1', document_type: 'dpa', acceptance_requirement: 'organization-owner' }),
    createDocument({ id: 'cookies-v1', document_type: 'cookies', acceptance_requirement: 'none' }),
  ];

  it('includes all required owner documents but excludes cookie info from signup acceptance', () => {
    const bundle = buildSignupLegalAcceptanceBundle(signupDocuments, {
      acceptedTermsAndPrivacy: true,
      authorityConfirmed: true,
      acceptedAt: '2025-02-01T12:00:00.000Z',
      locale: 'fi-FI',
      userAgent: 'Vitest Browser',
    });

    expect(bundle).toEqual({
      accepted_document_version_ids: ['terms-v1', 'privacy-v1', 'dpa-v1'],
      accepted_at: '2025-02-01T12:00:00.000Z',
      locale: 'fi-FI',
      user_agent: 'Vitest Browser',
      authority_confirmed: true,
    });
  });

  it('rejects signup when terms and privacy have not been acknowledged', () => {
    expect(() =>
      buildSignupLegalAcceptanceBundle(signupDocuments, {
        acceptedTermsAndPrivacy: false,
        authorityConfirmed: true,
      })
    ).toThrow('Hyväksy käyttöehdot ja vahvista lukeneesi tietosuojaselosteen.');
  });

  it('rejects signup when owner authority has not been confirmed', () => {
    expect(() =>
      buildSignupLegalAcceptanceBundle(signupDocuments, {
        acceptedTermsAndPrivacy: true,
        authorityConfirmed: false,
      })
    ).toThrow('Vahvista oikeutesi hyväksyä ehdot organisaation puolesta.');
  });

  it('rejects signup when no active legal documents are available', () => {
    expect(() =>
      buildSignupLegalAcceptanceBundle([], {
        acceptedTermsAndPrivacy: true,
        authorityConfirmed: true,
      })
    ).toThrow('Rekisteröityminen ei ole käytettävissä ilman julkaistuja sopimusasiakirjoja.');
  });
});

describe('evaluateLegalAcceptanceState', () => {
  it('does not block use when the current required versions have already been accepted', () => {
    const activeDocuments = [
      createDocument({ id: 'terms-v1', document_type: 'terms', requires_reacceptance: true }),
      createDocument({ id: 'privacy-v1', document_type: 'privacy', requires_reacceptance: true }),
    ];
    const acceptances = [
      createAcceptance({ id: 'acc-terms-v1', document_version_id: 'terms-v1', document_type: 'terms' }),
      createAcceptance({ id: 'acc-privacy-v1', document_version_id: 'privacy-v1', document_type: 'privacy' }),
    ];

    const state = evaluateLegalAcceptanceState(activeDocuments, acceptances, {
      organizationRole: 'employee',
    });

    expect(state.requires_blocking_acceptance).toBe(false);
    expect(state.pending_documents).toEqual([]);
    expect(state.pending_source).toBeNull();
  });

  it('blocks an invited employee on first login until missing required documents are accepted', () => {
    const activeDocuments = [
      createDocument({ id: 'terms-v1', document_type: 'terms' }),
      createDocument({ id: 'privacy-v1', document_type: 'privacy' }),
    ];

    const state = evaluateLegalAcceptanceState(activeDocuments, [], {
      organizationRole: 'employee',
    });

    expect(state.requires_blocking_acceptance).toBe(true);
    expect(state.pending_documents.map((document) => document.id)).toEqual(['terms-v1', 'privacy-v1']);
    expect(state.pending_source).toBe('invited-user-first-login');
  });

  it('blocks an owner on first login until the DPA has also been accepted', () => {
    const activeDocuments = [
      createDocument({ id: 'terms-v1', document_type: 'terms' }),
      createDocument({ id: 'privacy-v1', document_type: 'privacy' }),
      createDocument({
        id: 'dpa-v1',
        document_type: 'dpa',
        acceptance_requirement: 'organization-owner',
      }),
    ];
    const acceptances = [
      createAcceptance({ id: 'acc-terms-v1', document_version_id: 'terms-v1', document_type: 'terms' }),
      createAcceptance({ id: 'acc-privacy-v1', document_version_id: 'privacy-v1', document_type: 'privacy' }),
    ];

    const state = evaluateLegalAcceptanceState(activeDocuments, acceptances, {
      organizationRole: 'owner',
    });

    expect(state.requires_blocking_acceptance).toBe(true);
    expect(state.pending_documents.map((document) => document.id)).toEqual(['dpa-v1']);
    expect(state.pending_source).toBe('invited-user-first-login');
  });

  it('requires reacceptance when a new active version is marked as materially changed', () => {
    const activeDocuments = [
      createDocument({ id: 'terms-v2', document_type: 'terms', version_label: '2.0.0', content_hash: 'hash-2' }),
    ];
    const acceptances = [
      createAcceptance({
        id: 'acc-terms-v1',
        document_version_id: 'terms-v1',
        document_type: 'terms',
        version_label: '1.0.0',
        content_hash: 'hash-1',
        accepted_at: '2025-01-10T00:00:00.000Z',
      }),
    ];

    const state = evaluateLegalAcceptanceState(activeDocuments, acceptances, {
      organizationRole: 'employee',
    });

    expect(state.requires_blocking_acceptance).toBe(true);
    expect(state.pending_documents.map((document) => document.id)).toEqual(['terms-v2']);
    expect(state.pending_source).toBe('reacceptance');
  });

  it('does not require reacceptance when the new active version is non-material', () => {
    const activeDocuments = [
      createDocument({
        id: 'privacy-v2',
        document_type: 'privacy',
        version_label: '2.0.0',
        content_hash: 'hash-2',
        requires_reacceptance: false,
      }),
    ];
    const acceptances = [
      createAcceptance({
        id: 'acc-privacy-v1',
        document_version_id: 'privacy-v1',
        document_type: 'privacy',
        version_label: '1.0.0',
        content_hash: 'hash-1',
      }),
    ];

    const state = evaluateLegalAcceptanceState(activeDocuments, acceptances, {
      organizationRole: 'employee',
    });

    expect(state.requires_blocking_acceptance).toBe(false);
    expect(state.pending_documents).toEqual([]);
    expect(state.latest_acceptance_by_type.privacy?.version_label).toBe('1.0.0');
  });

  it('tracks the latest acceptance per document type when multiple audit rows exist', () => {
    const activeDocuments = [createDocument({ id: 'terms-v2', document_type: 'terms' })];
    const acceptances = [
      createAcceptance({
        id: 'acc-old',
        document_version_id: 'terms-v1',
        document_type: 'terms',
        version_label: '1.0.0',
        accepted_at: '2025-01-01T00:00:00.000Z',
      }),
      createAcceptance({
        id: 'acc-new',
        document_version_id: 'terms-v2',
        document_type: 'terms',
        version_label: '2.0.0',
        accepted_at: '2025-02-01T00:00:00.000Z',
      }),
    ];

    const state = evaluateLegalAcceptanceState(activeDocuments, acceptances, {
      organizationRole: 'employee',
    });

    expect(state.latest_acceptance_by_type.terms?.id).toBe('acc-new');
    expect(state.required_documents[0]?.accepted_current_version).toBe(true);
  });
});

describe('suggestNextLegalVersionLabel', () => {
  it('increments semantic-looking version labels and preserves numeric padding', () => {
    expect(suggestNextLegalVersionLabel('1.0.9')).toBe('1.0.10');
    expect(suggestNextLegalVersionLabel('v009')).toBe('v010');
    expect(suggestNextLegalVersionLabel(undefined)).toBe('1.0.0');
  });
});

describe('post-login legal acceptance state — all accepted', () => {
  it('does not block the app when the logged-in user has accepted all required documents', () => {
    const activeDocuments = [
      createDocument({ id: 'terms-v1', document_type: 'terms', acceptance_requirement: 'all-users' }),
      createDocument({ id: 'privacy-v1', document_type: 'privacy', acceptance_requirement: 'all-users' }),
      createDocument({ id: 'dpa-v1', document_type: 'dpa', acceptance_requirement: 'organization-owner' }),
    ];
    const acceptances = [
      createAcceptance({ id: 'acc-1', document_version_id: 'terms-v1', document_type: 'terms' }),
      createAcceptance({ id: 'acc-2', document_version_id: 'privacy-v1', document_type: 'privacy' }),
      createAcceptance({ id: 'acc-3', document_version_id: 'dpa-v1', document_type: 'dpa' }),
    ];

    const state = evaluateLegalAcceptanceState(activeDocuments, acceptances, {
      organizationRole: 'owner',
    });

    expect(state.requires_blocking_acceptance).toBe(false);
    expect(state.pending_documents).toHaveLength(0);
  });
});

describe('post-login legal acceptance state — new user with no acceptances', () => {
  it('blocks the app and reports invited-user-first-login when no acceptances exist', () => {
    const activeDocuments = [
      createDocument({ id: 'terms-v1', document_type: 'terms', acceptance_requirement: 'all-users' }),
      createDocument({ id: 'privacy-v1', document_type: 'privacy', acceptance_requirement: 'all-users' }),
    ];

    const state = evaluateLegalAcceptanceState(activeDocuments, [], {
      organizationRole: 'employee',
    });

    expect(state.requires_blocking_acceptance).toBe(true);
    expect(state.pending_documents).toHaveLength(2);
    expect(state.pending_source).toBe('invited-user-first-login');
  });
});

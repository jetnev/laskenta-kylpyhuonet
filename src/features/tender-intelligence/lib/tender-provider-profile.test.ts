import { describe, expect, it } from 'vitest';

import { buildTenderProviderProfileReadiness } from './tender-provider-profile';
import type { TenderProviderProfileDetails } from '../types/tender-intelligence';

function createProfile(overrides?: Partial<TenderProviderProfileDetails>): TenderProviderProfileDetails {
  return {
    profile: {
      id: 'provider-profile-1',
      organizationId: 'organization-1',
      companyName: 'Kylpyhuone Oy',
      businessId: '1234567-8',
      websiteUrl: 'https://example.com',
      headquarters: 'Helsinki',
      summary: 'Erikoistunut vaativiin märkätilahankkeisiin.',
      serviceArea: 'Uusimaa',
      maxTravelKm: 150,
      deliveryScope: 'regional',
      createdByUserId: 'user-1',
      createdAt: '2026-04-13T08:00:00.000Z',
      updatedAt: '2026-04-13T08:00:00.000Z',
    },
    contacts: [
      {
        id: 'contact-1',
        profileId: 'provider-profile-1',
        organizationId: 'organization-1',
        fullName: 'Aino Tarjoaja',
        roleTitle: 'Tarjouspäällikkö',
        email: 'aino@example.com',
        phone: '0401234567',
        isPrimary: true,
        createdAt: '2026-04-13T08:00:00.000Z',
        updatedAt: '2026-04-13T08:00:00.000Z',
      },
    ],
    credentials: [
      {
        id: 'credential-1',
        profileId: 'provider-profile-1',
        organizationId: 'organization-1',
        title: 'RALA-pätevyys',
        issuer: 'RALA',
        credentialType: 'qualification',
        validUntil: '2027-01-01T00:00:00.000Z',
        documentReference: 'SharePoint/rala.pdf',
        notes: null,
        createdAt: '2026-04-13T08:00:00.000Z',
        updatedAt: '2026-04-13T08:00:00.000Z',
      },
    ],
    constraints: [],
    documents: [
      {
        id: 'document-1',
        profileId: 'provider-profile-1',
        organizationId: 'organization-1',
        title: 'Vastuuvakuutus 2026',
        documentType: 'insurance',
        sourceReference: 'Drive/vakuutus.pdf',
        notes: null,
        createdAt: '2026-04-13T08:00:00.000Z',
        updatedAt: '2026-04-13T08:00:00.000Z',
      },
    ],
    responseTemplates: [
      {
        id: 'template-1',
        profileId: 'provider-profile-1',
        organizationId: 'organization-1',
        title: 'Yritysesittely',
        templateType: 'company-overview',
        contentMd: 'Kylpyhuone Oy toimii...',
        createdAt: '2026-04-13T08:00:00.000Z',
        updatedAt: '2026-04-13T08:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('buildTenderProviderProfileReadiness', () => {
  it('returns empty readiness when profile does not exist', () => {
    const readiness = buildTenderProviderProfileReadiness(null);

    expect(readiness.state).toBe('empty');
    expect(readiness.counts.contacts).toBe(0);
    expect(readiness.nextActions.length).toBeGreaterThan(0);
  });

  it('returns ready when core provider profile ingredients are present', () => {
    const readiness = buildTenderProviderProfileReadiness(createProfile(), new Date('2026-04-13T12:00:00.000Z'));

    expect(readiness.state).toBe('ready');
    expect(readiness.counts.primaryContacts).toBe(1);
    expect(readiness.counts.activeCredentials).toBe(1);
  });

  it('returns partial when a key ingredient is missing', () => {
    const readiness = buildTenderProviderProfileReadiness(
      createProfile({
        responseTemplates: [],
      }),
      new Date('2026-04-13T12:00:00.000Z'),
    );

    expect(readiness.state).toBe('partial');
    expect(readiness.nextActions).toContain('Tallenna ainakin yksi vastauspohja toistuvia tarjousvastauksia varten.');
  });
});
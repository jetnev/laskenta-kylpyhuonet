import { describe, expect, it } from 'vitest';
import { deriveAccessState } from './access-control';

describe('deriveAccessState', () => {
  it('gives platform admin full management rights', () => {
    expect(
      deriveAccessState({
        platformRole: 'admin',
        organizationRole: 'employee',
        status: 'active',
      })
    ).toMatchObject({
      isPlatformAdmin: true,
      canManageUsers: true,
      canManageSharedData: true,
      roleLabel: 'Pääkäyttäjä',
    });
  });

  it('gives organization owner company management rights without admin role', () => {
    expect(
      deriveAccessState({
        platformRole: 'user',
        organizationRole: 'owner',
        status: 'active',
      })
    ).toMatchObject({
      isPlatformAdmin: false,
      isOrganizationOwner: true,
      canManageUsers: true,
      canManageSharedData: true,
      roleLabel: 'Omistaja',
    });
  });

  it('keeps employee rights narrower than owner rights', () => {
    expect(
      deriveAccessState({
        platformRole: 'user',
        organizationRole: 'employee',
        status: 'active',
      })
    ).toMatchObject({
      canEdit: true,
      canDelete: true,
      canManageUsers: false,
      canManageSharedData: false,
      roleLabel: 'Työntekijä',
    });
  });

  it('removes edit rights from disabled users', () => {
    expect(
      deriveAccessState({
        platformRole: 'user',
        organizationRole: 'owner',
        status: 'disabled',
      })
    ).toMatchObject({
      canEdit: false,
      canDelete: false,
      canManageUsers: false,
      canManageSharedData: false,
    });
  });
});
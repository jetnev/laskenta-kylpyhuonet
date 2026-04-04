import { describe, expect, it } from 'vitest';
import { mergeVisibleUsers, type AuthUser } from './use-auth';

function makeUser(id: string, displayName: string): AuthUser {
  return {
    id,
    email: `${id}@example.com`,
    displayName,
    role: 'user',
    organizationId: 'org-1',
    organizationRole: 'employee',
    organizationName: 'Testiorganisaatio',
    initials: displayName.slice(0, 2).toUpperCase(),
    createdAt: '2024-01-01T00:00:00.000Z',
    status: 'active',
  };
}

describe('mergeVisibleUsers', () => {
  it('keeps other visible users while refreshing the current session user', () => {
    const currentUser = makeUser('user-1', 'Nykyinen Kayttaja');
    const colleague = makeUser('user-2', 'Kollega');
    const refreshedCurrentUser = {
      ...currentUser,
      displayName: 'Nykyinen Kayttaja Paivitetty',
      lastLoginAt: '2024-02-01T12:00:00.000Z',
    };

    const merged = mergeVisibleUsers([currentUser, colleague], refreshedCurrentUser);

    expect(merged).toEqual([refreshedCurrentUser, colleague]);
  });

  it('falls back to the session user when there is no prior visible directory', () => {
    const currentUser = makeUser('user-1', 'Nykyinen Kayttaja');

    expect(mergeVisibleUsers([], currentUser)).toEqual([currentUser]);
  });

  it('falls back to the session user when the previous visible directory does not contain that user', () => {
    const currentUser = makeUser('user-1', 'Nykyinen Kayttaja');
    const otherUser = makeUser('user-2', 'Kollega');

    expect(mergeVisibleUsers([otherUser], currentUser)).toEqual([currentUser]);
  });
});
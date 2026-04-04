import { describe, expect, it } from 'vitest';

import {
  AUTH_CALLBACK_PATH,
  buildAuthRedirectUrl,
  buildCleanAuthCallbackUrl,
  isAuthCallbackPath,
  normalizeAuthOtpType,
  parseAuthCallbackUrl,
} from './auth-callback';

describe('buildAuthRedirectUrl', () => {
  it('rewrites the root redirect to the dedicated auth callback route', () => {
    expect(
      buildAuthRedirectUrl({
        configuredUrl: 'https://laskenta.example.com',
        currentOrigin: 'https://laskenta.example.com',
      })
    ).toBe(`https://laskenta.example.com${AUTH_CALLBACK_PATH}`);
  });

  it('rewrites the legacy login redirect to the dedicated auth callback route', () => {
    expect(
      buildAuthRedirectUrl({
        configuredUrl: 'https://laskenta.example.com/login',
        currentOrigin: 'https://laskenta.example.com',
      })
    ).toBe(`https://laskenta.example.com${AUTH_CALLBACK_PATH}`);
  });

  it('keeps an explicit callback path intact', () => {
    expect(
      buildAuthRedirectUrl({
        configuredUrl: 'https://laskenta.example.com/auth/custom-callback',
        currentOrigin: 'https://laskenta.example.com',
      })
    ).toBe('https://laskenta.example.com/auth/custom-callback');
  });
});

describe('parseAuthCallbackUrl', () => {
  it('parses an implicit flow callback from the URL hash', () => {
    const parsed = parseAuthCallbackUrl(
      'https://laskenta.example.com/auth/callback#access_token=token-1&refresh_token=refresh-1&type=recovery'
    );

    expect(parsed).toMatchObject({
      accessToken: 'token-1',
      refreshToken: 'refresh-1',
      type: 'recovery',
      normalizedType: 'recovery',
      hasAuthPayload: true,
    });
  });

  it('parses token-hash callbacks and normalizes deprecated signup types', () => {
    const parsed = parseAuthCallbackUrl(
      'https://laskenta.example.com/auth/callback?token_hash=hash-1&type=signup'
    );

    expect(parsed).toMatchObject({
      tokenHash: 'hash-1',
      type: 'signup',
      normalizedType: 'email',
      hasAuthPayload: true,
    });
  });
});

describe('buildCleanAuthCallbackUrl', () => {
  it('strips auth parameters from both the query string and hash fragment', () => {
    expect(
      buildCleanAuthCallbackUrl(
        'https://laskenta.example.com/auth/callback?code=abc&foo=bar#access_token=token&refresh_token=refresh&tab=reset'
      )
    ).toBe('https://laskenta.example.com/auth/callback?foo=bar#tab=reset');
  });
});

describe('auth callback helpers', () => {
  it('matches the public auth callback route with or without a trailing slash', () => {
    expect(isAuthCallbackPath('/auth/callback')).toBe(true);
    expect(isAuthCallbackPath('/auth/callback/')).toBe(true);
    expect(isAuthCallbackPath('/login')).toBe(false);
  });

  it('normalizes supported OTP types for callback verification', () => {
    expect(normalizeAuthOtpType('signup')).toBe('email');
    expect(normalizeAuthOtpType('magiclink')).toBe('email');
    expect(normalizeAuthOtpType('email_change')).toBe('email_change');
    expect(normalizeAuthOtpType('unsupported')).toBeNull();
  });
});
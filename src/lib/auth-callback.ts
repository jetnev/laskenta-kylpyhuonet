export const AUTH_CALLBACK_PATH = '/auth/callback';
export const LOGIN_PATH = '/login';

const AUTH_QUERY_KEYS = [
  'access_token',
  'code',
  'error',
  'error_code',
  'error_description',
  'error_description_code',
  'expires_at',
  'expires_in',
  'provider_refresh_token',
  'provider_token',
  'refresh_token',
  'token',
  'token_hash',
  'type',
];

export type NormalizedAuthOtpType = 'email' | 'recovery' | 'invite' | 'email_change';

export interface ParsedAuthCallbackUrl {
  type: string | null;
  normalizedType: NormalizedAuthOtpType | null;
  code: string | null;
  tokenHash: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  errorCode: string | null;
  errorDescription: string | null;
  hasAuthPayload: boolean;
}

function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}

function readParam(searchParams: URLSearchParams, hashParams: URLSearchParams, key: string) {
  const searchValue = searchParams.get(key)?.trim();
  if (searchValue) {
    return searchValue;
  }

  const hashValue = hashParams.get(key)?.trim();
  return hashValue || null;
}

export function isAuthCallbackPath(pathname: string) {
  return normalizePathname(pathname) === AUTH_CALLBACK_PATH;
}

export function normalizeAuthOtpType(type: string | null): NormalizedAuthOtpType | null {
  const normalizedType = type?.trim().toLowerCase();

  switch (normalizedType) {
    case 'signup':
    case 'magiclink':
    case 'email':
      return 'email';
    case 'recovery':
    case 'invite':
    case 'email_change':
      return normalizedType;
    default:
      return null;
  }
}

export function parseAuthCallbackUrl(rawUrl: string): ParsedAuthCallbackUrl {
  const url = new URL(rawUrl);
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash);
  const searchParams = url.searchParams;
  const type = readParam(searchParams, hashParams, 'type');
  const code = readParam(searchParams, hashParams, 'code');
  const tokenHash = readParam(searchParams, hashParams, 'token_hash');
  const accessToken = readParam(searchParams, hashParams, 'access_token');
  const refreshToken = readParam(searchParams, hashParams, 'refresh_token');
  const errorCode = readParam(searchParams, hashParams, 'error_code');
  const errorDescription =
    readParam(searchParams, hashParams, 'error_description') || readParam(searchParams, hashParams, 'error');

  return {
    type,
    normalizedType: normalizeAuthOtpType(type),
    code,
    tokenHash,
    accessToken,
    refreshToken,
    errorCode,
    errorDescription,
    hasAuthPayload: Boolean(type || code || tokenHash || accessToken || refreshToken || errorCode || errorDescription),
  };
}

export function buildCleanAuthCallbackUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash);

  AUTH_QUERY_KEYS.forEach((key) => url.searchParams.delete(key));
  AUTH_QUERY_KEYS.forEach((key) => hashParams.delete(key));

  const nextHash = hashParams.toString();
  url.hash = nextHash ? `#${nextHash}` : '';

  return url.toString();
}

export function buildAuthRedirectUrl(options: { configuredUrl?: string | null; currentOrigin: string }) {
  const baseUrl = new URL(options.configuredUrl?.trim() || options.currentOrigin, options.currentOrigin);
  const normalizedPath = normalizePathname(baseUrl.pathname);

  if (normalizedPath === '/' || normalizedPath === LOGIN_PATH) {
    baseUrl.pathname = AUTH_CALLBACK_PATH;
  }

  baseUrl.search = '';
  baseUrl.hash = '';

  return baseUrl.toString();
}

export function resolveAuthRedirectUrl(options: {
  redirectUrl?: string | null;
  siteUrl?: string | null;
  currentOrigin: string;
}) {
  return buildAuthRedirectUrl({
    configuredUrl: options.redirectUrl?.trim() || options.siteUrl?.trim() || options.currentOrigin,
    currentOrigin: options.currentOrigin,
  });
}
export type DesktopUpdateStatus = 'disabled' | 'idle' | 'checking' | 'downloading' | 'downloaded' | 'error';

export interface DesktopDownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface DesktopUpdateSnapshot {
  enabled: boolean;
  feedUrl: string | null;
  status: DesktopUpdateStatus;
  currentVersion: string;
  latestVersion: string | null;
  downloadedVersion: string | null;
  lastCheckedAt: string | null;
  lastDownloadedAt: string | null;
  needsRestart: boolean;
  error: string | null;
  downloadProgress: DesktopDownloadProgress | null;
}

interface DesktopRestartResponse {
  ok: boolean;
  restarting: boolean;
}

function hasDesktopHost() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
}

async function requestDesktopUpdate(pathname: string, method: 'GET' | 'POST'): Promise<DesktopUpdateSnapshot> {
  if (!isDesktopRuntime()) {
    throw new Error('Päivitysten tarkistus toimii vain desktop-exe:ssä.');
  }
  const response = await fetch(pathname, { method });
  const payload = (await response.json().catch(() => null)) as DesktopUpdateSnapshot | null;
  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error || 'Päivitystoiminto epäonnistui.');
  }
  if (!payload) {
    throw new Error('Päivitysvaste puuttui.');
  }
  return payload;
}

export function isDesktopRuntime() {
  return !import.meta.env.DEV && hasDesktopHost();
}

export function checkForDesktopUpdates() {
  return requestDesktopUpdate('/_desktop/update/check', 'POST');
}

export function getDesktopUpdateStatus() {
  return requestDesktopUpdate('/_desktop/update/status', 'GET');
}

export async function restartDesktopForUpdate() {
  if (!isDesktopRuntime()) {
    throw new Error('Päivitysten asennus toimii vain desktop-exe:ssä.');
  }
  const response = await fetch('/_desktop/update/restart', { method: 'POST' });
  const payload = (await response.json().catch(() => null)) as DesktopRestartResponse | { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload && 'error' in payload ? payload.error || 'Päivityksen käynnistys epäonnistui.' : 'Päivityksen käynnistys epäonnistui.');
  }
  if (!payload || !('ok' in payload) || !payload.ok) {
    throw new Error('Päivityksen käynnistys epäonnistui.');
  }
  return payload;
}

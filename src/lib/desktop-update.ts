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

async function requestDesktopUpdate(pathname: string, method: 'GET' | 'POST'): Promise<DesktopUpdateSnapshot> {
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
  return !import.meta.env.DEV;
}

export function checkForDesktopUpdates() {
  return requestDesktopUpdate('/_desktop/update/check', 'POST');
}

export function getDesktopUpdateStatus() {
  return requestDesktopUpdate('/_desktop/update/status', 'GET');
}

export async function restartDesktopForUpdate() {
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

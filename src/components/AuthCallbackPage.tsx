import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, CircleNotch, Key, WarningCircle } from '@phosphor-icons/react';

import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { applyDocumentMetadata } from '../lib/document-metadata';
import {
  AUTH_CALLBACK_PATH,
  buildCleanAuthCallbackUrl,
  LOGIN_PATH,
  parseAuthCallbackUrl,
  type ParsedAuthCallbackUrl,
} from '../lib/auth-callback';
import { APP_AUTH_CALLBACK_META_DESCRIPTION, APP_NAME, buildDocumentTitle } from '../lib/site-brand';
import { getSupabaseConfigError, isSupabaseConfigured, requireSupabase } from '../lib/supabase';

type CallbackStatus = 'processing' | 'confirmation-success' | 'reset-password' | 'reset-success' | 'error';

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.trim();
  }

  if (typeof error === 'string') {
    return error.trim();
  }

  if (error && typeof error === 'object') {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown };
    const parts = [candidate.message, candidate.details, candidate.hint].filter(
      (part): part is string => typeof part === 'string' && part.trim().length > 0
    );

    if (parts.length > 0) {
      return Array.from(new Set(parts)).join(' ').trim();
    }
  }

  return '';
}

function formatCallbackError(error: unknown, callback: ParsedAuthCallbackUrl) {
  const message = extractErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (callback.errorCode === 'otp_expired' || normalizedMessage.includes('otp expired')) {
    return 'Vahvistuslinkki on vanhentunut. Lähetä uusi vahvistusviesti ja yritä uudelleen.';
  }

  if (
    normalizedMessage.includes('code verifier') ||
    normalizedMessage.includes('invalid flow state') ||
    normalizedMessage.includes('auth code and code verifier should be non-empty')
  ) {
    return 'Vahvistuslinkkiä ei voitu käsitellä tällä laitteella. Luo uusi vahvistusviesti, joka ohjaa suoraan tähän callback-reittiin.';
  }

  if (callback.normalizedType === 'recovery') {
    return message || 'Salasanan palautuslinkin käsittely epäonnistui. Pyydä uusi palautusviesti ja yritä uudelleen.';
  }

  return message || 'Sähköpostivahvistuksen käsittely epäonnistui. Pyydä uusi vahvistusviesti ja yritä uudelleen.';
}

function validatePassword(password: string) {
  return password.length >= 8;
}

function navigateToLogin() {
  window.location.assign(LOGIN_PATH);
}

async function runWithTimeout<T>(operation: Promise<T>, timeoutMs: number) {
  return await Promise.race<T>([
    operation,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error('Auth-callback aikakatkaistiin. Yritä uudelleen tai pyydä uusi sähköpostilinkki.'));
      }, timeoutMs);
    }),
  ]);
}

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [message, setMessage] = useState('Käsitellään vahvistuslinkkiä...');
  const [error, setError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [submittingPassword, setSubmittingPassword] = useState(false);

  const callback = useMemo(() => parseAuthCallbackUrl(window.location.href), []);
  const statusTitle =
    status === 'processing'
      ? 'Käsitellään linkkiä'
      : status === 'confirmation-success'
        ? 'Sähköposti vahvistettu'
        : status === 'reset-password'
          ? 'Aseta uusi salasana'
          : status === 'reset-success'
            ? 'Salasana vaihdettu'
            : 'Linkin käsittely epäonnistui';

  useEffect(() => {
    applyDocumentMetadata({
      title: buildDocumentTitle(statusTitle),
      description: message || APP_AUTH_CALLBACK_META_DESCRIPTION,
      pathname: AUTH_CALLBACK_PATH,
      siteUrl: import.meta.env.VITE_SITE_URL?.trim(),
    });
  }, [message, statusTitle]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus('error');
      setMessage('');
      setError(getSupabaseConfigError());
      return;
    }

    const cleanedUrl = buildCleanAuthCallbackUrl(window.location.href);
    window.history.replaceState({}, document.title, cleanedUrl);

    if (callback.errorDescription) {
      setStatus('error');
      setMessage('');
      setError(formatCallbackError(new Error(decodeURIComponent(callback.errorDescription).replace(/\+/g, ' ')), callback));
      return;
    }

    if (!callback.hasAuthPayload) {
      setStatus('error');
      setMessage('');
      setError('Linkki ei sisällä vahvistus- tai palautustietoja. Palaa kirjautumiseen ja pyydä uusi sähköpostiviesti.');
      return;
    }

    let cancelled = false;

    void runWithTimeout(
      (async () => {
        const client = requireSupabase();

        if (callback.tokenHash) {
          const otpType = callback.normalizedType ?? 'email';
          const { error: verifyError } = await client.auth.verifyOtp({
            token_hash: callback.tokenHash,
            type: otpType,
          });

          if (verifyError) {
            throw verifyError;
          }
        } else if (callback.accessToken && callback.refreshToken) {
          const { error: sessionError } = await client.auth.setSession({
            access_token: callback.accessToken,
            refresh_token: callback.refreshToken,
          });

          if (sessionError) {
            throw sessionError;
          }
        } else if (callback.code) {
          const { error: exchangeError } = await client.auth.exchangeCodeForSession(callback.code);

          if (exchangeError) {
            throw exchangeError;
          }
        } else {
          throw new Error('Linkki ei sisältänyt käsiteltäviä tunnistetietoja.');
        }

        if (cancelled) {
          return;
        }

        if (callback.normalizedType === 'recovery') {
          setStatus('reset-password');
          setMessage('Vahvistus onnistui. Aseta seuraavaksi uusi salasana.');
          setError(null);
          return;
        }

        await client.auth.signOut({ scope: 'local' });
        setStatus('confirmation-success');
        setMessage('Sähköpostiosoite vahvistettiin. Voit nyt kirjautua sisään millä tahansa laitteella.');
        setError(null);
      })(),
      15_000
    ).catch((reason) => {
      if (cancelled) {
        return;
      }

      setStatus('error');
      setMessage('');
      setError(formatCallbackError(reason, callback));
    });

    return () => {
      cancelled = true;
    };
  }, [callback]);

  const handlePasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setError('Salasanat eivät täsmää.');
      return;
    }

    if (!validatePassword(passwordForm.password)) {
      setError('Uuden salasanan on oltava vähintään 8 merkkiä.');
      return;
    }

    setSubmittingPassword(true);
    setError(null);

    try {
      const client = requireSupabase();
      const { error: updateError } = await client.auth.updateUser({ password: passwordForm.password });

      if (updateError) {
        throw updateError;
      }

      await client.auth.signOut({ scope: 'local' });
      setPasswordForm({ password: '', confirmPassword: '' });
      setStatus('reset-success');
      setMessage('Salasana vaihdettiin onnistuneesti. Kirjaudu sisään uudella salasanalla.');
    } catch (reason) {
      setError(extractErrorMessage(reason) || 'Salasanan vaihtaminen epäonnistui. Pyydä uusi palautuslinkki ja yritä uudelleen.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  const handleCancelRecovery = async () => {
    if (!isSupabaseConfigured) {
      navigateToLogin();
      return;
    }

    try {
      await requireSupabase().auth.signOut({ scope: 'local' });
    } finally {
      navigateToLogin();
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_44%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.06),transparent_30%)] pointer-events-none" />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12">
        <Card className="w-full overflow-hidden rounded-[28px] border-slate-200/90 bg-white shadow-[0_32px_80px_-42px_rgba(15,23,42,0.45)]">
          <CardHeader className="border-b border-slate-200/90 px-7 py-6">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{APP_NAME}</div>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 text-primary">
              {status === 'processing' ? (
                <CircleNotch className="h-6 w-6 animate-spin" weight="bold" />
              ) : status === 'error' ? (
                <WarningCircle className="h-6 w-6" weight="fill" />
              ) : status === 'reset-password' ? (
                <Key className="h-6 w-6" weight="bold" />
              ) : (
                <CheckCircle className="h-6 w-6" weight="fill" />
              )}
            </div>
            <CardTitle className="text-2xl tracking-[-0.03em]">{statusTitle}</CardTitle>
            {message && <CardDescription className="text-sm text-slate-600">{message}</CardDescription>}
          </CardHeader>

          <CardContent className="space-y-6 px-7 py-7">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {status === 'reset-password' && (
              <form className="space-y-4" onSubmit={(event) => void handlePasswordReset(event)}>
                <div className="space-y-2">
                  <Label htmlFor="callback-reset-password">Uusi salasana</Label>
                  <Input
                    id="callback-reset-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.password}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="callback-reset-confirm">Vahvista uusi salasana</Label>
                  <Input
                    id="callback-reset-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button className="h-11 flex-1" disabled={submittingPassword} type="submit">
                    {submittingPassword ? 'Tallennetaan uutta salasanaa...' : 'Tallenna uusi salasana'}
                  </Button>
                  <Button className="h-11" onClick={() => void handleCancelRecovery()} type="button" variant="outline">
                    Peruuta
                  </Button>
                </div>
              </form>
            )}

            {status !== 'reset-password' && (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="h-11" onClick={navigateToLogin} type="button">
                  Siirry kirjautumiseen
                </Button>
                <Button className="h-11" onClick={() => window.location.assign('/')} type="button" variant="ghost">
                  <ArrowLeft className="h-4 w-4" />
                  Takaisin etusivulle
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
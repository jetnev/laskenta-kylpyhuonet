import { useEffect, useMemo, useState } from 'react';
import { ArrowCounterClockwise, ArrowLeft, CheckCircle, Key, SignIn, UserPlus } from '@phosphor-icons/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { AuthActionError, useAuth } from '../hooks/use-auth';
import LegalDocumentLinks from './legal/LegalDocumentLinks';
import { buildSignupLegalAcceptanceBundle, listPublicActiveLegalDocuments } from '../lib/legal';
import type { LegalDocumentVersionRow } from '../lib/supabase';

type AuthView = 'login' | 'register' | 'forgot' | 'reset';

interface LoginPageProps {
  onNavigateHome: () => void;
}

function normalizeEmailValue(email: string) {
  return email.trim().toLowerCase();
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message || 'Toiminto epäonnistui.';
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    const parts = [candidate.message, candidate.details, candidate.hint].filter(
      (part): part is string => typeof part === 'string' && part.trim().length > 0
    );

    if (parts.length > 0) {
      return Array.from(new Set(parts)).join(' ');
    }
  }

  return 'Toiminto epäonnistui.';
}

export default function LoginPage({ onNavigateHome }: LoginPageProps) {
  const {
    login,
    register,
    resendEmailConfirmation,
    requestPasswordReset,
    resetPassword,
    requiresPasswordReset,
    backendConfigError,
  } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [submitting, setSubmitting] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    displayName: '',
    organizationName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [legalDocuments, setLegalDocuments] = useState<LegalDocumentVersionRow[]>([]);
  const [legalLoading, setLegalLoading] = useState(true);
  const [legalError, setLegalError] = useState<string | null>(null);
  const [registrationChecks, setRegistrationChecks] = useState({
    acceptedTermsAndPrivacy: false,
    authorityConfirmed: false,
  });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' });

  useEffect(() => {
    if (requiresPasswordReset) {
      setView('reset');
    }
  }, [requiresPasswordReset]);

  useEffect(() => {
    let active = true;

    void listPublicActiveLegalDocuments()
      .then((documents) => {
        if (!active) {
          return;
        }

        setLegalDocuments(documents);
        setLegalError(null);
      })
      .catch((reason) => {
        if (!active) {
          return;
        }

        setLegalDocuments([]);
        setLegalError(reason instanceof Error ? reason.message : 'Sopimusasiakirjojen lataus epäonnistui.');
      })
      .finally(() => {
        if (active) {
          setLegalLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const heading = useMemo(() => {
    switch (view) {
      case 'register':
        return {
          title: 'Luo käyttäjätili',
          description: 'Luo yrityksellesi työtila ja omistajatili.',
          actionLabel: 'Luo käyttäjätili',
          icon: UserPlus,
        };
      case 'forgot':
        return {
          title: 'Palauta salasana',
          description: 'Tilaa salasanan palautuslinkki sähköpostiosoitteeseesi.',
          actionLabel: 'Lähetä palautuslinkki',
          icon: ArrowCounterClockwise,
        };
      case 'reset':
        return {
          title: 'Aseta uusi salasana',
          description: 'Avaa sähköpostiin lähetetty linkki ja vaihda salasana tässä näkymässä.',
          actionLabel: 'Tallenna uusi salasana',
          icon: Key,
        };
      default:
        return {
          title: 'Kirjaudu sisään',
          description: 'Kirjaudu sisään jatkaaksesi tarjousten, tuotteiden ja projektien hallintaa samassa työtilassa.',
          actionLabel: 'Kirjaudu sisään',
          icon: SignIn,
        };
    }
  }, [view]);

  const HeadingIcon = heading.icon;

  const runAction = async (action: () => Promise<void>) => {
    setSubmitting(true);
    setError(null);
    setInfoMessage((current) => (view === 'login' ? 'Kirjaudutaan sisään...' : current));
    try {
      await action();
    } catch (err) {
      setInfoMessage(null);
      setError(getActionErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = () => {
    void runAction(async () => {
      try {
        await login(loginForm);
        setPendingConfirmationEmail(null);
      } catch (reason) {
        if (reason instanceof AuthActionError && reason.code === 'email-not-confirmed') {
          setPendingConfirmationEmail(normalizeEmailValue(loginForm.email));
        }

        throw reason;
      }
    });
  };

  const handleRegisterSubmit = async () => {
    const result = await register({
      displayName: registerForm.displayName,
      organizationName: registerForm.organizationName,
      email: registerForm.email,
      password: registerForm.password,
      legalAcceptance: buildSignupLegalAcceptanceBundle(legalDocuments, {
        acceptedTermsAndPrivacy: registrationChecks.acceptedTermsAndPrivacy,
        authorityConfirmed: registrationChecks.authorityConfirmed,
        locale: navigator.language || 'fi-FI',
        userAgent: navigator.userAgent || 'Tuntematon selain',
      }),
    });

    if (!result.requiresEmailConfirmation) {
      return;
    }

    const normalizedEmail = normalizeEmailValue(registerForm.email);
    setPendingConfirmationEmail(normalizedEmail);
    setLoginForm({ email: normalizedEmail, password: '' });
    setRegisterForm({
      displayName: '',
      organizationName: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    setRegistrationChecks({
      acceptedTermsAndPrivacy: false,
      authorityConfirmed: false,
    });
    setView('login');
    setInfoMessage(`Tili luotiin. Vahvista sähköpostiosoite ${normalizedEmail} sähköpostissa olevasta linkistä ennen kirjautumista.`);
  };

  const handleResendConfirmation = async () => {
    if (!pendingConfirmationEmail) {
      return;
    }

    setResendingConfirmation(true);
    setError(null);

    try {
      await resendEmailConfirmation(pendingConfirmationEmail);
      setInfoMessage(`Uusi vahvistusviesti lähetettiin osoitteeseen ${pendingConfirmationEmail}.`);
    } catch (reason) {
      setError(getActionErrorMessage(reason));
    } finally {
      setResendingConfirmation(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_44%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.06),transparent_30%)] pointer-events-none" />

      <header className="relative z-10 border-b border-slate-200/80 bg-white/82 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
          <button className="text-left" onClick={onNavigateHome} type="button">
            <div className="text-lg font-semibold tracking-tight text-slate-950">Tarjouslaskenta</div>
          </button>
          <Button variant="ghost" onClick={onNavigateHome}>
            <ArrowLeft className="h-4 w-4" />
            Takaisin etusivulle
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-[0.95fr_0.8fr] lg:items-start lg:py-20">
        <section className="max-w-xl pt-2">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Tarjouslaskenta</div>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
            Kirjaudu tarjouslaskennan työtilaan
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Hallinnoi tarjouksia, tuotteita ja projekteja samassa järjestelmässä ilman hajanaisia tiedostoja ja erillisiä näkymiä.
          </p>

          <div className="mt-10 space-y-4">
            {[
              'Tarjous-, tuote- ja projektitiedot samassa työtilassa',
              'Käyttöoikeudet hallitusti organisaation tarpeisiin',
              'Selkeä näkymä päivittäiseen käyttöön',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/82 px-4 py-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.3)]">
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" weight="fill" />
                <div className="text-sm text-slate-700">{item}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <Card className="overflow-hidden rounded-[28px] border-slate-200/90 bg-white shadow-[0_32px_80px_-42px_rgba(15,23,42,0.45)]">
            <CardHeader className="border-b border-slate-200/90 px-7 py-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                <HeadingIcon className="h-6 w-6" weight="bold" />
              </div>
              <CardTitle className="text-2xl tracking-[-0.03em]">{heading.title}</CardTitle>
              <CardDescription className="text-sm text-slate-600">{heading.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 px-7 py-7">
              {(backendConfigError || error) && (
                <Alert variant="destructive">
                  <AlertDescription>{backendConfigError || error}</AlertDescription>
                </Alert>
              )}

              {infoMessage && (
                <Alert>
                  <AlertDescription>{infoMessage}</AlertDescription>
                </Alert>
              )}

              {view === 'login' && pendingConfirmationEmail && (
                <Alert>
                  <AlertDescription>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        Sähköpostiosoitetta {pendingConfirmationEmail} ei ole vielä vahvistettu. Lähetä uusi vahvistusviesti,
                        jos alkuperäinen linkki on vanhentunut tai kadonnut.
                      </span>
                      <Button
                        disabled={resendingConfirmation || submitting}
                        onClick={() => void handleResendConfirmation()}
                        type="button"
                        variant="outline"
                      >
                        {resendingConfirmation ? 'Lähetetään...' : 'Lähetä uudelleen'}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {view === 'login' && (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleLoginSubmit();
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Sähköpostiosoite</Label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={loginForm.email}
                      onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Salasana</Label>
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={loginForm.password}
                      onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                    />
                  </div>
                  <Button className="h-11 w-full" disabled={submitting} type="submit">
                    {submitting ? 'Kirjaudutaan sisään...' : heading.actionLabel}
                  </Button>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <button className="text-primary hover:underline" onClick={() => { setError(null); setView('forgot'); }} type="button">
                      Unohtuiko salasana?
                    </button>
                    <button className="text-slate-500 transition hover:text-slate-950" onClick={() => { setError(null); setView('register'); }} type="button">
                      Luo uusi käyttäjätili
                    </button>
                  </div>
                </form>
              )}

              {view === 'register' && (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (registerForm.password !== registerForm.confirmPassword) {
                      setError('Salasanat eivät täsmää.');
                      return;
                    }

                    if (legalLoading) {
                      setError('Sopimusasiakirjoja ladataan vielä. Yritä hetken kuluttua uudelleen.');
                      return;
                    }

                    if (legalError) {
                      setError(legalError);
                      return;
                    }

                    try {
                      buildSignupLegalAcceptanceBundle(legalDocuments, {
                        acceptedTermsAndPrivacy: registrationChecks.acceptedTermsAndPrivacy,
                        authorityConfirmed: registrationChecks.authorityConfirmed,
                        locale: navigator.language || 'fi-FI',
                        userAgent: navigator.userAgent || 'Tuntematon selain',
                      });
                    } catch (reason) {
                      setError(getActionErrorMessage(reason));
                      return;
                    }

                    void runAction(async () => {
                      await handleRegisterSubmit();
                    });
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nimi</Label>
                    <Input
                      id="register-name"
                      value={registerForm.displayName}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, displayName: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-organization">Yrityksen tai työtilan nimi</Label>
                    <Input
                      id="register-organization"
                      value={registerForm.organizationName}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, organizationName: event.target.value }))}
                      placeholder="Esim. Kylpyhuoneet Nieminen Oy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Sähköpostiosoite</Label>
                    <Input
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      value={registerForm.email}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Salasana</Label>
                    <Input
                      id="register-password"
                      type="password"
                      autoComplete="new-password"
                      value={registerForm.password}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm">Vahvista salasana</Label>
                    <Input
                      id="register-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={registerForm.confirmPassword}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    />
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-sm leading-7 text-slate-700">
                      Tilin luomalla hyväksyt palvelun käyttöehdot. Tietojesi käsittelystä kerrotaan tietosuojaselosteessa. Yritysasiakkaan tietojenkäsittelyliite on saatavilla samalla sivulla luettavaksi.
                    </p>
                    <LegalDocumentLinks className="mt-3" openInNewTab />

                    {legalLoading && (
                      <p className="mt-3 text-xs text-slate-500">Ladataan ajantasaisia sopimusasiakirjoja...</p>
                    )}

                    {legalError && (
                      <Alert className="mt-3" variant="destructive">
                        <AlertDescription>{legalError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="mt-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={registrationChecks.acceptedTermsAndPrivacy}
                          id="register-accept-terms"
                          onCheckedChange={(checked) =>
                            setRegistrationChecks((current) => ({
                              ...current,
                              acceptedTermsAndPrivacy: checked === true,
                            }))
                          }
                        />
                        <div className="space-y-1">
                          <Label className="cursor-pointer text-sm leading-6 text-slate-800" htmlFor="register-accept-terms">
                            Hyväksyn käyttöehdot ja vahvistan lukeneeni tietosuojaselosteen
                          </Label>
                          <p className="text-xs leading-6 text-slate-500">
                            Tätä hyväksyntää ei voi ohittaa, eikä se ole oletuksena valittuna.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={registrationChecks.authorityConfirmed}
                          id="register-authority"
                          onCheckedChange={(checked) =>
                            setRegistrationChecks((current) => ({
                              ...current,
                              authorityConfirmed: checked === true,
                            }))
                          }
                        />
                        <div className="space-y-1">
                          <Label className="cursor-pointer text-sm leading-6 text-slate-800" htmlFor="register-authority">
                            Vakuutan, että minulla on oikeus hyväksyä ehdot organisaation puolesta.
                          </Label>
                          <p className="text-xs leading-6 text-slate-500">
                            Itse rekisteröityvä käyttäjä luo samalla organisaation owner-tilin, joten tämä vahvistus tallennetaan audit trailiin.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button className="h-11 w-full" disabled={submitting} type="submit">
                    {legalLoading ? 'Ladataan ehtoja...' : heading.actionLabel}
                  </Button>
                  <button className="text-sm text-primary hover:underline" onClick={() => { setError(null); setView('login'); }} type="button">
                    Takaisin kirjautumiseen
                  </button>
                </form>
              )}

              {view === 'forgot' && (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runAction(async () => {
                      await requestPasswordReset(forgotEmail);
                      setInfoMessage('Palautuslinkki lähetettiin sähköpostiin. Avaa viesti ja palaa linkin kautta vaihtamaan salasana.');
                      setView('login');
                    });
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Sähköpostiosoite</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(event) => setForgotEmail(event.target.value)}
                    />
                  </div>
                  <Button className="h-11 w-full" disabled={submitting} type="submit">
                    {heading.actionLabel}
                  </Button>
                  <button className="text-sm text-primary hover:underline" onClick={() => { setError(null); setView('login'); }} type="button">
                    Takaisin kirjautumiseen
                  </button>
                </form>
              )}

              {view === 'reset' && (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (resetForm.password !== resetForm.confirmPassword) {
                      setError('Salasanat eivät täsmää.');
                      return;
                    }
                    void runAction(async () => {
                      await resetPassword('', resetForm.password);
                      setView('login');
                      setInfoMessage('Salasana vaihdettiin. Voit kirjautua nyt uudella salasanalla.');
                      setResetForm({ password: '', confirmPassword: '' });
                    });
                  }}
                >
                  {!requiresPasswordReset && (
                    <Alert>
                      <AlertDescription>
                        Avaa ensin sähköpostiin lähetetty palautuslinkki. Sen jälkeen voit asettaa uuden salasanan tässä näkymässä.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="reset-password">Uusi salasana</Label>
                    <Input
                      id="reset-password"
                      type="password"
                      value={resetForm.password}
                      onChange={(event) => setResetForm((current) => ({ ...current, password: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-confirm">Vahvista uusi salasana</Label>
                    <Input
                      id="reset-confirm"
                      type="password"
                      value={resetForm.confirmPassword}
                      onChange={(event) => setResetForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    />
                  </div>
                  <Button className="h-11 w-full" disabled={submitting || !requiresPasswordReset} type="submit">
                    {heading.actionLabel}
                  </Button>
                  <button className="text-sm text-primary hover:underline" onClick={() => { setError(null); setView('login'); }} type="button">
                    Takaisin kirjautumiseen
                  </button>
                </form>
              )}

              <div className="border-t border-slate-200 pt-4">
                <p className="text-xs leading-6 text-slate-500">
                  Dokumentit ovat luettavissa ilman kirjautumista. Mahdolliset tulevat markkinointisuostumukset pyydetään erikseen, eikä niitä niputeta käyttöehtojen hyväksyntään.
                </p>
                <LegalDocumentLinks className="mt-3" openInNewTab />
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

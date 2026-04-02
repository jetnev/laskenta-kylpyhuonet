import { useEffect, useMemo, useState } from 'react';
import { ArrowCounterClockwise, IdentificationCard, Key, SignIn, UserPlus } from '@phosphor-icons/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { useAuth } from '../hooks/use-auth';

type AuthView = 'login' | 'register' | 'forgot' | 'reset';

export default function LoginPage() {
  const {
    login,
    register,
    requestPasswordReset,
    resetPassword,
    requiresPasswordReset,
    backendConfigError,
  } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' });

  useEffect(() => {
    if (requiresPasswordReset) {
      setView('reset');
    }
  }, [requiresPasswordReset]);

  const heading = useMemo(() => {
    switch (view) {
      case 'register':
        return {
          title: 'Luo käyttäjätili',
          description: 'Ensimmäinen käyttäjä saa automaattisesti admin-oikeudet.',
          icon: UserPlus,
        };
      case 'forgot':
        return {
          title: 'Salasanan palautus',
          description: 'Tilaa salasanan palautuslinkki sähköpostiosoitteella.',
          icon: ArrowCounterClockwise,
        };
      case 'reset':
        return {
          title: 'Aseta uusi salasana',
          description: 'Avaa palautuslinkki sähköpostista ja aseta uusi salasana tässä näkymässä.',
          icon: Key,
        };
      default:
        return {
          title: 'Kirjaudu sisään',
          description: 'Sovelluksen sisäiset näkymät ovat suojattuja kirjautumisen taakse.',
          icon: SignIn,
        };
    }
  }, [view]);

  const HeadingIcon = heading.icon;

  const runAction = async (action: () => Promise<void>) => {
    setSubmitting(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toiminto epäonnistui.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.03),transparent_40%)] flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl overflow-hidden border-border/70 shadow-2xl">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-slate-950 text-white p-8 lg:p-12 space-y-8">
            <div className="space-y-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <IdentificationCard className="h-7 w-7" weight="bold" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Tarjouslaskenta</h1>
                <p className="mt-3 max-w-lg text-sm text-white/70">
                  Hallitse tuoterekisteriä, projektikohtaisia tarjouksia ja koko tarjousprosessia yhdestä työkalusta.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/6 p-4 ring-1 ring-white/10">
                <p className="text-sm font-medium">Suojatut sisäsivut</p>
                <p className="mt-2 text-sm text-white/70">Kaikki tuotetiedot, projektit ja tarjoukset avautuvat vasta kirjautumisen jälkeen.</p>
              </div>
              <div className="rounded-2xl bg-white/6 p-4 ring-1 ring-white/10">
                <p className="text-sm font-medium">Roolipohjainen hallinta</p>
                <p className="mt-2 text-sm text-white/70">Admin hallitsee käyttäjiä ja yhteisiä tietoja. Normaali käyttäjä käsittelee omat projektinsa ja tarjouksensa.</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white/6 p-5 ring-1 ring-white/10">
              <p className="text-sm font-medium">Salasanan palautus tässä ympäristössä</p>
              <p className="mt-2 text-sm text-white/70">
                Palautus toimii sähköpostiin lähetettävän linkin kautta. Tuotannossa voit myöhemmin vaihtaa Supabasen oman SMTP:n yrityksen sähköpostiin.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <CardHeader className="px-0 pt-0">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <HeadingIcon className="h-6 w-6" weight="bold" />
              </div>
              <CardTitle>{heading.title}</CardTitle>
              <CardDescription>{heading.description}</CardDescription>
            </CardHeader>

            <CardContent className="px-0 space-y-5">
              {(backendConfigError || error) && (
                <Alert variant="destructive">
                  <AlertDescription>{backendConfigError || error}</AlertDescription>
                </Alert>
              )}

              {infoMessage && (
                <Alert>
                  <AlertDescription>
                    {infoMessage}
                  </AlertDescription>
                </Alert>
              )}

              {view === 'login' && (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runAction(() => login(loginForm));
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
                  <Button className="w-full" disabled={submitting} type="submit">
                    Kirjaudu sisään
                  </Button>
                  <div className="flex flex-col gap-2 text-sm sm:flex-row sm:justify-between">
                    <button className="text-primary hover:underline text-left" onClick={() => { setError(null); setView('forgot'); }} type="button">
                      Unohtuiko salasana?
                    </button>
                    <button className="text-primary hover:underline text-left" onClick={() => { setError(null); setView('register'); }} type="button">
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
                    void runAction(() =>
                      register({
                        displayName: registerForm.displayName,
                        email: registerForm.email,
                        password: registerForm.password,
                      })
                    );
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
                  <Button className="w-full" disabled={submitting} type="submit">
                    Luo käyttäjätili
                  </Button>
                  <button className="text-primary hover:underline text-sm" onClick={() => { setError(null); setView('login'); }} type="button">
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
                      setInfoMessage('Palautuslinkki lähetettiin sähköpostiin. Avaa viesti ja palaa sovellukseen linkin kautta vaihtamaan salasana.');
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
                  <Button className="w-full" disabled={submitting} type="submit">
                    Lähetä palautuskoodi
                  </Button>
                  <button className="text-primary hover:underline text-sm" onClick={() => { setError(null); setView('login'); }} type="button">
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
                        Avaa ensin sähköpostiin lähetetty palautuslinkki. Sen jälkeen tämä näkymä sallii uuden salasanan asettamisen.
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
                  <Button className="w-full" disabled={submitting || !requiresPasswordReset} type="submit">
                    Tallenna uusi salasana
                  </Button>
                  <button className="text-primary hover:underline text-sm" onClick={() => { setError(null); setView('login'); }} type="button">
                    Takaisin kirjautumiseen
                  </button>
                </form>
              )}
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Key, SignOut, UserCircle } from '@phosphor-icons/react';
import { useAuth } from '../../hooks/use-auth';
import { useCompanyProfile } from '../../hooks/use-data';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';

function toNameCase(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('-');
}

function getExampleSurname(displayName?: string, email?: string) {
  const displayNameParts = (displayName || '')
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^\p{L}\p{M}-]/gu, ''))
    .filter(Boolean);
  const emailParts = (email || '')
    .split('@')[0]
    ?.split(/[._-]+/)
    .map((part) => part.replace(/[^\p{L}\p{M}-]/gu, ''))
    .filter(Boolean) || [];

  const candidate =
    (displayNameParts.length > 1 ? displayNameParts.at(-1) : undefined) ||
    (emailParts.length > 1 ? emailParts.at(-1) : undefined) ||
    displayNameParts[0] ||
    emailParts[0] ||
    '';

  return candidate ? toNameCase(candidate) : '';
}

export default function AccountPage() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const { companyProfile, updateCompanyProfile } = useCompanyProfile();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName ?? '',
    email: user?.email ?? '',
  });
  const [companyForm, setCompanyForm] = useState({
    companyName: companyProfile.companyName,
    companyEmail: companyProfile.companyEmail,
    companyPhone: companyProfile.companyPhone,
    companyAddress: companyProfile.companyAddress,
    companyLogo: companyProfile.companyLogo || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    nextPassword: '',
    confirmPassword: '',
  });

  const memberSince = useMemo(
    () => (user ? new Date(user.createdAt).toLocaleDateString('fi-FI') : ''),
    [user]
  );
  const companyNamePlaceholder = useMemo(() => {
    const surname = getExampleSurname(user?.displayName, user?.email);
    return surname ? `Esim. Kylpyhuoneet ${surname} Oy` : 'Esim. Oma Yritys Oy';
  }, [user?.displayName, user?.email]);

  useEffect(() => {
    setProfileForm({
      displayName: user?.displayName ?? '',
      email: user?.email ?? '',
    });
  }, [user?.displayName, user?.email]);

  useEffect(() => {
    setCompanyForm({
      companyName: companyProfile.companyName,
      companyEmail: companyProfile.companyEmail,
      companyPhone: companyProfile.companyPhone,
      companyAddress: companyProfile.companyAddress,
      companyLogo: companyProfile.companyLogo || '',
    });
  }, [companyProfile]);

  if (!user) {
    return null;
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Oma tili</h1>
        <p className="text-muted-foreground mt-1">Hallitse profiiliasi, salasanaasi ja istuntoasi.</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <UserCircle className="h-9 w-9" weight="duotone" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user.displayName}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">Käyttäjärooli: {user.role === 'admin' ? 'Admin' : 'Käyttäjä'}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Jäsen alkaen</p>
            <p className="mt-2 text-sm font-medium">{memberSince}</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Viimeisin kirjautuminen</p>
            <p className="mt-2 text-sm font-medium">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('fi-FI') : 'Ei tietoa'}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tilan hallinta</p>
            <Button
              className="mt-2 w-full"
              variant="outline"
              disabled={signingOut}
              onClick={async () => {
                try {
                  setSigningOut(true);
                  await logout();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Uloskirjautuminen epäonnistui.');
                  setSigningOut(false);
                }
              }}
            >
              <SignOut className="h-4 w-4" />
              {signingOut ? 'Kirjaudutaan ulos...' : 'Kirjaudu ulos'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Perustiedot</h2>
          <p className="text-sm text-muted-foreground">Päivitä nimi ja sähköpostiosoite.</p>
        </div>
        {profileError && (
          <Alert variant="destructive">
            <AlertDescription>{profileError}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="account-display-name">Nimi</Label>
            <Input
              id="account-display-name"
              value={profileForm.displayName}
              onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-email">Sähköposti</Label>
            <Input
              id="account-email"
              type="email"
              value={profileForm.email}
              onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={async () => {
              try {
                setProfileError(null);
                await updateProfile(profileForm);
                toast.success('Tilitiedot päivitetty.');
              } catch (error) {
                setProfileError(error instanceof Error ? error.message : 'Tilitietojen päivitys epäonnistui.');
              }
            }}
          >
            Tallenna profiili
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Yritystiedot tarjouksille</h2>
          <p className="text-sm text-muted-foreground">Nämä tiedot näkyvät juuri sinun omissa tarjousdokumenteissasi ja PDF- tai Excel-vienneissä.</p>
        </div>
        {companyError && (
          <Alert variant="destructive">
            <AlertDescription>{companyError}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="account-company-name">Yrityksen nimi</Label>
            <Input
              id="account-company-name"
              value={companyForm.companyName}
              onChange={(event) => setCompanyForm((current) => ({ ...current, companyName: event.target.value }))}
              placeholder={companyNamePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-company-email">Yrityksen sähköposti</Label>
            <Input
              id="account-company-email"
              type="email"
              value={companyForm.companyEmail}
              onChange={(event) => setCompanyForm((current) => ({ ...current, companyEmail: event.target.value }))}
              placeholder="myynti@yritys.fi"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-company-phone">Yrityksen puhelin</Label>
            <Input
              id="account-company-phone"
              value={companyForm.companyPhone}
              onChange={(event) => setCompanyForm((current) => ({ ...current, companyPhone: event.target.value }))}
              placeholder="+358 40 123 4567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-company-address">Yrityksen osoite</Label>
            <Input
              id="account-company-address"
              value={companyForm.companyAddress}
              onChange={(event) => setCompanyForm((current) => ({ ...current, companyAddress: event.target.value }))}
              placeholder="Esimerkkikatu 1, 00100 Helsinki"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="account-company-logo">Logon URL</Label>
            <Input
              id="account-company-logo"
              type="url"
              value={companyForm.companyLogo}
              onChange={(event) => setCompanyForm((current) => ({ ...current, companyLogo: event.target.value }))}
              placeholder="https://yritys.fi/logo.png"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => {
              try {
                setCompanyError(null);
                updateCompanyProfile(companyForm);
                toast.success('Yritystiedot tallennettu.');
              } catch (error) {
                setCompanyError(error instanceof Error ? error.message : 'Yritystietojen tallennus epäonnistui.');
              }
            }}
          >
            Tallenna yritystiedot
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Key className="h-5 w-5" weight="bold" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Vaihda salasana</h2>
            <p className="text-sm text-muted-foreground">Säilytä istuntosi, mutta vaihda tunnuksesi turvallisesti.</p>
          </div>
        </div>
        {passwordError && (
          <Alert variant="destructive">
            <AlertDescription>{passwordError}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="current-password">Nykyinen salasana</Label>
            <Input
              id="current-password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next-password">Uusi salasana</Label>
            <Input
              id="next-password"
              type="password"
              value={passwordForm.nextPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, nextPassword: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Vahvista uusi salasana</Label>
            <Input
              id="confirm-password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={async () => {
              if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
                setPasswordError('Uudet salasanat eivät täsmää.');
                return;
              }
              try {
                setPasswordError(null);
                await changePassword(passwordForm.currentPassword, passwordForm.nextPassword);
                setPasswordForm({ currentPassword: '', nextPassword: '', confirmPassword: '' });
                toast.success('Salasana vaihdettu.');
              } catch (error) {
                setPasswordError(error instanceof Error ? error.message : 'Salasanan vaihto epäonnistui.');
              }
            }}
          >
            Päivitä salasana
          </Button>
        </div>
      </Card>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Gear, Shield } from '@phosphor-icons/react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { useSettings } from '../../hooks/use-data';
import { useAuth } from '../../hooks/use-auth';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { canManageSharedData } = useAuth();
  const [formData, setFormData] = useState(settings);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    setSavedAt(null);
  }, [formData]);

  if (!canManageSharedData) {
    return (
      <div className="p-4 sm:p-8">
        <Card className="p-8 text-center text-muted-foreground">
          Asetukset ovat vain admin-roolille.
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Asetukset</h1>
        <p className="text-muted-foreground mt-1">Yleiset yritys- ja tarjousasetukset koko sovellukselle.</p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Muutokset vaikuttavat kaikkiin käyttäjiin, koska nämä tiedot ovat yhteisiä koko sovellukselle.
        </AlertDescription>
      </Alert>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Gear className="h-5 w-5" weight="bold" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Yritystiedot</h2>
            <p className="text-sm text-muted-foreground">Näitä käytetään tarjousyhteenvedossa ja dokumenteissa.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="settings-company-name">Yrityksen nimi</Label>
            <Input id="settings-company-name" value={formData.companyName} onChange={(event) => setFormData((current) => ({ ...current, companyName: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-company-email">Sähköposti</Label>
            <Input id="settings-company-email" type="email" value={formData.companyEmail} onChange={(event) => setFormData((current) => ({ ...current, companyEmail: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-company-phone">Puhelin</Label>
            <Input id="settings-company-phone" value={formData.companyPhone} onChange={(event) => setFormData((current) => ({ ...current, companyPhone: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-company-address">Osoite</Label>
            <Input id="settings-company-address" value={formData.companyAddress} onChange={(event) => setFormData((current) => ({ ...current, companyAddress: event.target.value }))} />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Tarjouksen oletusarvot</h2>
          <p className="text-sm text-muted-foreground">Näitä arvoja käytetään uusien tarjousten luonnissa.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="settings-vat">ALV %</Label>
            <Input id="settings-vat" type="number" step="0.1" value={formData.defaultVatPercent} onChange={(event) => setFormData((current) => ({ ...current, defaultVatPercent: parseFloat(event.target.value) || 0 }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-margin">Oletuskate %</Label>
            <Input id="settings-margin" type="number" step="0.1" value={formData.defaultMarginPercent} onChange={(event) => setFormData((current) => ({ ...current, defaultMarginPercent: parseFloat(event.target.value) || 0 }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-validity">Voimassaolopäivät</Label>
            <Input id="settings-validity" type="number" value={formData.defaultValidityDays} onChange={(event) => setFormData((current) => ({ ...current, defaultValidityDays: parseInt(event.target.value, 10) || 0 }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-prefix">Tarjousnumeroiden etuliite</Label>
            <Input id="settings-prefix" value={formData.quoteNumberPrefix} onChange={(event) => setFormData((current) => ({ ...current, quoteNumberPrefix: event.target.value.toUpperCase() }))} />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Automaattiset päivitykset</h2>
          <p className="text-sm text-muted-foreground">
            Sovellus tarkistaa päivitykset tästä osoitteesta. Osoitteen tulee olla suora generic-feed, jossa on
            `latest.yml` ja julkaisuartefaktit.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-update-feed-url">Päivitysfeedin URL</Label>
          <Input
            id="settings-update-feed-url"
            type="url"
            placeholder="https://oma-domain.fi/laskenta/"
            value={formData.updateFeedUrl || ''}
            onChange={(event) => setFormData((current) => ({ ...current, updateFeedUrl: event.target.value }))}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Voit käyttää omaa domainia, GitHub Pages -osoitetta tai muuta HTTPS-palvelinta. Jätä kenttä tyhjäksi, jos
          feed määritetään ympäristömuuttujalla.
        </p>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {savedAt && (
          <p className="text-sm text-emerald-600">
            Asetukset tallennettu {savedAt}
          </p>
        )}
        <Button
          onClick={() => {
            try {
              const nextFeedUrl = formData.updateFeedUrl?.trim() || '';
              if (nextFeedUrl) {
                try {
                  const parsedUrl = new URL(nextFeedUrl);
                  const normalizedFeedUrl = parsedUrl.toString().endsWith('/') ? parsedUrl.toString() : `${parsedUrl.toString()}/`;
                  updateSettings({ ...formData, updateFeedUrl: normalizedFeedUrl });
                } catch {
                  toast.error('Päivitysfeedin URL ei ole kelvollinen.');
                  return;
                }
              } else {
                updateSettings({ ...formData, updateFeedUrl: '' });
              }
              setSavedAt(new Intl.DateTimeFormat('fi-FI', {
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date()));
              toast.success('Asetukset tallennettu.');
            } catch (error) {
              setSavedAt(null);
              toast.error(error instanceof Error ? error.message : 'Tallennus epäonnistui.');
            }
          }}
        >
          Tallenna asetukset
        </Button>
      </div>
    </div>
  );
}

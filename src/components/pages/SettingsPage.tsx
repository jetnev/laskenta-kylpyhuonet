import { useEffect, useState } from 'react';
import { Gear, Shield } from '@phosphor-icons/react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { useSettings } from '../../hooks/use-data';
import { useAuth } from '../../hooks/use-auth';
import { toast } from 'sonner';
import FieldHelpLabel from '../FieldHelpLabel';

const SETTINGS_FIELD_HELP = {
  companyName: 'Yrityksen nimi näkyy tarjouksissa, PDF:issä ja muissa dokumenteissa. Kirjoita se siinä muodossa kuin haluat sen näkyvän asiakkaalle.',
  companyEmail: 'Yrityksen sähköpostiosoite näkyy dokumenteissa ja sitä voidaan käyttää yhteydenottoon tai myöhemmin viestien lähettämiseen.',
  companyPhone: 'Puhelinnumero helpottaa asiakkaan yhteydenottoa ja tekee tarjouksesta uskottavamman.',
  companyAddress: 'Osoite näytetään yritystiedoissa ja auttaa tunnistamaan tarjouksen lähettäjän selkeästi.',
  defaultVatPercent: 'Tätä ALV-prosenttia käytetään uusilla tarjouksilla oletuksena. Muuta arvoa vain, jos haluat uuden normaalitason kaikkiin uusiin tarjouksiin.',
  defaultMarginPercent: 'Oletuskate on tarjouslaskennan lähtötaso uusille tuotteille ja riveille. Se auttaa pitämään hinnoittelun tasaisena.',
  defaultValidityDays: 'Voimassaolopäivät kertovat kuinka monta päivää uusi tarjous on oletuksena voimassa.',
  quoteNumberPrefix: 'Etuliite näkyy jokaisen uuden tarjousnumeron alussa. Käytä lyhyttä tunnusta, jonka henkilöstö tunnistaa heti.',
  updateFeedUrl: 'Päivitysfeedin osoite kertoo desktop-sovellukselle mistä uudet versiot haetaan. Jos käytät vain verkkoversiota, kentän voi jättää tyhjäksi.',
} as const;

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
          Asetukset ovat vain yrityksen pääkäyttäjälle tai Projektan ylläpidolle.
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Asetukset</h1>
        <p className="text-muted-foreground mt-1">Yhteiset oletusarvot koko yritystyötilalle.</p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Muutokset vaikuttavat koko yritystyötilaan. Yrityksen pääkäyttäjä hallitsee yhteisiä oletusarvoja, ja työntekijöiden dokumenteissa käytetään työtilan yritystietoja ilman että yksittäisen ylläpitäjän yhteystiedot vuotavat fallbackina.
        </AlertDescription>
      </Alert>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Gear className="h-5 w-5" weight="bold" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Yhteiset oletusyritystiedot</h2>
            <p className="text-sm text-muted-foreground">Nimi, osoite ja muut yhteiset perustiedot voivat toimia oletuksina, mutta jokaisen käyttäjän oma dokumenteissa näkyvä sähköposti kannattaa tallentaa Oma tili -sivulla.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">Vaikuttaa: tarjoukset</Badge>
              <Badge variant="outline">Vaikuttaa: PDF-dokumentit</Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldHelpLabel htmlFor="settings-company-name" label="Yrityksen nimi" help={SETTINGS_FIELD_HELP.companyName} />
            <Input id="settings-company-name" value={formData.companyName} onChange={(event) => setFormData((current) => ({ ...current, companyName: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <FieldHelpLabel htmlFor="settings-company-email" label="Sähköposti" help={SETTINGS_FIELD_HELP.companyEmail} />
            <Input id="settings-company-email" type="email" value={formData.companyEmail} onChange={(event) => setFormData((current) => ({ ...current, companyEmail: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <FieldHelpLabel htmlFor="settings-company-phone" label="Puhelin" help={SETTINGS_FIELD_HELP.companyPhone} />
            <Input id="settings-company-phone" value={formData.companyPhone} onChange={(event) => setFormData((current) => ({ ...current, companyPhone: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <FieldHelpLabel htmlFor="settings-company-address" label="Osoite" help={SETTINGS_FIELD_HELP.companyAddress} />
            <Input id="settings-company-address" value={formData.companyAddress} onChange={(event) => setFormData((current) => ({ ...current, companyAddress: event.target.value }))} />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Tarjouksen oletusarvot</h2>
          <p className="text-sm text-muted-foreground">Näitä arvoja käytetään uusien tarjousten luonnissa.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">Vaikuttaa: uudet tarjoukset</Badge>
            <Badge variant="outline">Vaikuttaa: tarjouseditori</Badge>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <FieldHelpLabel htmlFor="settings-vat" label="ALV %" help={SETTINGS_FIELD_HELP.defaultVatPercent} />
            <Input id="settings-vat" type="number" step="0.1" value={formData.defaultVatPercent} onChange={(event) => setFormData((current) => ({ ...current, defaultVatPercent: parseFloat(event.target.value) || 0 }))} />
          </div>
          <div className="space-y-2">
            <FieldHelpLabel htmlFor="settings-margin" label="Oletuskate %" help={SETTINGS_FIELD_HELP.defaultMarginPercent} />
            <Input id="settings-margin" type="number" step="0.1" value={formData.defaultMarginPercent} onChange={(event) => setFormData((current) => ({ ...current, defaultMarginPercent: parseFloat(event.target.value) || 0 }))} />
          </div>
          <div className="space-y-2">
            <FieldHelpLabel htmlFor="settings-validity" label="Voimassaolopäivät" help={SETTINGS_FIELD_HELP.defaultValidityDays} />
            <Input id="settings-validity" type="number" value={formData.defaultValidityDays} onChange={(event) => setFormData((current) => ({ ...current, defaultValidityDays: parseInt(event.target.value, 10) || 0 }))} />
          </div>
          <div className="space-y-2">
            <FieldHelpLabel htmlFor="settings-prefix" label="Tarjousnumeroiden etuliite" help={SETTINGS_FIELD_HELP.quoteNumberPrefix} />
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
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">Vaikuttaa: desktop-päivitykset</Badge>
          </div>
        </div>
        <div className="space-y-2">
          <FieldHelpLabel htmlFor="settings-update-feed-url" label="Päivitysfeedin URL" help={SETTINGS_FIELD_HELP.updateFeedUrl} />
          <Input
            id="settings-update-feed-url"
            type="url"
            placeholder="https://projekta.fi/"
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

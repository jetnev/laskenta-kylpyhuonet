import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gear, Shield, ShieldCheck } from '@phosphor-icons/react';
import { deriveAccessState, getOrganizationRoleLabel, getPlatformRoleLabel } from '../../lib/access-control';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { AppPageContentGrid, AppPageHeader, AppPageLayout } from '../layout/AppPageLayout';
import PageEmptyState from '../layout/PageEmptyState';
import { useSettings } from '../../hooks/use-data';
import { useKV } from '../../hooks/use-kv';
import { useAuth } from '../../hooks/use-auth';
import { toast } from 'sonner';
import FieldHelpLabel from '../FieldHelpLabel';
import {
  getTenderUsageLimitState,
  resolveTenderUsageTierFromConfig,
  type TenderBillingConfig,
  type TenderBillingHistoryEntry,
  type TenderUsageTier,
} from '../../features/tender-intelligence/lib/tender-usage-limits';
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase';

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

const TENDER_BILLING_TIER_META: Record<TenderUsageTier, { label: string; description: string }> = {
  starter: {
    label: 'Starter',
    description: 'Perustaso pienemmälle käyttövolyymille.',
  },
  growth: {
    label: 'Growth',
    description: 'Kasvuvaiheen tiimeille suuremmalla kapasiteetilla.',
  },
  scale: {
    label: 'Scale',
    description: 'Suurkäyttöön ja laajempaan automaatioon.',
  },
};

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { canManageSharedData, organization, user, users } = useAuth();
  const [tenderBillingConfig, setTenderBillingConfig, tenderBillingLoaded] = useKV<TenderBillingConfig>(
    'tender-intelligence-billing',
    { tier: 'starter' },
  );
  const [tenderBillingHistory, setTenderBillingHistory] = useKV<TenderBillingHistoryEntry[]>(
    'tender-intelligence-billing-history',
    [],
  );
  const [formData, setFormData] = useState(settings);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pendingTierChange, setPendingTierChange] = useState<TenderUsageTier | null>(null);
  const [acknowledgeOverLimitChange, setAcknowledgeOverLimitChange] = useState(false);
  const [acknowledgeMissingImpactData, setAcknowledgeMissingImpactData] = useState(false);
  const [tenderUsage30d, setTenderUsage30d] = useState<number | null>(null);
  const [tenderUsage30dLoading, setTenderUsage30dLoading] = useState(false);
  const selectedTenderBillingTier = useMemo(
    () => resolveTenderUsageTierFromConfig(tenderBillingConfig),
    [tenderBillingConfig],
  );
  const selectedTenderBillingLimits = useMemo(
    () => getTenderUsageLimitState(null, selectedTenderBillingTier).limits,
    [selectedTenderBillingTier],
  );
  const pendingTierLimits = useMemo(
    () => (pendingTierChange ? getTenderUsageLimitState(null, pendingTierChange).limits : null),
    [pendingTierChange],
  );
  const pendingTierLimitDelta = useMemo(() => {
    if (!pendingTierLimits) {
      return null;
    }

    return pendingTierLimits.maxMeteredUnits30d - selectedTenderBillingLimits.maxMeteredUnits30d;
  }, [pendingTierLimits, selectedTenderBillingLimits.maxMeteredUnits30d]);
  const projectedRemainingUnits = useMemo(() => {
    if (!pendingTierLimits || tenderUsage30d == null) {
      return null;
    }

    return pendingTierLimits.maxMeteredUnits30d - tenderUsage30d;
  }, [pendingTierLimits, tenderUsage30d]);
  const projectedUsagePercent = useMemo(() => {
    if (!pendingTierLimits || tenderUsage30d == null) {
      return null;
    }

    return Math.round((tenderUsage30d / pendingTierLimits.maxMeteredUnits30d) * 100);
  }, [pendingTierLimits, tenderUsage30d]);
  const projectedImpact = useMemo(() => {
    if (tenderUsage30dLoading) {
      return {
        tone: 'neutral' as const,
        label: 'Haetaan käyttötilannetta',
      };
    }

    if (tenderUsage30d == null || projectedRemainingUnits == null || projectedUsagePercent == null) {
      return {
        tone: 'neutral' as const,
        label: 'Vaikutusarviota ei saatavilla',
      };
    }

    if (projectedRemainingUnits < 0) {
      return {
        tone: 'danger' as const,
        label: 'Ylittää rajan',
      };
    }

    if (projectedUsagePercent >= 90) {
      return {
        tone: 'warning' as const,
        label: 'Lähellä rajaa',
      };
    }

    return {
      tone: 'safe' as const,
      label: 'Turvallinen marginaali',
    };
  }, [projectedRemainingUnits, projectedUsagePercent, tenderUsage30d, tenderUsage30dLoading]);
  const projectedImpactToneClassName = useMemo(() => {
    switch (projectedImpact.tone) {
      case 'danger':
        return 'border-rose-300 bg-rose-50 text-rose-900';
      case 'warning':
        return 'border-amber-300 bg-amber-50 text-amber-900';
      case 'safe':
        return 'border-emerald-300 bg-emerald-50 text-emerald-900';
      default:
        return 'border-slate-200 bg-slate-50 text-slate-700';
    }
  }, [projectedImpact.tone]);
  const requiresOverLimitAcknowledge = projectedRemainingUnits != null && projectedRemainingUnits < 0;
  const requiresMissingImpactAcknowledge = Boolean(
    pendingTierLimitDelta != null &&
    pendingTierLimitDelta < 0 &&
    !tenderUsage30dLoading &&
    tenderUsage30d == null,
  );
  const canConfirmPendingTierChange = Boolean(
    pendingTierChange &&
    canManageSharedData &&
    (!requiresOverLimitAcknowledge || acknowledgeOverLimitChange) &&
    (!requiresMissingImpactAcknowledge || acknowledgeMissingImpactData),
  );
  const userNameById = useMemo(() => {
    const entries = new Map<string, string>();

    users.forEach((nextUser) => {
      entries.set(nextUser.id, nextUser.displayName);
    });

    if (user?.id) {
      entries.set(user.id, user.displayName);
    }

    return entries;
  }, [user?.displayName, user?.id, users]);
  const tenderBillingUpdatedAtLabel = useMemo(() => {
    if (!tenderBillingConfig?.updatedAt) {
      return null;
    }

    return new Intl.DateTimeFormat('fi-FI', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(tenderBillingConfig.updatedAt));
  }, [tenderBillingConfig?.updatedAt]);
  const tenderBillingUpdatedByLabel = useMemo(() => {
    const updaterId = tenderBillingConfig?.updatedByUserId?.trim();

    if (!updaterId) {
      return null;
    }

    if (updaterId === user?.id) {
      return 'Sinä';
    }

    return `Käyttäjä ${updaterId.slice(0, 8)}`;
  }, [tenderBillingConfig?.updatedByUserId, user?.id]);
  const accessState = useMemo(
    () =>
      deriveAccessState({
        platformRole: user?.role,
        organizationRole: user?.organizationRole,
        status: user?.status,
      }),
    [user?.organizationRole, user?.role, user?.status]
  );
  const workspaceName = organization?.name || user?.organizationName || 'Ei työtilaa';
  const applyTenderBillingTierChange = useCallback((nextTier: TenderUsageTier) => {
    if (nextTier === selectedTenderBillingTier) {
      toast.message(`Tarjousälyn käyttöpaketti on jo tasolla ${TENDER_BILLING_TIER_META[nextTier].label}.`);
      return;
    }

    const updatedAt = new Date().toISOString();
    const updatedByUserId = user?.id ?? null;
    const previousTier = selectedTenderBillingTier;

    setTenderBillingConfig({
      tier: nextTier,
      updatedAt,
      updatedByUserId,
    });
    setTenderBillingHistory((current) => {
      const nextEntry: TenderBillingHistoryEntry = {
        id: crypto.randomUUID(),
        previousTier,
        tier: nextTier,
        updatedAt,
        updatedByUserId,
      };

      return [nextEntry, ...current].slice(0, 20);
    });
    toast.success(`Tarjousälyn käyttöpaketti vaihdettu tasolle ${TENDER_BILLING_TIER_META[nextTier].label}.`);
  }, [selectedTenderBillingTier, setTenderBillingConfig, setTenderBillingHistory, user?.id]);
  const requestTierChangeConfirmation = useCallback((nextTier: TenderUsageTier) => {
    if (nextTier === selectedTenderBillingTier) {
      toast.message(`Tarjousälyn käyttöpaketti on jo tasolla ${TENDER_BILLING_TIER_META[nextTier].label}.`);
      return;
    }

    setPendingTierChange(nextTier);
  }, [selectedTenderBillingTier]);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    setSavedAt(null);
  }, [formData]);

  useEffect(() => {
    setAcknowledgeOverLimitChange(false);
    setAcknowledgeMissingImpactData(false);
  }, [pendingTierChange]);

  useEffect(() => {
    let active = true;

    if (!canManageSharedData || !organization?.id || !isSupabaseConfigured) {
      setTenderUsage30d(null);
      return () => {
        active = false;
      };
    }

    const loadTenderUsage30d = async () => {
      setTenderUsage30dLoading(true);

      try {
        const client = requireSupabase();
        const windowStartIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await client
          .from('tender_usage_events')
          .select('metered_units')
          .eq('organization_id', organization.id)
          .gte('occurred_at', windowStartIso)
          .order('occurred_at', { ascending: false })
          .limit(5000);

        if (error) {
          throw error;
        }

        const usedUnits = (data ?? []).reduce((sum, row) => {
          const units = typeof row.metered_units === 'number' ? row.metered_units : 0;
          return sum + Math.max(0, Math.floor(units));
        }, 0);

        if (active) {
          setTenderUsage30d(usedUnits);
        }
      } catch {
        if (active) {
          setTenderUsage30d(null);
        }
      } finally {
        if (active) {
          setTenderUsage30dLoading(false);
        }
      }
    };

    void loadTenderUsage30d();

    return () => {
      active = false;
    };
  }, [canManageSharedData, organization?.id]);

  return (
    <AppPageLayout pageType="registry" className="max-w-[1440px]">
      <AppPageHeader
        title="Asetukset"
        description="Yhteiset oletusarvot koko yritystyötilalle. Hallitse yritystietoja, tarjouksen oletuksia ja desktop-päivitysten lähdettä samasta näkymästä."
        eyebrow={<Badge variant="outline">Yritystason oletukset</Badge>}
      />

      <AppPageContentGrid pageType="registry">
        <div className="space-y-6 xl:col-span-8">
          {!canManageSharedData ? (
            <PageEmptyState
              icon={<Shield className="h-6 w-6" weight="duotone" />}
              title="Asetukset ovat lukittu tälle roolille"
              description="Vain yrityksen pääkäyttäjä tai Projektan ylläpito voi muuttaa yhteisiä oletusarvoja. Näet oikeusmallin ja vaikutusalueet oikean reunan paneelissa."
            />
          ) : (
            <>
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

              <Card className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Tarjousälyn käyttöpaketti</h2>
                  <p className="text-sm text-muted-foreground">
                    Valittu pakettitaso määrittää Tarjousälyn 30 päivän metered-yksikkörajan organisaatiolle.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">Vaikuttaa: Tarjousäly usage guardit</Badge>
                    <Badge variant="outline">Avaimen nimi: tender-intelligence-billing</Badge>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {(Object.keys(TENDER_BILLING_TIER_META) as TenderUsageTier[]).map((tier) => {
                    const isSelected = selectedTenderBillingTier === tier;
                    const tierLimit = getTenderUsageLimitState(null, tier).limits.maxMeteredUnits30d;

                    return (
                      <Button
                        key={tier}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        className="h-auto items-start justify-start px-4 py-4 text-left"
                        disabled={!canManageSharedData || !tenderBillingLoaded}
                        onClick={() => {
                          requestTierChangeConfirmation(tier);
                        }}
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">{TENDER_BILLING_TIER_META[tier].label}</p>
                          <p className="text-xs opacity-90">{TENDER_BILLING_TIER_META[tier].description}</p>
                          <p className="text-xs opacity-90">Raja: {tierLimit} yks / 30 pv</p>
                        </div>
                      </Button>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground">
                  Nykyinen taso: {TENDER_BILLING_TIER_META[selectedTenderBillingTier].label} ({selectedTenderBillingLimits.maxMeteredUnits30d} yks / 30 pv).
                </p>
                {(tenderBillingUpdatedAtLabel || tenderBillingUpdatedByLabel) && (
                  <p className="text-xs text-muted-foreground">
                    Viimeksi päivitetty {tenderBillingUpdatedAtLabel ?? 'ajankohta tuntematon'}
                    {tenderBillingUpdatedByLabel ? ` (${tenderBillingUpdatedByLabel})` : ''}.
                  </p>
                )}

                {tenderBillingHistory.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Viimeisimmät pakettimuutokset</p>
                    <div className="mt-2 space-y-1">
                      {tenderBillingHistory.slice(0, 5).map((entry) => {
                        const entryTierLabel = TENDER_BILLING_TIER_META[entry.tier]?.label ?? entry.tier;
                        const entryPreviousTierLabel = entry.previousTier
                          ? (TENDER_BILLING_TIER_META[entry.previousTier]?.label ?? entry.previousTier)
                          : null;
                        const entryDateLabel = new Intl.DateTimeFormat('fi-FI', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(entry.updatedAt));
                        const entryActorLabel = entry.updatedByUserId
                          ? entry.updatedByUserId === user?.id
                            ? 'Sinä'
                            : (userNameById.get(entry.updatedByUserId) ?? `Käyttäjä ${entry.updatedByUserId.slice(0, 8)}`)
                          : 'Tuntematon';

                        return (
                          <div key={entry.id} className="flex items-center justify-between gap-3 text-xs text-slate-600">
                            <p>
                              {entryDateLabel}: {entryPreviousTierLabel ? `${entryPreviousTierLabel} -> ${entryTierLabel}` : entryTierLabel} ({entryActorLabel})
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!canManageSharedData || entry.tier === selectedTenderBillingTier}
                              onClick={() => {
                                requestTierChangeConfirmation(entry.tier);
                              }}
                            >
                              Palauta tämä taso
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>

              <Dialog
                open={pendingTierChange !== null}
                onOpenChange={(open) => {
                  if (!open) {
                    setPendingTierChange(null);
                  }
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Vahvista käyttöpaketin muutos</DialogTitle>
                    <DialogDescription>
                      {pendingTierChange
                        ? `Vaihdetaanko Tarjousälyn käyttöpaketti tasolle ${TENDER_BILLING_TIER_META[pendingTierChange].label}? Nykyinen taso on ${TENDER_BILLING_TIER_META[selectedTenderBillingTier].label}.`
                        : 'Valitse uusi taso käyttöpakettikorteista tai history-listasta.'}
                    </DialogDescription>
                  </DialogHeader>
                  {pendingTierLimits && (
                    <div className={`rounded-xl border px-3 py-3 text-xs ${projectedImpactToneClassName}`}>
                      <p className="font-semibold">
                        Riskitaso: {projectedImpact.label}
                      </p>
                      <p>
                        Nykyinen raja: {selectedTenderBillingLimits.maxMeteredUnits30d} yks / 30 pv
                      </p>
                      <p>
                        Uusi raja: {pendingTierLimits.maxMeteredUnits30d} yks / 30 pv
                      </p>
                      <p>
                        Muutos: {pendingTierLimitDelta && pendingTierLimitDelta > 0 ? '+' : ''}{pendingTierLimitDelta ?? 0} yks
                      </p>
                      {tenderUsage30dLoading ? (
                        <p>Haetaan 30 pv käyttötilannetta...</p>
                      ) : tenderUsage30d != null && projectedRemainingUnits != null ? (
                        <>
                          <p>Käytetty 30 pv: {tenderUsage30d} yks</p>
                          <p>
                            Ennuste uuden tason jälkeen: {projectedUsagePercent ?? 0} % käytetty,{' '}
                            {projectedRemainingUnits >= 0
                              ? `${projectedRemainingUnits} yks jäljellä`
                              : `${Math.abs(projectedRemainingUnits)} yks yli rajan`}
                          </p>
                        </>
                      ) : (
                        <p>30 pv käyttötilannetta ei voitu ladata vaikutusarviota varten.</p>
                      )}
                      {requiresOverLimitAcknowledge && (
                        <label className="mt-2 flex items-start gap-2 rounded-lg border border-rose-200 bg-white/70 px-2 py-2 text-rose-900">
                          <Checkbox
                            checked={acknowledgeOverLimitChange}
                            onCheckedChange={(checked) => setAcknowledgeOverLimitChange(Boolean(checked))}
                            className="mt-0.5"
                          />
                          <span>
                            Ymmärrän, että tällä muutoksella organisaatio olisi heti yli uuden rajan ja osa Tarjousälyn toiminnoista voi estyä, kunnes käyttö tasaantuu tai pakettitaso nostetaan.
                          </span>
                        </label>
                      )}
                      {requiresMissingImpactAcknowledge && (
                        <label className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-white/70 px-2 py-2 text-amber-900">
                          <Checkbox
                            checked={acknowledgeMissingImpactData}
                            onCheckedChange={(checked) => setAcknowledgeMissingImpactData(Boolean(checked))}
                            className="mt-0.5"
                          />
                          <span>
                            Ymmärrän, että 30 päivän käyttötilannetta ei voitu ladata, ja teen pakettitason laskun ilman vaikutusarviota.
                          </span>
                        </label>
                      )}
                    </div>
                  )}
                  <DialogFooter>
                    {requiresOverLimitAcknowledge && !acknowledgeOverLimitChange && (
                      <p className="w-full text-xs text-rose-700 sm:mr-auto sm:max-w-[70%]">
                        Vahvistus on estetty, kunnes hyväksyt yllä olevan riskikuittauksen.
                      </p>
                    )}
                    {requiresMissingImpactAcknowledge && !acknowledgeMissingImpactData && (
                      <p className="w-full text-xs text-amber-700 sm:mr-auto sm:max-w-[70%]">
                        Vahvistus on estetty, kunnes hyväksyt vaikutusarvion puuttumiseen liittyvän kuittauksen.
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPendingTierChange(null)}
                    >
                      Peruuta
                    </Button>
                    <Button
                      type="button"
                      disabled={!canConfirmPendingTierChange}
                      onClick={() => {
                        if (!pendingTierChange) {
                          return;
                        }

                        applyTenderBillingTierChange(pendingTierChange);
                        setPendingTierChange(null);
                      }}
                    >
                      Vahvista muutos
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

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
            </>
          )}
        </div>

        <div className="space-y-6 xl:col-span-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" weight="duotone" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Sinun oikeutesi</h2>
                <p className="text-sm text-muted-foreground">Asetussivu kertoo heti, mitä voit hallita tässä työtilassa.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={accessState.roleBadgeVariant}>{accessState.roleBadgeLabel}</Badge>
              <Badge variant="outline">{getOrganizationRoleLabel(user?.organizationRole)}</Badge>
              <Badge variant="outline">{getPlatformRoleLabel(user?.role)}</Badge>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Työtila</p>
              <p className="mt-2 font-medium text-foreground">{workspaceName}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Asetusten muokkaus</p>
                <p className="mt-2 text-sm font-medium text-foreground">{accessState.canManageSharedData ? 'Kyllä' : 'Ei'}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Käyttäjähallinta</p>
                <p className="mt-2 text-sm font-medium text-foreground">{accessState.canManageUsers ? 'Kyllä' : 'Ei'}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4 sm:col-span-2 xl:col-span-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Sopimusasiat</p>
                <p className="mt-2 text-sm font-medium text-foreground">{accessState.canManageLegalDocuments ? 'Kyllä (vain Projektan ylläpito)' : 'Ei'}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mihin asetukset vaikuttavat</p>
              <h2 className="mt-2 text-lg font-semibold">Hallinnan rajat yhdellä silmäyksellä</h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Yritystiedot vaikuttavat tarjouksiin, laskuihin ja PDF-dokumentteihin koko työtilassa.</p>
              <p>Tarjouksen oletusarvot ohjaavat uusia tarjouksia ja tarjouseditorin lähtöasetuksia, mutta eivät muuta vanhoja tarjouksia jälkikäteen.</p>
              <p>Päivitysfeedin URL koskee vain desktop-sovellusta. Selainversio käyttää julkaisua ilman tätä asetusta.</p>
            </div>
          </Card>
        </div>
      </AppPageContentGrid>
    </AppPageLayout>
  );
}

import {
  Buildings,
  PencilSimple,
  Plus,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import {
  buildTenderProviderProfileReadiness,
  type TenderProviderProfileReadinessState,
} from '../lib/tender-provider-profile';
import type {
  TenderProviderConstraint,
  TenderProviderConstraintSeverity,
  TenderProviderConstraintType,
  TenderProviderContact,
  TenderProviderCredential,
  TenderProviderCredentialType,
  TenderProviderDeliveryScope,
  TenderProviderDocument,
  TenderProviderDocumentType,
  TenderProviderProfileDetails,
  TenderProviderResponseTemplate,
  TenderProviderResponseTemplateType,
  UpsertTenderProviderConstraintInput,
  UpsertTenderProviderContactInput,
  UpsertTenderProviderCredentialInput,
  UpsertTenderProviderDocumentInput,
  UpsertTenderProviderProfileInput,
  UpsertTenderProviderResponseTemplateInput,
} from '../types/tender-intelligence';

const DELIVERY_SCOPE_LABELS: Record<TenderProviderDeliveryScope, string> = {
  local: 'Paikallinen',
  regional: 'Alueellinen',
  national: 'Valtakunnallinen',
  international: 'Kansainvalinen',
};

const CREDENTIAL_TYPE_LABELS: Record<TenderProviderCredentialType, string> = {
  certificate: 'Todistus',
  qualification: 'Patevyys',
  insurance: 'Vakuutus',
  license: 'Lupa',
  other: 'Muu',
};

const CONSTRAINT_TYPE_LABELS: Record<TenderProviderConstraintType, string> = {
  eligibility: 'Kelpoisuus',
  capacity: 'Kapasiteetti',
  commercial: 'Kaupallinen',
  resourcing: 'Resursointi',
  compliance: 'Compliance',
  other: 'Muu',
};

const CONSTRAINT_SEVERITY_META: Record<TenderProviderConstraintSeverity, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  hard: { label: 'Kova rajoite', variant: 'destructive' },
  soft: { label: 'Pehmea rajoite', variant: 'outline' },
  info: { label: 'Huomio', variant: 'secondary' },
};

const DOCUMENT_TYPE_LABELS: Record<TenderProviderDocumentType, string> = {
  'case-study': 'Case-kuvaus',
  certificate: 'Todistus',
  insurance: 'Vakuutus',
  cv: 'CV',
  policy: 'Politiikka',
  other: 'Muu',
};

const TEMPLATE_TYPE_LABELS: Record<TenderProviderResponseTemplateType, string> = {
  'company-overview': 'Yritysesittely',
  'technical-approach': 'Tekninen ratkaisu',
  'delivery-plan': 'Toimitussuunnitelma',
  'pricing-note': 'Hinnoitteluhuomio',
  quality: 'Laatu',
  other: 'Muu',
};

function resolveReadinessVariant(state: TenderProviderProfileReadinessState) {
  if (state === 'ready') {
    return 'default' as const;
  }

  if (state === 'partial') {
    return 'outline' as const;
  }

  return 'secondary' as const;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Ei maarapaivaa';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fi-FI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function previewText(value: string | null | undefined, maxLength = 140) {
  const text = value?.trim() ?? '';

  if (!text) {
    return 'Ei sisaltoa.';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function toIsoDate(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return new Date(`${trimmed}T00:00:00.000Z`).toISOString();
}

interface SectionCardProps {
  title: string;
  description: string;
  countLabel: string;
  actionLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}

function SectionCard({ title, description, countLabel, actionLabel, onAdd, children }: SectionCardProps) {
  return (
    <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{countLabel}</Badge>
            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              {actionLabel}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">{children}</CardContent>
    </Card>
  );
}

interface ProviderProfileFormValues {
  companyName: string;
  businessId: string;
  websiteUrl: string;
  headquarters: string;
  summary: string;
  serviceArea: string;
  maxTravelKm: string;
  deliveryScope: TenderProviderDeliveryScope;
}

function createEmptyProviderProfileFormValues(): ProviderProfileFormValues {
  return {
    companyName: '',
    businessId: '',
    websiteUrl: '',
    headquarters: '',
    summary: '',
    serviceArea: '',
    maxTravelKm: '',
    deliveryScope: 'regional',
  };
}

function mapProviderProfileToFormValues(providerProfile: TenderProviderProfileDetails): ProviderProfileFormValues {
  return {
    companyName: providerProfile.profile.companyName,
    businessId: providerProfile.profile.businessId ?? '',
    websiteUrl: providerProfile.profile.websiteUrl ?? '',
    headquarters: providerProfile.profile.headquarters ?? '',
    summary: providerProfile.profile.summary ?? '',
    serviceArea: providerProfile.profile.serviceArea ?? '',
    maxTravelKm: providerProfile.profile.maxTravelKm == null ? '' : String(providerProfile.profile.maxTravelKm),
    deliveryScope: providerProfile.profile.deliveryScope,
  };
}

function parseProviderProfileFormValues(values: ProviderProfileFormValues): UpsertTenderProviderProfileInput {
  const companyName = values.companyName.trim();

  if (!companyName) {
    throw new Error('Anna tarjoajaprofiilille yrityksen nimi.');
  }

  const maxTravelKmValue = values.maxTravelKm.trim();
  const maxTravelKm = maxTravelKmValue ? Number.parseInt(maxTravelKmValue, 10) : null;

  if (maxTravelKm != null && (!Number.isFinite(maxTravelKm) || maxTravelKm < 0)) {
    throw new Error('Maksimimatkan tulee olla nolla tai positiivinen kokonaisluku.');
  }

  return {
    companyName,
    businessId: values.businessId.trim() || null,
    websiteUrl: values.websiteUrl.trim() || null,
    headquarters: values.headquarters.trim() || null,
    summary: values.summary.trim() || null,
    serviceArea: values.serviceArea.trim() || null,
    maxTravelKm,
    deliveryScope: values.deliveryScope,
  };
}

interface ProviderProfileDialogProps {
  open: boolean;
  providerProfile: TenderProviderProfileDetails | null;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: UpsertTenderProviderProfileInput) => Promise<unknown>;
}

function ProviderProfileDialog({ open, providerProfile, submitting = false, onOpenChange, onSubmit }: ProviderProfileDialogProps) {
  const [formValues, setFormValues] = useState<ProviderProfileFormValues>(createEmptyProviderProfileFormValues());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFormValues(createEmptyProviderProfileFormValues());
      setError(null);
      return;
    }

    setFormValues(providerProfile ? mapProviderProfileToFormValues(providerProfile) : createEmptyProviderProfileFormValues());
    setError(null);
  }, [open, providerProfile]);

  const handleSubmit = async () => {
    try {
      setError(null);
      await onSubmit(parseProviderProfileFormValues(formValues));
      onOpenChange(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Tarjoajaprofiilin tallennus epaonnistui.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{providerProfile ? 'Muokkaa tarjoajaprofiilia' : 'Luo tarjoajaprofiili'}</DialogTitle>
          <DialogDescription>
            Tarjoajaprofiili kokoaa yrityksen perusvalmiudet samaan domainiin ennen provider-aware go/no-go-, gap- ja draft-vaiheita.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="provider-company-name">Yrityksen nimi</Label>
            <Input
              id="provider-company-name"
              autoFocus
              value={formValues.companyName}
              onChange={(event) => setFormValues((current) => ({ ...current, companyName: event.target.value }))}
              placeholder="Esim. Kylpyhuone Oy"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-business-id">Y-tunnus</Label>
            <Input
              id="provider-business-id"
              value={formValues.businessId}
              onChange={(event) => setFormValues((current) => ({ ...current, businessId: event.target.value }))}
              placeholder="Esim. 1234567-8"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-website-url">Verkkosivu</Label>
            <Input
              id="provider-website-url"
              value={formValues.websiteUrl}
              onChange={(event) => setFormValues((current) => ({ ...current, websiteUrl: event.target.value }))}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-headquarters">Kotipaikka</Label>
            <Input
              id="provider-headquarters"
              value={formValues.headquarters}
              onChange={(event) => setFormValues((current) => ({ ...current, headquarters: event.target.value }))}
              placeholder="Esim. Helsinki"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-service-area">Palvelualue</Label>
            <Input
              id="provider-service-area"
              value={formValues.serviceArea}
              onChange={(event) => setFormValues((current) => ({ ...current, serviceArea: event.target.value }))}
              placeholder="Esim. Uusimaa / paakaupunkiseutu"
            />
          </div>

          <div className="space-y-2">
            <Label>Toimituslaajuus</Label>
            <Select value={formValues.deliveryScope} onValueChange={(value) => setFormValues((current) => ({ ...current, deliveryScope: value as TenderProviderDeliveryScope }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Valitse toimituslaajuus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Paikallinen</SelectItem>
                <SelectItem value="regional">Alueellinen</SelectItem>
                <SelectItem value="national">Valtakunnallinen</SelectItem>
                <SelectItem value="international">Kansainvalinen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-max-travel-km">Maksimimatka (km)</Label>
            <Input
              id="provider-max-travel-km"
              inputMode="numeric"
              value={formValues.maxTravelKm}
              onChange={(event) => setFormValues((current) => ({ ...current, maxTravelKm: event.target.value }))}
              placeholder="Esim. 150"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="provider-summary">Tiivistelma</Label>
            <Textarea
              id="provider-summary"
              rows={5}
              value={formValues.summary}
              onChange={(event) => setFormValues((current) => ({ ...current, summary: event.target.value }))}
              placeholder="Mita tarjoaja tekee hyvin, mihin hankkeisiin se sopii ja millaista toimituskykya profiili kuvaa?"
            />
          </div>

          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Peruuta</Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Tallennetaan...' : providerProfile ? 'Tallenna muutokset' : 'Luo profiili'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ProviderContactFormValues {
  fullName: string;
  roleTitle: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

function createEmptyContactFormValues(): ProviderContactFormValues {
  return {
    fullName: '',
    roleTitle: '',
    email: '',
    phone: '',
    isPrimary: false,
  };
}

function mapContactToFormValues(contact: TenderProviderContact): ProviderContactFormValues {
  return {
    fullName: contact.fullName,
    roleTitle: contact.roleTitle ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    isPrimary: contact.isPrimary,
  };
}

function parseContactFormValues(values: ProviderContactFormValues): UpsertTenderProviderContactInput {
  const fullName = values.fullName.trim();

  if (!fullName) {
    throw new Error('Anna yhteyshenkilon nimi.');
  }

  return {
    fullName,
    roleTitle: values.roleTitle.trim() || null,
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
    isPrimary: values.isPrimary,
  };
}

interface ProviderContactDialogProps {
  open: boolean;
  contact: TenderProviderContact | null;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: UpsertTenderProviderContactInput) => Promise<unknown>;
}

function ProviderContactDialog({ open, contact, submitting = false, onOpenChange, onSubmit }: ProviderContactDialogProps) {
  const [formValues, setFormValues] = useState<ProviderContactFormValues>(createEmptyContactFormValues());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFormValues(createEmptyContactFormValues());
      setError(null);
      return;
    }

    setFormValues(contact ? mapContactToFormValues(contact) : createEmptyContactFormValues());
    setError(null);
  }, [contact, open]);

  const handleSubmit = async () => {
    try {
      setError(null);
      await onSubmit(parseContactFormValues(formValues));
      onOpenChange(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Yhteyshenkilon tallennus epaonnistui.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{contact ? 'Muokkaa yhteyshenkiloa' : 'Lisaa yhteyshenkilo'}</DialogTitle>
          <DialogDescription>Merkitse tarjousvastuun ja asiakasrajapinnan kannalta olennaiset henkilöt profiilin sisaan.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="provider-contact-name">Nimi</Label>
            <Input
              id="provider-contact-name"
              autoFocus
              value={formValues.fullName}
              onChange={(event) => setFormValues((current) => ({ ...current, fullName: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-contact-role">Rooli</Label>
            <Input
              id="provider-contact-role"
              value={formValues.roleTitle}
              onChange={(event) => setFormValues((current) => ({ ...current, roleTitle: event.target.value }))}
              placeholder="Esim. tarjouspaallikko"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-contact-email">Sahkoposti</Label>
            <Input
              id="provider-contact-email"
              type="email"
              value={formValues.email}
              onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-contact-phone">Puhelin</Label>
            <Input
              id="provider-contact-phone"
              value={formValues.phone}
              onChange={(event) => setFormValues((current) => ({ ...current, phone: event.target.value }))}
            />
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 sm:mt-7">
            <Checkbox
              id="provider-contact-primary"
              checked={formValues.isPrimary}
              onCheckedChange={(checked) => setFormValues((current) => ({ ...current, isPrimary: checked === true }))}
            />
            <Label htmlFor="provider-contact-primary" className="cursor-pointer">Merkitse ensisijaiseksi yhteyshenkiloksi</Label>
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Peruuta</Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>{submitting ? 'Tallennetaan...' : 'Tallenna'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ProviderCredentialFormValues {
  title: string;
  issuer: string;
  credentialType: TenderProviderCredentialType;
  validUntil: string;
  documentReference: string;
  notes: string;
}

function createEmptyCredentialFormValues(): ProviderCredentialFormValues {
  return {
    title: '',
    issuer: '',
    credentialType: 'certificate',
    validUntil: '',
    documentReference: '',
    notes: '',
  };
}

function mapCredentialToFormValues(credential: TenderProviderCredential): ProviderCredentialFormValues {
  return {
    title: credential.title,
    issuer: credential.issuer ?? '',
    credentialType: credential.credentialType,
    validUntil: toDateInputValue(credential.validUntil),
    documentReference: credential.documentReference ?? '',
    notes: credential.notes ?? '',
  };
}

function parseCredentialFormValues(values: ProviderCredentialFormValues): UpsertTenderProviderCredentialInput {
  const title = values.title.trim();

  if (!title) {
    throw new Error('Anna patevyydelle otsikko.');
  }

  return {
    title,
    issuer: values.issuer.trim() || null,
    credentialType: values.credentialType,
    validUntil: toIsoDate(values.validUntil),
    documentReference: values.documentReference.trim() || null,
    notes: values.notes.trim() || null,
  };
}

interface ProviderCredentialDialogProps {
  open: boolean;
  credential: TenderProviderCredential | null;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: UpsertTenderProviderCredentialInput) => Promise<unknown>;
}

function ProviderCredentialDialog({ open, credential, submitting = false, onOpenChange, onSubmit }: ProviderCredentialDialogProps) {
  const [formValues, setFormValues] = useState<ProviderCredentialFormValues>(createEmptyCredentialFormValues());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFormValues(createEmptyCredentialFormValues());
      setError(null);
      return;
    }

    setFormValues(credential ? mapCredentialToFormValues(credential) : createEmptyCredentialFormValues());
    setError(null);
  }, [credential, open]);

  const handleSubmit = async () => {
    try {
      setError(null);
      await onSubmit(parseCredentialFormValues(formValues));
      onOpenChange(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Patevyyden tallennus epaonnistui.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{credential ? 'Muokkaa patevyytta' : 'Lisaa patevyys'}</DialogTitle>
          <DialogDescription>Tallenna voimassa olevat todistukset, vakuutukset ja luvat yhtenaiseen profiilirakenteeseen.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="provider-credential-title">Otsikko</Label>
            <Input
              id="provider-credential-title"
              autoFocus
              value={formValues.title}
              onChange={(event) => setFormValues((current) => ({ ...current, title: event.target.value }))}
              placeholder="Esim. RALA-patevyys"
            />
          </div>
          <div className="space-y-2">
            <Label>Patevyystyypi</Label>
            <Select value={formValues.credentialType} onValueChange={(value) => setFormValues((current) => ({ ...current, credentialType: value as TenderProviderCredentialType }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Valitse tyyppi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="certificate">Todistus</SelectItem>
                <SelectItem value="qualification">Patevyys</SelectItem>
                <SelectItem value="insurance">Vakuutus</SelectItem>
                <SelectItem value="license">Lupa</SelectItem>
                <SelectItem value="other">Muu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-credential-issuer">Myontaja</Label>
            <Input
              id="provider-credential-issuer"
              value={formValues.issuer}
              onChange={(event) => setFormValues((current) => ({ ...current, issuer: event.target.value }))}
              placeholder="Esim. RALA"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-credential-valid-until">Voimassa asti</Label>
            <Input
              id="provider-credential-valid-until"
              type="date"
              value={formValues.validUntil}
              onChange={(event) => setFormValues((current) => ({ ...current, validUntil: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-credential-document-reference">Dokumenttiviite</Label>
            <Input
              id="provider-credential-document-reference"
              value={formValues.documentReference}
              onChange={(event) => setFormValues((current) => ({ ...current, documentReference: event.target.value }))}
              placeholder="Esim. SharePoint/rala.pdf"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="provider-credential-notes">Huomiot</Label>
            <Textarea
              id="provider-credential-notes"
              rows={4}
              value={formValues.notes}
              onChange={(event) => setFormValues((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Lisaa tarvittaessa tarkennuksia kelpoisuudesta tai soveltuvuudesta."
            />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Peruuta</Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>{submitting ? 'Tallennetaan...' : 'Tallenna'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ProviderConstraintFormValues {
  title: string;
  constraintType: TenderProviderConstraintType;
  severity: TenderProviderConstraintSeverity;
  ruleText: string;
  mitigationNote: string;
}

function createEmptyConstraintFormValues(): ProviderConstraintFormValues {
  return {
    title: '',
    constraintType: 'other',
    severity: 'soft',
    ruleText: '',
    mitigationNote: '',
  };
}

function mapConstraintToFormValues(constraint: TenderProviderConstraint): ProviderConstraintFormValues {
  return {
    title: constraint.title,
    constraintType: constraint.constraintType,
    severity: constraint.severity,
    ruleText: constraint.ruleText,
    mitigationNote: constraint.mitigationNote ?? '',
  };
}

function parseConstraintFormValues(values: ProviderConstraintFormValues): UpsertTenderProviderConstraintInput {
  const title = values.title.trim();
  const ruleText = values.ruleText.trim();

  if (!title) {
    throw new Error('Anna rajoitteelle otsikko.');
  }

  if (!ruleText) {
    throw new Error('Kirjoita rajoitteen kuvaus.');
  }

  return {
    title,
    constraintType: values.constraintType,
    severity: values.severity,
    ruleText,
    mitigationNote: values.mitigationNote.trim() || null,
  };
}

interface ProviderConstraintDialogProps {
  open: boolean;
  constraint: TenderProviderConstraint | null;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: UpsertTenderProviderConstraintInput) => Promise<unknown>;
}

function ProviderConstraintDialog({ open, constraint, submitting = false, onOpenChange, onSubmit }: ProviderConstraintDialogProps) {
  const [formValues, setFormValues] = useState<ProviderConstraintFormValues>(createEmptyConstraintFormValues());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFormValues(createEmptyConstraintFormValues());
      setError(null);
      return;
    }

    setFormValues(constraint ? mapConstraintToFormValues(constraint) : createEmptyConstraintFormValues());
    setError(null);
  }, [constraint, open]);

  const handleSubmit = async () => {
    try {
      setError(null);
      await onSubmit(parseConstraintFormValues(formValues));
      onOpenChange(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Rajoitteen tallennus epaonnistui.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{constraint ? 'Muokkaa rajoitetta' : 'Lisaa rajoite'}</DialogTitle>
          <DialogDescription>Kirjaa tarjouspaatokseen vaikuttavat kovat rajat, pehmeat ehdot ja merkittavat sisaiset huomioit.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="provider-constraint-title">Otsikko</Label>
            <Input
              id="provider-constraint-title"
              autoFocus
              value={formValues.title}
              onChange={(event) => setFormValues((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Tyyppi</Label>
            <Select value={formValues.constraintType} onValueChange={(value) => setFormValues((current) => ({ ...current, constraintType: value as TenderProviderConstraintType }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Valitse tyyppi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="eligibility">Kelpoisuus</SelectItem>
                <SelectItem value="capacity">Kapasiteetti</SelectItem>
                <SelectItem value="commercial">Kaupallinen</SelectItem>
                <SelectItem value="resourcing">Resursointi</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="other">Muu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Vakavuus</Label>
            <Select value={formValues.severity} onValueChange={(value) => setFormValues((current) => ({ ...current, severity: value as TenderProviderConstraintSeverity }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Valitse vakavuus" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hard">Kova rajoite</SelectItem>
                <SelectItem value="soft">Pehmea rajoite</SelectItem>
                <SelectItem value="info">Huomio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="provider-constraint-rule-text">Kuvaus</Label>
            <Textarea
              id="provider-constraint-rule-text"
              rows={4}
              value={formValues.ruleText}
              onChange={(event) => setFormValues((current) => ({ ...current, ruleText: event.target.value }))}
              placeholder="Esim. emme osallistu hankkeisiin, joissa toteutusaika alittaa kuusi viikkoa"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="provider-constraint-mitigation-note">Mahdollinen lievennys</Label>
            <Textarea
              id="provider-constraint-mitigation-note"
              rows={3}
              value={formValues.mitigationNote}
              onChange={(event) => setFormValues((current) => ({ ...current, mitigationNote: event.target.value }))}
              placeholder="Jos ehtoon on olemassa poikkeus tai hallintamalli, kirjaa se tahan."
            />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Peruuta</Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>{submitting ? 'Tallennetaan...' : 'Tallenna'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ProviderDocumentFormValues {
  title: string;
  documentType: TenderProviderDocumentType;
  sourceReference: string;
  notes: string;
}

function createEmptyDocumentFormValues(): ProviderDocumentFormValues {
  return {
    title: '',
    documentType: 'other',
    sourceReference: '',
    notes: '',
  };
}

function mapDocumentToFormValues(document: TenderProviderDocument): ProviderDocumentFormValues {
  return {
    title: document.title,
    documentType: document.documentType,
    sourceReference: document.sourceReference ?? '',
    notes: document.notes ?? '',
  };
}

function parseDocumentFormValues(values: ProviderDocumentFormValues): UpsertTenderProviderDocumentInput {
  const title = values.title.trim();

  if (!title) {
    throw new Error('Anna dokumenttiviitteelle nimi.');
  }

  return {
    title,
    documentType: values.documentType,
    sourceReference: values.sourceReference.trim() || null,
    notes: values.notes.trim() || null,
  };
}

interface ProviderDocumentDialogProps {
  open: boolean;
  document: TenderProviderDocument | null;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: UpsertTenderProviderDocumentInput) => Promise<unknown>;
}

function ProviderDocumentDialog({ open, document, submitting = false, onOpenChange, onSubmit }: ProviderDocumentDialogProps) {
  const [formValues, setFormValues] = useState<ProviderDocumentFormValues>(createEmptyDocumentFormValues());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFormValues(createEmptyDocumentFormValues());
      setError(null);
      return;
    }

    setFormValues(document ? mapDocumentToFormValues(document) : createEmptyDocumentFormValues());
    setError(null);
  }, [document, open]);

  const handleSubmit = async () => {
    try {
      setError(null);
      await onSubmit(parseDocumentFormValues(formValues));
      onOpenChange(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Dokumenttiviitteen tallennus epaonnistui.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{document ? 'Muokkaa dokumenttiviitetta' : 'Lisaa dokumenttiviite'}</DialogTitle>
          <DialogDescription>Kirjaa profiiliin linkit tukidokumentteihin ilman, etta niita tarvitsee kopioida Tarjousalyyn uudestaan.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="provider-document-title">Nimi</Label>
            <Input
              id="provider-document-title"
              autoFocus
              value={formValues.title}
              onChange={(event) => setFormValues((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Tyyppi</Label>
            <Select value={formValues.documentType} onValueChange={(value) => setFormValues((current) => ({ ...current, documentType: value as TenderProviderDocumentType }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Valitse tyyppi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="case-study">Case-kuvaus</SelectItem>
                <SelectItem value="certificate">Todistus</SelectItem>
                <SelectItem value="insurance">Vakuutus</SelectItem>
                <SelectItem value="cv">CV</SelectItem>
                <SelectItem value="policy">Politiikka</SelectItem>
                <SelectItem value="other">Muu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-document-source-reference">Lahdeviite</Label>
            <Input
              id="provider-document-source-reference"
              value={formValues.sourceReference}
              onChange={(event) => setFormValues((current) => ({ ...current, sourceReference: event.target.value }))}
              placeholder="Esim. SharePoint / tiedostopolku"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="provider-document-notes">Huomiot</Label>
            <Textarea
              id="provider-document-notes"
              rows={4}
              value={formValues.notes}
              onChange={(event) => setFormValues((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Peruuta</Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>{submitting ? 'Tallennetaan...' : 'Tallenna'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ProviderResponseTemplateFormValues {
  title: string;
  templateType: TenderProviderResponseTemplateType;
  contentMd: string;
}

function createEmptyResponseTemplateFormValues(): ProviderResponseTemplateFormValues {
  return {
    title: '',
    templateType: 'other',
    contentMd: '',
  };
}

function mapResponseTemplateToFormValues(template: TenderProviderResponseTemplate): ProviderResponseTemplateFormValues {
  return {
    title: template.title,
    templateType: template.templateType,
    contentMd: template.contentMd,
  };
}

function parseResponseTemplateFormValues(values: ProviderResponseTemplateFormValues): UpsertTenderProviderResponseTemplateInput {
  const title = values.title.trim();
  const contentMd = values.contentMd.trim();

  if (!title) {
    throw new Error('Anna vastauspohjalle nimi.');
  }

  if (!contentMd) {
    throw new Error('Kirjoita vastauspohjan sisalto.');
  }

  return {
    title,
    templateType: values.templateType,
    contentMd,
  };
}

interface ProviderResponseTemplateDialogProps {
  open: boolean;
  template: TenderProviderResponseTemplate | null;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: UpsertTenderProviderResponseTemplateInput) => Promise<unknown>;
}

function ProviderResponseTemplateDialog({ open, template, submitting = false, onOpenChange, onSubmit }: ProviderResponseTemplateDialogProps) {
  const [formValues, setFormValues] = useState<ProviderResponseTemplateFormValues>(createEmptyResponseTemplateFormValues());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFormValues(createEmptyResponseTemplateFormValues());
      setError(null);
      return;
    }

    setFormValues(template ? mapResponseTemplateToFormValues(template) : createEmptyResponseTemplateFormValues());
    setError(null);
  }, [open, template]);

  const handleSubmit = async () => {
    try {
      setError(null);
      await onSubmit(parseResponseTemplateFormValues(formValues));
      onOpenChange(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Vastauspohjan tallennus epaonnistui.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? 'Muokkaa vastauspohjaa' : 'Lisaa vastauspohja'}</DialogTitle>
          <DialogDescription>Tallenna toistuvat vastausaihioit Markdown-muodossa, jotta luonnostus voi hyodyntaa niita myohemmin.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="provider-template-title">Nimi</Label>
            <Input
              id="provider-template-title"
              autoFocus
              value={formValues.title}
              onChange={(event) => setFormValues((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Tyyppi</Label>
            <Select value={formValues.templateType} onValueChange={(value) => setFormValues((current) => ({ ...current, templateType: value as TenderProviderResponseTemplateType }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Valitse tyyppi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="company-overview">Yritysesittely</SelectItem>
                <SelectItem value="technical-approach">Tekninen ratkaisu</SelectItem>
                <SelectItem value="delivery-plan">Toimitussuunnitelma</SelectItem>
                <SelectItem value="pricing-note">Hinnoitteluhuomio</SelectItem>
                <SelectItem value="quality">Laatu</SelectItem>
                <SelectItem value="other">Muu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="provider-template-content">Sisalto (Markdown)</Label>
            <Textarea
              id="provider-template-content"
              rows={10}
              value={formValues.contentMd}
              onChange={(event) => setFormValues((current) => ({ ...current, contentMd: event.target.value }))}
            />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Peruuta</Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>{submitting ? 'Tallennetaan...' : 'Tallenna'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TenderProviderProfilePanelProps {
  packageId: string;
  providerProfile: TenderProviderProfileDetails | null | undefined;
  submittingKey?: string | null;
  deletingItemKeys?: string[];
  onUpsertProfile: (packageId: string, input: UpsertTenderProviderProfileInput) => Promise<unknown>;
  onUpsertContact: (packageId: string, contactId: string | null, input: UpsertTenderProviderContactInput) => Promise<unknown>;
  onDeleteContact: (packageId: string, contactId: string) => Promise<void>;
  onUpsertCredential: (packageId: string, credentialId: string | null, input: UpsertTenderProviderCredentialInput) => Promise<unknown>;
  onDeleteCredential: (packageId: string, credentialId: string) => Promise<void>;
  onUpsertConstraint: (packageId: string, constraintId: string | null, input: UpsertTenderProviderConstraintInput) => Promise<unknown>;
  onDeleteConstraint: (packageId: string, constraintId: string) => Promise<void>;
  onUpsertDocument: (packageId: string, documentId: string | null, input: UpsertTenderProviderDocumentInput) => Promise<unknown>;
  onDeleteDocument: (packageId: string, documentId: string) => Promise<void>;
  onUpsertResponseTemplate: (
    packageId: string,
    templateId: string | null,
    input: UpsertTenderProviderResponseTemplateInput,
  ) => Promise<unknown>;
  onDeleteResponseTemplate: (packageId: string, templateId: string) => Promise<void>;
}

export default function TenderProviderProfilePanel({
  packageId,
  providerProfile,
  submittingKey = null,
  deletingItemKeys = [],
  onUpsertProfile,
  onUpsertContact,
  onDeleteContact,
  onUpsertCredential,
  onDeleteCredential,
  onUpsertConstraint,
  onDeleteConstraint,
  onUpsertDocument,
  onDeleteDocument,
  onUpsertResponseTemplate,
  onDeleteResponseTemplate,
}: TenderProviderProfilePanelProps) {
  const readiness = useMemo(() => buildTenderProviderProfileReadiness(providerProfile ?? null), [providerProfile]);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<TenderProviderContact | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<TenderProviderCredential | null>(null);
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [editingConstraint, setEditingConstraint] = useState<TenderProviderConstraint | null>(null);
  const [constraintDialogOpen, setConstraintDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<TenderProviderDocument | null>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TenderProviderResponseTemplate | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const sortedContacts = useMemo(
    () => [...(providerProfile?.contacts ?? [])].sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary)),
    [providerProfile?.contacts],
  );

  const providerSummary = providerProfile?.profile.summary?.trim() || 'Profiilin tiivistelmaa ei ole viela tallennettu.';

  const openNewContactDialog = () => {
    setEditingContact(null);
    setContactDialogOpen(true);
  };

  const openNewCredentialDialog = () => {
    setEditingCredential(null);
    setCredentialDialogOpen(true);
  };

  const openNewConstraintDialog = () => {
    setEditingConstraint(null);
    setConstraintDialogOpen(true);
  };

  const openNewDocumentDialog = () => {
    setEditingDocument(null);
    setDocumentDialogOpen(true);
  };

  const openNewTemplateDialog = () => {
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  };

  return (
    <>
      <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Buildings className="h-5 w-5 text-slate-500" />
                Tarjoajaprofiili
              </CardTitle>
              <CardDescription>
                Organisaation oma profiili toimii seuraavan vaiheen provider-aware analyysin pohjana: yhteystiedot, kelpoisuudet, sisaiset rajoitteet, dokumenttiviitteet ja vastauspohjat pysyvat paketin kontekstissa, mutta ovat organisaatiotasoisia.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={resolveReadinessVariant(readiness.state)}>{readiness.label}</Badge>
              {providerProfile && <Badge variant="secondary">{DELIVERY_SCOPE_LABELS[providerProfile.profile.deliveryScope]}</Badge>}
              <Button type="button" variant="outline" className="gap-2" onClick={() => setProfileDialogOpen(true)}>
                <PencilSimple className="h-4 w-4" />
                {providerProfile ? 'Muokkaa profiilia' : 'Luo profiili'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {providerProfile ? (
            <>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{providerProfile.profile.companyName}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{providerSummary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {providerProfile.profile.businessId && <Badge variant="outline">Y-tunnus: {providerProfile.profile.businessId}</Badge>}
                      {providerProfile.profile.headquarters && <Badge variant="outline">Kotipaikka: {providerProfile.profile.headquarters}</Badge>}
                      {providerProfile.profile.serviceArea && <Badge variant="outline">Palvelualue: {providerProfile.profile.serviceArea}</Badge>}
                      {providerProfile.profile.maxTravelKm != null && <Badge variant="outline">Maksimimatka: {providerProfile.profile.maxTravelKm} km</Badge>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white bg-white px-4 py-4 text-sm text-slate-700 shadow-sm lg:max-w-sm">
                    <p className="font-medium text-slate-950">Seuraavat taydennykset</p>
                    <div className="mt-3 space-y-2">
                      {readiness.nextActions.length > 0 ? readiness.nextActions.map((action, index) => (
                        <p key={`provider-next-action-${index}`} className="leading-6">{index + 1}. {action}</p>
                      )) : (
                        <p className="leading-6">Perusrunko on kasassa. Seuraavaksi provider-aware analyysi voi alkaa hyodyntaa profiilia automaattisesti.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Yhteyshenkilot</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{readiness.counts.contacts}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{readiness.counts.primaryContacts} ensisijaista kontaktia.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Patevyydet</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{readiness.counts.activeCredentials}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">Voimassa olevia kelpoisuuksia tai vakuutuksia.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Rajoitteet</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{readiness.counts.constraints}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">Sisaiset rajat ja tarjouskelpoisuuden ehdot.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Vastauspohjat</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{readiness.counts.responseTemplates}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">Uudelleenkaytettavaa sisaltoa luonnostukseen.</p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <SectionCard
                  title="Yhteyshenkilot"
                  description="Tarjouksen valmistelun ja toimittamisen vastuuroolit."
                  countLabel={`${sortedContacts.length} kontaktia`}
                  actionLabel="Lisaa"
                  onAdd={openNewContactDialog}
                >
                  {sortedContacts.length > 0 ? sortedContacts.map((contact) => {
                    const deleting = deletingItemKeys.includes(`provider-contact:${contact.id}`);

                    return (
                      <div key={contact.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-slate-950">{contact.fullName}</p>
                              {contact.isPrimary && <Badge>Ensisijainen</Badge>}
                            </div>
                            <p className="mt-2 text-sm text-slate-700">{contact.roleTitle || 'Roolia ei määritetty'}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">{contact.email || 'Ei sahkopostia'}{contact.phone ? ` | ${contact.phone}` : ''}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => { setEditingContact(contact); setContactDialogOpen(true); }}>
                              <PencilSimple className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="outline" size="sm" disabled={deleting} onClick={() => void onDeleteContact(packageId, contact.id)}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">Yhteyshenkiloita ei ole viela tallennettu.</div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Patevyydet ja todistukset"
                  description="RALA-, vakuutus- ja muu kelpoisuusdata, jota tarvitaan go/no-go:ssa ja liitevalmistelussa."
                  countLabel={`${providerProfile.credentials.length} rivi${providerProfile.credentials.length === 1 ? '' : 'a'}`}
                  actionLabel="Lisaa"
                  onAdd={openNewCredentialDialog}
                >
                  {providerProfile.credentials.length > 0 ? providerProfile.credentials.map((credential) => {
                    const deleting = deletingItemKeys.includes(`provider-credential:${credential.id}`);

                    return (
                      <div key={credential.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-slate-950">{credential.title}</p>
                              <Badge variant="outline">{CREDENTIAL_TYPE_LABELS[credential.credentialType]}</Badge>
                            </div>
                            <p className="mt-2 text-sm text-slate-700">{credential.issuer || 'Myontajaa ei merkitty'}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">Voimassa asti: {formatDate(credential.validUntil)}</p>
                            {credential.documentReference && <p className="mt-2 text-sm leading-6 text-slate-700">Viite: {credential.documentReference}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => { setEditingCredential(credential); setCredentialDialogOpen(true); }}>
                              <PencilSimple className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="outline" size="sm" disabled={deleting} onClick={() => void onDeleteCredential(packageId, credential.id)}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {credential.notes && <p className="mt-3 text-sm leading-6 text-slate-700">{credential.notes}</p>}
                      </div>
                    );
                  }) : (
                    <div className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">Voimassa olevia patevyyksia ei ole viela tallennettu.</div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Rajoitteet ja ehdot"
                  description="Sisaiset no-go-ehdot, kapasiteetti- tai compliance-rajat."
                  countLabel={`${providerProfile.constraints.length} rivi${providerProfile.constraints.length === 1 ? '' : 'a'}`}
                  actionLabel="Lisaa"
                  onAdd={openNewConstraintDialog}
                >
                  {providerProfile.constraints.length > 0 ? providerProfile.constraints.map((constraint) => {
                    const deleting = deletingItemKeys.includes(`provider-constraint:${constraint.id}`);
                    const severityMeta = CONSTRAINT_SEVERITY_META[constraint.severity];

                    return (
                      <div key={constraint.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-slate-950">{constraint.title}</p>
                              <Badge variant={severityMeta.variant}>{severityMeta.label}</Badge>
                              <Badge variant="outline">{CONSTRAINT_TYPE_LABELS[constraint.constraintType]}</Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-700">{constraint.ruleText}</p>
                            {constraint.mitigationNote && <p className="mt-2 text-sm leading-6 text-slate-700">Lievennys: {constraint.mitigationNote}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => { setEditingConstraint(constraint); setConstraintDialogOpen(true); }}>
                              <PencilSimple className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="outline" size="sm" disabled={deleting} onClick={() => void onDeleteConstraint(packageId, constraint.id)}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">Rajoitteita ei ole viela kirjattu.</div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Dokumenttiviitteet"
                  description="Linkit olemassa oleviin caseihin, vakuutuksiin, sertifikaatteihin ja muihin tukidokumentteihin."
                  countLabel={`${providerProfile.documents.length} rivi${providerProfile.documents.length === 1 ? '' : 'a'}`}
                  actionLabel="Lisaa"
                  onAdd={openNewDocumentDialog}
                >
                  {providerProfile.documents.length > 0 ? providerProfile.documents.map((document) => {
                    const deleting = deletingItemKeys.includes(`provider-document:${document.id}`);

                    return (
                      <div key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-slate-950">{document.title}</p>
                              <Badge variant="outline">{DOCUMENT_TYPE_LABELS[document.documentType]}</Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-700">{document.sourceReference || 'Lahdeviitetta ei ole merkitty.'}</p>
                            {document.notes && <p className="mt-2 text-sm leading-6 text-slate-700">{document.notes}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => { setEditingDocument(document); setDocumentDialogOpen(true); }}>
                              <PencilSimple className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="outline" size="sm" disabled={deleting} onClick={() => void onDeleteDocument(packageId, document.id)}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">Dokumenttiviitteita ei ole viela lisatty.</div>
                  )}
                </SectionCard>
              </div>

              <SectionCard
                title="Vastauspohjat"
                description="Toistuvat yritysesittelyt, tekniset ratkaisukuvaukset ja muut luonnostuksessa kaytettavat aihiot."
                countLabel={`${providerProfile.responseTemplates.length} pohja${providerProfile.responseTemplates.length === 1 ? '' : 'a'}`}
                actionLabel="Lisaa"
                onAdd={openNewTemplateDialog}
              >
                {providerProfile.responseTemplates.length > 0 ? providerProfile.responseTemplates.map((template) => {
                  const deleting = deletingItemKeys.includes(`provider-template:${template.id}`);

                  return (
                    <div key={template.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-slate-950">{template.title}</p>
                            <Badge variant="outline">{TEMPLATE_TYPE_LABELS[template.templateType]}</Badge>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{previewText(template.contentMd, 220)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => { setEditingTemplate(template); setTemplateDialogOpen(true); }}>
                            <PencilSimple className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" size="sm" disabled={deleting} onClick={() => void onDeleteResponseTemplate(packageId, template.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">Paivitetty {formatDate(template.updatedAt)}</p>
                    </div>
                  );
                }) : (
                  <div className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">Vastauspohjia ei ole viela tallennettu.</div>
                )}
              </SectionCard>
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-950">
                    <WarningCircle className="h-5 w-5 text-slate-500" />
                    <p className="font-medium">Tarjoajaprofiili puuttuu viela</p>
                  </div>
                  <p className="max-w-3xl text-sm leading-6 text-slate-700">
                    Profiilin avulla seuraavat vaiheet voivat arvioida tarjoajan kelpoisuutta, nostaa sisaiset no-go-rajat ja rakentaa ensiluonnoksen organisaation omista aineksista eika vain tarjouspyynnon tekstista.
                  </p>
                  <div className="space-y-2">
                    {readiness.nextActions.map((action, index) => (
                      <p key={`provider-empty-next-action-${index}`} className="text-sm leading-6 text-slate-700">{index + 1}. {action}</p>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:min-w-56">
                  <Button type="button" className="justify-between" onClick={() => setProfileDialogOpen(true)}>
                    Luo tarjoajaprofiili
                    <Plus className="h-4 w-4" />
                  </Button>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                    <p className="font-medium text-slate-950">Mita profiiliin kuuluu</p>
                    <p className="mt-2 leading-6">Yrityksen runkotiedot, ensisijaiset kontaktit, kelpoisuudet, sisaiset rajoitteet, dokumenttiviitteet ja vastauspohjat.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ProviderProfileDialog
        open={profileDialogOpen}
        providerProfile={providerProfile ?? null}
        submitting={submittingKey === 'provider-profile'}
        onOpenChange={setProfileDialogOpen}
        onSubmit={(input) => onUpsertProfile(packageId, input)}
      />

      <ProviderContactDialog
        open={contactDialogOpen}
        contact={editingContact}
        submitting={submittingKey === `provider-contact:${editingContact?.id ?? 'new'}`}
        onOpenChange={setContactDialogOpen}
        onSubmit={(input) => onUpsertContact(packageId, editingContact?.id ?? null, input)}
      />

      <ProviderCredentialDialog
        open={credentialDialogOpen}
        credential={editingCredential}
        submitting={submittingKey === `provider-credential:${editingCredential?.id ?? 'new'}`}
        onOpenChange={setCredentialDialogOpen}
        onSubmit={(input) => onUpsertCredential(packageId, editingCredential?.id ?? null, input)}
      />

      <ProviderConstraintDialog
        open={constraintDialogOpen}
        constraint={editingConstraint}
        submitting={submittingKey === `provider-constraint:${editingConstraint?.id ?? 'new'}`}
        onOpenChange={setConstraintDialogOpen}
        onSubmit={(input) => onUpsertConstraint(packageId, editingConstraint?.id ?? null, input)}
      />

      <ProviderDocumentDialog
        open={documentDialogOpen}
        document={editingDocument}
        submitting={submittingKey === `provider-document:${editingDocument?.id ?? 'new'}`}
        onOpenChange={setDocumentDialogOpen}
        onSubmit={(input) => onUpsertDocument(packageId, editingDocument?.id ?? null, input)}
      />

      <ProviderResponseTemplateDialog
        open={templateDialogOpen}
        template={editingTemplate}
        submitting={submittingKey === `provider-template:${editingTemplate?.id ?? 'new'}`}
        onOpenChange={setTemplateDialogOpen}
        onSubmit={(input) => onUpsertResponseTemplate(packageId, editingTemplate?.id ?? null, input)}
      />
    </>
  );
}
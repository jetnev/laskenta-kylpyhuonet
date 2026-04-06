import { Buildings, Database, PencilSimple, Plus, Trash, ArrowsClockwise, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import {
  formatCountLabel,
  formatTenderCurrency,
  formatTenderTimestamp,
  getTenderTextPreview,
  TENDER_REFERENCE_PROFILE_SOURCE_KIND_META,
} from '../lib/tender-intelligence-ui';
import {
  buildTenderReferenceImportPreview,
  parseTenderReferenceImportFile,
  parseTenderReferenceImportText,
  type TenderReferenceImportParsedRow,
  type TenderReferenceImportPreview,
} from '../lib/tender-reference-import';
import type {
  CreateTenderReferenceProfileInput,
  TenderReferenceProfile,
  TenderReferenceProfileSourceKind,
  UpdateTenderReferenceProfileInput,
} from '../types/tender-intelligence';

interface TenderReferenceCorpusPanelProps {
  referenceProfiles: TenderReferenceProfile[];
  selectedPackageId?: string | null;
  selectedPackageName?: string | null;
  submittingProfileId?: string | 'new' | 'import' | null;
  deletingProfileIds?: string[];
  importingProfiles?: boolean;
  recomputingPackageId?: string | null;
  onCreateProfile: (input: CreateTenderReferenceProfileInput) => Promise<unknown>;
  onImportProfiles: (inputs: CreateTenderReferenceProfileInput[]) => Promise<unknown>;
  onUpdateProfile: (profileId: string, input: UpdateTenderReferenceProfileInput) => Promise<unknown>;
  onDeleteProfile: (profileId: string) => Promise<void>;
  onRecomputeSuggestions?: (packageId: string) => Promise<unknown>;
}

interface ReferenceProfileFormValues {
  title: string;
  clientName: string;
  projectType: string;
  description: string;
  location: string;
  completedYear: string;
  contractValue: string;
  tags: string;
  sourceKind: TenderReferenceProfileSourceKind;
  sourceReference: string;
}

function createEmptyFormValues(): ReferenceProfileFormValues {
  return {
    title: '',
    clientName: '',
    projectType: '',
    description: '',
    location: '',
    completedYear: '',
    contractValue: '',
    tags: '',
    sourceKind: 'manual',
    sourceReference: '',
  };
}

function mapProfileToFormValues(profile: TenderReferenceProfile): ReferenceProfileFormValues {
  return {
    title: profile.title,
    clientName: profile.clientName ?? '',
    projectType: profile.projectType ?? '',
    description: profile.description ?? '',
    location: profile.location ?? '',
    completedYear: profile.completedYear == null ? '' : String(profile.completedYear),
    contractValue: profile.contractValue == null ? '' : String(profile.contractValue),
    tags: (profile.tags ?? []).join(', '),
    sourceKind: profile.sourceKind,
    sourceReference: profile.sourceReference ?? '',
  };
}

function parseReferenceProfileFormValues(values: ReferenceProfileFormValues) {
  const title = values.title.trim();

  if (!title) {
    throw new Error('Anna referenssille otsikko.');
  }

  const completedYear = values.completedYear.trim();
  const contractValue = values.contractValue.trim();
  const parsedCompletedYear = completedYear ? Number.parseInt(completedYear, 10) : null;
  const parsedContractValue = contractValue ? Number.parseFloat(contractValue.replace(',', '.')) : null;

  if (parsedCompletedYear != null && (!Number.isFinite(parsedCompletedYear) || parsedCompletedYear < 1900 || parsedCompletedYear > 2100)) {
    throw new Error('Valmistumisvuoden pitää olla välillä 1900–2100.');
  }

  if (parsedContractValue != null && (!Number.isFinite(parsedContractValue) || parsedContractValue < 0)) {
    throw new Error('Urakka-arvon pitää olla nolla tai positiivinen luku.');
  }

  const tags = values.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    title,
    clientName: values.clientName.trim() || null,
    projectType: values.projectType.trim() || null,
    description: values.description.trim() || null,
    location: values.location.trim() || null,
    completedYear: parsedCompletedYear,
    contractValue: parsedContractValue,
    tags: tags.length > 0 ? tags : null,
    sourceKind: values.sourceKind,
    sourceReference: values.sourceReference.trim() || null,
  } satisfies CreateTenderReferenceProfileInput;
}

interface ReferenceProfileDialogProps {
  open: boolean;
  profile: TenderReferenceProfile | null;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateTenderReferenceProfileInput | UpdateTenderReferenceProfileInput) => Promise<unknown>;
}

function ReferenceProfileDialog({
  open,
  profile,
  submitting = false,
  onOpenChange,
  onSubmit,
}: ReferenceProfileDialogProps) {
  const [formValues, setFormValues] = useState<ReferenceProfileFormValues>(createEmptyFormValues());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFormValues(createEmptyFormValues());
      setError(null);
      return;
    }

    setFormValues(profile ? mapProfileToFormValues(profile) : createEmptyFormValues());
    setError(null);
  }, [open, profile]);

  const handleSubmit = async () => {
    try {
      setError(null);
      await onSubmit(parseReferenceProfileFormValues(formValues));
      onOpenChange(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Referenssiprofiilin tallennus epäonnistui.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{profile ? 'Muokkaa referenssiprofiilia' : 'Lisää referenssiprofiili'}</DialogTitle>
          <DialogDescription>
            Organisaation referenssikorpus pidetään tässä vaiheessa Tarjousälyn omana domaininaan. Profiileja voidaan käyttää deterministiseen referenssimatchaukseen ilman kytkentää nykyiseen quote- tai project-dataan.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="reference-title">Otsikko</Label>
            <Input
              id="reference-title"
              autoFocus
              value={formValues.title}
              onChange={(event) => setFormValues((current) => ({ ...current, title: event.target.value }))}
              placeholder="Esim. Kylpyhuoneremontti / As Oy Aurinkopiha"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-client">Asiakas</Label>
            <Input
              id="reference-client"
              value={formValues.clientName}
              onChange={(event) => setFormValues((current) => ({ ...current, clientName: event.target.value }))}
              placeholder="Esim. As Oy Aurinkopiha"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-project-type">Projektityyppi</Label>
            <Input
              id="reference-project-type"
              value={formValues.projectType}
              onChange={(event) => setFormValues((current) => ({ ...current, projectType: event.target.value }))}
              placeholder="Esim. kylpyhuoneremontti"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-location">Sijainti</Label>
            <Input
              id="reference-location"
              value={formValues.location}
              onChange={(event) => setFormValues((current) => ({ ...current, location: event.target.value }))}
              placeholder="Esim. Helsinki"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-completed-year">Valmistumisvuosi</Label>
            <Input
              id="reference-completed-year"
              inputMode="numeric"
              value={formValues.completedYear}
              onChange={(event) => setFormValues((current) => ({ ...current, completedYear: event.target.value }))}
              placeholder="Esim. 2024"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-contract-value">Urakka-arvo</Label>
            <Input
              id="reference-contract-value"
              inputMode="decimal"
              value={formValues.contractValue}
              onChange={(event) => setFormValues((current) => ({ ...current, contractValue: event.target.value }))}
              placeholder="Esim. 85000"
            />
          </div>

          <div className="space-y-2">
            <Label>Lähteen tyyppi</Label>
            <Select
              value={formValues.sourceKind}
              onValueChange={(value) => setFormValues((current) => ({ ...current, sourceKind: value as TenderReferenceProfileSourceKind }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Valitse lähteen tyyppi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manuaalinen</SelectItem>
                <SelectItem value="imported">Tuotu</SelectItem>
                <SelectItem value="other">Muu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-source-reference">Lähdeviite</Label>
            <Input
              id="reference-source-reference"
              value={formValues.sourceReference}
              onChange={(event) => setFormValues((current) => ({ ...current, sourceReference: event.target.value }))}
              placeholder="Esim. SharePoint / CRM / tiedostonimi"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="reference-tags">Tagit</Label>
            <Input
              id="reference-tags"
              value={formValues.tags}
              onChange={(event) => setFormValues((current) => ({ ...current, tags: event.target.value }))}
              placeholder="Esim. kylpyhuone, linjasaneeraus, julkinen"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="reference-description">Kuvaus</Label>
            <Textarea
              id="reference-description"
              rows={5}
              value={formValues.description}
              onChange={(event) => setFormValues((current) => ({ ...current, description: event.target.value }))}
              placeholder="Kuvaa referenssin sisältö, laajuus ja olennaiset vahvuudet hakua varten."
            />
          </div>

          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Peruuta
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Tallennetaan...' : profile ? 'Tallenna muutokset' : 'Lisää referenssi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function resolveImportRowVariant(status: TenderReferenceImportPreview['rows'][number]['status']) {
  if (status === 'importable') {
    return 'default' as const;
  }

  if (status === 'invalid') {
    return 'destructive' as const;
  }

  return 'outline' as const;
}

function resolveImportRowLabel(status: TenderReferenceImportPreview['rows'][number]['status']) {
  if (status === 'importable') {
    return 'Tuodaan';
  }

  if (status === 'duplicate_existing') {
    return 'Jo korpuksessa';
  }

  if (status === 'duplicate_batch') {
    return 'Duplikaatti erässä';
  }

  return 'Virheellinen';
}

interface ReferenceProfileImportDialogProps {
  open: boolean;
  existingProfiles: TenderReferenceProfile[];
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (inputs: CreateTenderReferenceProfileInput[]) => Promise<unknown>;
}

function ReferenceProfileImportDialog({
  open,
  existingProfiles,
  submitting = false,
  onOpenChange,
  onSubmit,
}: ReferenceProfileImportDialogProps) {
  const [importText, setImportText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileRows, setFileRows] = useState<TenderReferenceImportParsedRow[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setImportText('');
      setFileName(null);
      setFileRows(null);
      setFileError(null);
    }
  }, [open]);

  const previewState = useMemo(() => {
    const emptyPreview = buildTenderReferenceImportPreview({
      parsedRows: [],
      existingProfiles,
    });

    if (fileRows) {
      return {
        preview: buildTenderReferenceImportPreview({
          parsedRows: fileRows,
          existingProfiles,
        }),
        parseError: fileError,
      };
    }

    if (!importText.trim()) {
      return {
        preview: emptyPreview,
        parseError: fileError,
      };
    }

    try {
      return {
        preview: buildTenderReferenceImportPreview({
          parsedRows: parseTenderReferenceImportText(importText),
          existingProfiles,
        }),
        parseError: null,
      };
    } catch (error) {
      return {
        preview: emptyPreview,
        parseError: error instanceof Error ? error.message : 'Tuontiaineiston lukeminen epäonnistui.',
      };
    }
  }, [existingProfiles, fileError, fileRows, importText]);

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setImportText(event.target.value);
    setFileRows(null);
    setFileName(null);
    setFileError(null);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    try {
      const parsedRows = await parseTenderReferenceImportFile(file);
      setFileName(file.name);
      setFileRows(parsedRows);
      setImportText('');
      setFileError(null);
    } catch (error) {
      setFileName(file.name);
      setFileRows(null);
      setImportText('');
      setFileError(error instanceof Error ? error.message : 'Tiedoston lukeminen epäonnistui.');
    } finally {
      event.target.value = '';
    }
  };

  const handleImport = async () => {
    if (previewState.preview.importableProfiles.length < 1) {
      return;
    }

    await onSubmit(previewState.preview.importableProfiles);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Tuo referenssiprofiileja</DialogTitle>
          <DialogDescription>
            Liitä CSV-, TSV- tai JSON-aineisto tai lataa tiedosto. Tarjousäly näyttää ensin deduplikointiesikatselun ja tuo vain uudet profiilit organisaation referenssikorpukseen.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reference-import-file">Tuo tiedostosta</Label>
              <Input
                id="reference-import-file"
                type="file"
                accept=".csv,.tsv,.xlsx,.json"
                onChange={(event) => {
                  void handleFileChange(event);
                }}
              />
              {fileName && <Badge variant="outline">Valittu tiedosto: {fileName}</Badge>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference-import-text">Tai liitä tuontiaineisto</Label>
              <Textarea
                id="reference-import-text"
                rows={14}
                value={importText}
                onChange={handleTextChange}
                placeholder={[
                  'Otsikko\tAsiakas\tProjektityyppi\tSijainti\tValmistumisvuosi\tUrakka-arvo\tTagit\tLähdeviite',
                  'Kylpyhuoneremontti / As Oy Aurinkopiha\tAs Oy Aurinkopiha\tkylpyhuoneremontti\tEspoo\t2024\t85000\tkylpyhuone; saneeraus\tCRM-101',
                ].join('\n')}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
              Tuetut sarakkeet: otsikko, asiakas, projektityyppi, kuvaus, sijainti, valmistumisvuosi, urakka-arvo, tagit, lähdetyyppi ja lähdeviite. JSON-tuonnissa avaimet voivat olla joko näillä nimillä tai yleisillä englanninkielisillä aliasnimillä.
            </div>

            {previewState.parseError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">
                <div className="flex items-center gap-2 font-medium">
                  <WarningCircle className="h-4 w-4" />
                  Tuontiaineistoa ei voitu lukea
                </div>
                <p className="mt-1">{previewState.parseError}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-medium text-slate-950">Deduplikointiesikatselu</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{previewState.preview.summary.totalRows} riviä</Badge>
                <Badge variant="default">{previewState.preview.summary.importableCount} uutta</Badge>
                <Badge variant="outline">{previewState.preview.summary.duplicateExistingCount} jo korpuksessa</Badge>
                <Badge variant="outline">{previewState.preview.summary.duplicateBatchCount} duplikaattia erässä</Badge>
                <Badge variant={previewState.preview.summary.invalidCount > 0 ? 'destructive' : 'outline'}>{previewState.preview.summary.invalidCount} virheellistä</Badge>
              </div>
            </div>

            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {previewState.preview.rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed px-4 py-8 text-sm leading-6 text-muted-foreground">
                  Liitä tai lataa aineisto nähdäksesi tuonnin esikatselun.
                </div>
              ) : (
                previewState.preview.rows.map((row) => (
                  <div key={`reference-import-row-${row.rowNumber}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-950">{row.rawLabel}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{row.reason}</p>
                        {row.duplicateOfRowNumber != null && (
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">Duplikaatti suhteessa riviin {row.duplicateOfRowNumber}.</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={resolveImportRowVariant(row.status)}>{resolveImportRowLabel(row.status)}</Badge>
                        <span className="text-xs text-muted-foreground">Rivi {row.rowNumber}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Peruuta
          </Button>
          <Button
            onClick={() => {
              void handleImport();
            }}
            disabled={submitting || previewState.preview.importableProfiles.length < 1 || Boolean(previewState.parseError)}
          >
            {submitting ? 'Tuodaan...' : `Tuo ${previewState.preview.importableProfiles.length} uutta referenssiä`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TenderReferenceCorpusPanel({
  referenceProfiles,
  selectedPackageId = null,
  selectedPackageName = null,
  submittingProfileId = null,
  deletingProfileIds = [],
  importingProfiles = false,
  recomputingPackageId = null,
  onCreateProfile,
  onImportProfiles,
  onUpdateProfile,
  onDeleteProfile,
  onRecomputeSuggestions,
}: TenderReferenceCorpusPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<TenderReferenceProfile | null>(null);
  const recomputingCurrentPackage = Boolean(selectedPackageId && recomputingPackageId === selectedPackageId);

  return (
    <>
      <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4.5 w-4.5 text-slate-500" />
                Organisaation referenssikorpus
              </CardTitle>
              <CardDescription>
                Tämä corpus on Tarjousälyn oma org-scoped referenssidomain. Profiilit eivät vielä tule quote- tai project-domainista, vaan toimivat erillisenä, hallittuna lähtötietona deterministiselle referenssimatchaukselle.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={importingProfiles}
                onClick={() => {
                  setImportDialogOpen(true);
                }}
              >
                <UploadSimple className="mr-2 h-4 w-4" />
                {importingProfiles ? 'Tuodaan referenssejä...' : 'Tuo referenssejä'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedPackageId || !onRecomputeSuggestions || recomputingCurrentPackage}
                onClick={() => {
                  if (!selectedPackageId || !onRecomputeSuggestions) {
                    return;
                  }

                  void onRecomputeSuggestions(selectedPackageId);
                }}
              >
                <ArrowsClockwise className="mr-2 h-4 w-4" />
                {recomputingCurrentPackage ? 'Päivitetään ehdotuksia...' : 'Päivitä valitun paketin ehdotukset'}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setEditingProfile(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Lisää referenssi
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{formatCountLabel(referenceProfiles.length, 'referenssi')}</Badge>
            {selectedPackageName && <Badge variant="outline">Valittu paketti: {selectedPackageName}</Badge>}
            {!selectedPackageId && <Badge variant="secondary">Valitse paketti nähdäksesi suggestionit työtilassa</Badge>}
          </div>

          {referenceProfiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-4 py-8 text-sm leading-6 text-muted-foreground">
              Organisaation referenssikorpus on vielä tyhjä. Lisää ensimmäinen referenssiprofiili, niin Tarjousäly voi alkaa ehdottaa osumia tunnistetuille referenssivaatimuksille.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {referenceProfiles.map((profile) => {
                const sourceKindMeta = TENDER_REFERENCE_PROFILE_SOURCE_KIND_META[profile.sourceKind];
                const deleting = deletingProfileIds.includes(profile.id);
                const submitting = submittingProfileId === profile.id;

                return (
                  <div key={profile.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={sourceKindMeta.variant}>{sourceKindMeta.label}</Badge>
                          {profile.projectType && <Badge variant="outline">{profile.projectType}</Badge>}
                          {profile.location && <Badge variant="outline">{profile.location}</Badge>}
                        </div>
                        <p className="text-sm font-medium text-slate-950">{profile.title}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={deleting || submitting}
                          onClick={() => {
                            setEditingProfile(profile);
                            setDialogOpen(true);
                          }}
                        >
                          <PencilSimple className="mr-2 h-4 w-4" />
                          Muokkaa
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={deleting || submitting}
                          onClick={() => {
                            void onDeleteProfile(profile.id);
                          }}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          {deleting ? 'Poistetaan...' : 'Poista'}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {profile.clientName && <span>Asiakas: {profile.clientName}</span>}
                      {profile.completedYear != null && <span>Valmistunut: {profile.completedYear}</span>}
                      {profile.contractValue != null && <span>Arvo: {formatTenderCurrency(profile.contractValue)}</span>}
                    </div>

                    {profile.description && <p className="mt-3 text-sm leading-6 text-slate-700">{getTenderTextPreview(profile.description, 240)}</p>}

                    {profile.tags && profile.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs leading-5 text-muted-foreground">
                      {profile.sourceReference && (
                        <span className="flex items-center gap-1">
                          <Buildings className="h-3.5 w-3.5" />
                          {profile.sourceReference}
                        </span>
                      )}
                      <span>Päivitetty {formatTenderTimestamp(profile.updatedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ReferenceProfileDialog
        open={dialogOpen}
        profile={editingProfile}
        submitting={submittingProfileId === 'new' || (editingProfile != null && submittingProfileId === editingProfile.id)}
        onOpenChange={setDialogOpen}
        onSubmit={(input) =>
          editingProfile
            ? onUpdateProfile(editingProfile.id, input as UpdateTenderReferenceProfileInput)
            : onCreateProfile(input as CreateTenderReferenceProfileInput)
        }
      />

      <ReferenceProfileImportDialog
        open={importDialogOpen}
        existingProfiles={referenceProfiles}
        submitting={importingProfiles || submittingProfileId === 'import'}
        onOpenChange={setImportDialogOpen}
        onSubmit={onImportProfiles}
      />
    </>
  );
}
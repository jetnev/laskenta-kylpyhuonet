import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, FileText, ShieldCheck } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/use-auth';
import {
  createLegalDocumentDraft,
  deleteLegalDocumentDraft,
  formatLegalHash,
  getLegalAcceptanceSourceLabel,
  getLegalDocumentStatusLabel,
  getLegalDocumentTypeLabel,
  getLegalRequirementLabel,
  groupLegalDocumentVersionsByType,
  listLegalAcceptanceAudit,
  listLegalDocumentVersionsForManagement,
  publishLegalDocumentVersion,
  renderLegalDocumentHtml,
  suggestNextLegalVersionLabel,
  updateLegalDocumentDraft,
  type LegalAcceptanceAuditRow,
  type LegalDocumentDraftInput,
} from '../../lib/legal';
import type {
  LegalDocumentAcceptanceRequirement,
  LegalDocumentType,
  LegalDocumentVersionRow,
} from '../../lib/supabase';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { ResponsiveDialog } from '../ResponsiveDialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

function defaultRequirementForType(documentType: LegalDocumentType): LegalDocumentAcceptanceRequirement {
  if (documentType === 'dpa') {
    return 'organization-owner';
  }

  if (documentType === 'cookies') {
    return 'none';
  }

  return 'all-users';
}

function toDateInputValue(value?: string | null) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function buildDraftInput(documentType: LegalDocumentType, source?: LegalDocumentVersionRow | null): LegalDocumentDraftInput {
  return {
    documentType,
    title: source?.title || getLegalDocumentTypeLabel(documentType),
    versionLabel: suggestNextLegalVersionLabel(source?.version_label),
    effectiveAt: toDateInputValue(source?.effective_at),
    acceptanceRequirement: source?.acceptance_requirement || defaultRequirementForType(documentType),
    requiresReacceptance: source?.requires_reacceptance || documentType === 'terms',
    changeSummary: source?.change_summary || '',
    locale: source?.locale || 'fi-FI',
    contentMd: source?.content_md || '',
  };
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('fi-FI');
}

export default function LegalDocumentsPage() {
  const { canManageUsers, isPlatformAdmin, organization } = useAuth();
  const [documents, setDocuments] = useState<LegalDocumentVersionRow[]>([]);
  const [acceptances, setAcceptances] = useState<LegalAcceptanceAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<LegalDocumentVersionRow | null>(null);
  const [formData, setFormData] = useState<LegalDocumentDraftInput>(buildDraftInput('terms'));
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [nextDocuments, nextAcceptances] = await Promise.all([
        listLegalDocumentVersionsForManagement(),
        listLegalAcceptanceAudit(isPlatformAdmin ? null : organization?.id || null),
      ]);
      setDocuments(nextDocuments);
      setAcceptances(nextAcceptances);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Juridisten dokumenttien lataus epäonnistui.');
    } finally {
      setLoading(false);
    }
  }, [isPlatformAdmin, organization?.id]);

  useEffect(() => {
    if (!canManageUsers) {
      setLoading(false);
      return;
    }

    void loadData();
  }, [canManageUsers, loadData]);

  const groupedDocuments = useMemo(() => groupLegalDocumentVersionsByType(documents), [documents]);
  const filteredAcceptances = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    if (!searchLower) {
      return acceptances;
    }

    return acceptances.filter((acceptance) => {
      const haystack = [
        acceptance.profile?.display_name,
        acceptance.profile?.email,
        acceptance.organization?.name,
        acceptance.document_type,
        acceptance.version_label,
        acceptance.acceptance_source,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(searchLower);
    });
  }, [acceptances, search]);
  const previewHtml = useMemo(() => renderLegalDocumentHtml(formData.contentMd || ''), [formData.contentMd]);

  const openDraftEditor = (documentType: LegalDocumentType, source?: LegalDocumentVersionRow | null) => {
    setEditingDocument(source?.status === 'draft' ? source : null);
    setFormData(
      source?.status === 'draft'
        ? {
            documentType: source.document_type,
            title: source.title,
            versionLabel: source.version_label,
            effectiveAt: toDateInputValue(source.effective_at),
            acceptanceRequirement: source.acceptance_requirement,
            requiresReacceptance: source.requires_reacceptance,
            changeSummary: source.change_summary || '',
            locale: source.locale,
            contentMd: source.content_md,
          }
        : buildDraftInput(documentType, source)
    );
    setEditorOpen(true);
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      if (editingDocument) {
        await updateLegalDocumentDraft(editingDocument.id, formData);
        toast.success('Luonnos päivitetty.');
      } else {
        await createLegalDocumentDraft(formData);
        toast.success('Luonnos luotu.');
      }
      setEditorOpen(false);
      await loadData();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Tallennus epäonnistui.');
    } finally {
      setSaving(false);
    }
  };

  if (!canManageUsers) {
    return (
      <div className="p-4 sm:p-8">
        <Card className="p-8 text-center text-muted-foreground">
          Juridiset dokumentit ovat näkyvissä vain yrityksen omistajalle tai pääkäyttäjälle.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Juridiset dokumentit</h1>
          <p className="mt-1 text-muted-foreground">
            Hallitse juridisten dokumenttien versioita, julkaisuja ja hyväksyntäauditointia samasta näkymästä.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {(['terms', 'privacy', 'dpa', 'cookies'] as LegalDocumentType[]).map((documentType) => {
          const activeDocument = groupedDocuments[documentType].find((document) => document.status === 'active') || null;
          return (
            <Card key={documentType} className="rounded-[24px] border-slate-200/90 bg-white p-5 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.3)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Aktiivinen dokumentti</div>
                  <h2 className="mt-2 text-lg font-semibold text-slate-950">{getLegalDocumentTypeLabel(documentType)}</h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                  <FileText className="h-5 w-5" weight="bold" />
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div>Versio: <span className="font-medium text-slate-950">{activeDocument?.version_label || 'Ei julkaistu'}</span></div>
                <div>Voimassa alkaen: <span className="font-medium text-slate-950">{formatDateTime(activeDocument?.effective_at)}</span></div>
                <div>Hyväksyntä: <span className="font-medium text-slate-950">{activeDocument ? getLegalRequirementLabel(activeDocument.acceptance_requirement) : '-'}</span></div>
              </div>

              {isPlatformAdmin && (
                <Button className="mt-4 w-full" onClick={() => openDraftEditor(documentType, activeDocument)}>
                  Luo uusi luonnos
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="audit">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="audit">
            <ShieldCheck className="h-4 w-4" />
            Hyväksynnät
          </TabsTrigger>
          {isPlatformAdmin && (
            <TabsTrigger value="versions">
              <CheckCircle className="h-4 w-4" />
              Dokumenttiversiot
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="audit" className="pt-4">
          <Card className="space-y-4 rounded-[28px] border-slate-200/90 bg-white p-6 shadow-[0_22px_60px_-40px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Hyväksyntäauditointi</h2>
                <p className="text-sm text-muted-foreground">
                  Näet, kuka hyväksyi minkä dokumentin, milloin ja mistä flow’sta hyväksyntä tuli.
                </p>
              </div>
              <Input
                className="w-full lg:max-w-sm"
                placeholder="Hae käyttäjää, organisaatiota tai versiota"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                Ladataan hyväksyntähistoriaa...
              </div>
            ) : filteredAcceptances.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                Hyväksyntälokeja ei löytynyt valituilla ehdoilla.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Käyttäjä</TableHead>
                    <TableHead>Dokumentti</TableHead>
                    <TableHead>Versio</TableHead>
                    <TableHead>Hyväksytty</TableHead>
                    <TableHead>Lähde</TableHead>
                    <TableHead>Org</TableHead>
                    <TableHead>Hash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAcceptances.map((acceptance) => (
                    <TableRow key={acceptance.id}>
                      <TableCell>
                        <div className="space-y-1 whitespace-normal">
                          <div className="font-medium text-slate-950">{acceptance.profile?.display_name || acceptance.user_id}</div>
                          <div className="text-xs text-slate-500">{acceptance.profile?.email || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getLegalDocumentTypeLabel(acceptance.document_type)}</TableCell>
                      <TableCell>
                        <div className="space-y-1 whitespace-normal">
                          <div className="font-medium text-slate-950">{acceptance.version_label}</div>
                          {acceptance.accepted_on_behalf_of_organization && (
                            <Badge variant="secondary">Organisaation puolesta</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDateTime(acceptance.accepted_at)}</TableCell>
                      <TableCell>{getLegalAcceptanceSourceLabel(acceptance.acceptance_source)}</TableCell>
                      <TableCell>{acceptance.organization?.name || '-'}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{formatLegalHash(acceptance.content_hash)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {isPlatformAdmin && (
          <TabsContent value="versions" className="space-y-4 pt-4">
            {(['terms', 'privacy', 'dpa', 'cookies'] as LegalDocumentType[]).map((documentType) => (
              <Card key={documentType} className="space-y-4 rounded-[28px] border-slate-200/90 bg-white p-6 shadow-[0_22px_60px_-40px_rgba(15,23,42,0.35)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{getLegalDocumentTypeLabel(documentType)}</h2>
                    <p className="text-sm text-muted-foreground">
                      Versioi dokumenttia luonnoksina, julkaise uusi aktiivinen versio ja säilytä vanhat versiot historiassa.
                    </p>
                  </div>
                  <Button onClick={() => openDraftEditor(documentType, groupedDocuments[documentType][0] || null)}>
                    Luo luonnos
                  </Button>
                </div>

                <div className="space-y-3">
                  {groupedDocuments[documentType].length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                      Dokumentille ei ole vielä versioita.
                    </div>
                  ) : (
                    groupedDocuments[documentType].map((document) => (
                      <div key={document.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-950">{document.title}</h3>
                            <Badge variant={document.status === 'active' ? 'default' : 'outline'}>
                              {getLegalDocumentStatusLabel(document.status)}
                            </Badge>
                            <Badge variant="secondary">Versio {document.version_label}</Badge>
                          </div>
                          <div className="grid gap-1 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                            <div>Voimassa: <span className="font-medium text-slate-950">{formatDateTime(document.effective_at)}</span></div>
                            <div>Hyväksyntä: <span className="font-medium text-slate-950">{getLegalRequirementLabel(document.acceptance_requirement)}</span></div>
                            <div>Hash: <span className="font-mono text-slate-950">{formatLegalHash(document.content_hash)}</span></div>
                            <div>Muutettu: <span className="font-medium text-slate-950">{formatDateTime(document.updated_at)}</span></div>
                          </div>
                          {document.change_summary && (
                            <p className="max-w-4xl text-sm leading-7 text-slate-600">{document.change_summary}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <Button variant="outline" onClick={() => openDraftEditor(documentType, document)}>
                            {document.status === 'draft' ? 'Muokkaa luonnosta' : 'Luo uusi luonnos tästä'}
                          </Button>
                          {document.status === 'draft' && (
                            <Button
                              onClick={async () => {
                                try {
                                  setPublishingId(document.id);
                                  await publishLegalDocumentVersion(document.id);
                                  toast.success('Dokumenttiversio julkaistu.');
                                  await loadData();
                                } catch (reason) {
                                  toast.error(reason instanceof Error ? reason.message : 'Julkaisu epäonnistui.');
                                } finally {
                                  setPublishingId(null);
                                }
                              }}
                              disabled={publishingId === document.id}
                            >
                              {publishingId === document.id ? 'Julkaistaan...' : 'Julkaise'}
                            </Button>
                          )}
                          {document.status === 'draft' && (
                            <Button
                              variant="outline"
                              onClick={async () => {
                                try {
                                  setDeletingId(document.id);
                                  await deleteLegalDocumentDraft(document.id);
                                  toast.success('Luonnos poistettu.');
                                  await loadData();
                                } catch (reason) {
                                  toast.error(reason instanceof Error ? reason.message : 'Poisto epäonnistui.');
                                } finally {
                                  setDeletingId(null);
                                }
                              }}
                              disabled={deletingId === document.id}
                            >
                              {deletingId === document.id ? 'Poistetaan...' : 'Poista luonnos'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            ))}
          </TabsContent>
        )}
      </Tabs>

      {isPlatformAdmin && (
        <ResponsiveDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          title={editingDocument ? 'Muokkaa dokumenttiluonnosta' : 'Luo uusi dokumenttiluonnos'}
          description="Julkaistut versiot ovat muuttumattomia. Tee sisällölliset muutokset aina uuden luonnoksen kautta. Pitkä dokumenttisisältö scrollaa tämän näkymän sisällä ilman, että otsikko tai sulkemistoiminnot leikkaantuvat."
          maxWidth="full"
          footer={(
            <>
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)} className="flex-1 sm:flex-initial">
                Sulje
              </Button>
              <Button type="button" disabled={saving} onClick={() => void handleSaveDraft()} className="flex-1 sm:flex-initial">
                {saving ? 'Tallennetaan...' : editingDocument ? 'Tallenna muutokset' : 'Luo luonnos'}
              </Button>
            </>
          )}
        >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="min-w-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="legal-document-title">Otsikko</Label>
                    <Input
                      id="legal-document-title"
                      value={formData.title}
                      onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legal-document-version">Versiotunniste</Label>
                    <Input
                      id="legal-document-version"
                      value={formData.versionLabel}
                      onChange={(event) => setFormData((current) => ({ ...current, versionLabel: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="legal-document-effective">Voimassa alkaen</Label>
                    <Input
                      id="legal-document-effective"
                      type="date"
                      value={formData.effectiveAt}
                      onChange={(event) => setFormData((current) => ({ ...current, effectiveAt: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legal-document-locale">Locale</Label>
                    <Input
                      id="legal-document-locale"
                      value={formData.locale || 'fi-FI'}
                      onChange={(event) => setFormData((current) => ({ ...current, locale: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="legal-document-requirement">Hyväksyntävaatimus</Label>
                    <select
                      id="legal-document-requirement"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={formData.acceptanceRequirement}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          acceptanceRequirement: event.target.value as LegalDocumentAcceptanceRequirement,
                        }))
                      }
                    >
                      <option value="all-users">Pakollinen kaikille käyttäjille</option>
                      <option value="organization-owner">Pakollinen organisaation omistajalle</option>
                      <option value="none">Ei erillistä hyväksyntää</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legal-document-summary">Muutosyhteenveto</Label>
                    <Input
                      id="legal-document-summary"
                      value={formData.changeSummary || ''}
                      onChange={(event) => setFormData((current) => ({ ...current, changeSummary: event.target.value }))}
                      placeholder="Esim. Vastuunrajoitus päivitetty ja DPA-rakenne tarkennettu"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <Checkbox
                    checked={formData.requiresReacceptance}
                    id="legal-document-reacceptance"
                    onCheckedChange={(checked) =>
                      setFormData((current) => ({ ...current, requiresReacceptance: checked === true }))
                    }
                  />
                  <div className="space-y-1">
                    <Label className="cursor-pointer text-sm leading-6 text-slate-800" htmlFor="legal-document-reacceptance">
                      Tämä versio vaatii uudelleenehyväksynnän aiemmilta käyttäjiltä
                    </Label>
                    <p className="text-xs leading-6 text-slate-500">
                      Käytä tätä, kun muutos on olennainen ja palvelun käyttö halutaan katkaista uuteen hyväksyntään asti.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal-document-content">Sisältö (Markdown)</Label>
                  <Textarea
                    id="legal-document-content"
                    rows={22}
                    value={formData.contentMd}
                    onChange={(event) => setFormData((current) => ({ ...current, contentMd: event.target.value }))}
                  />
                </div>
              </div>

              <div className="min-w-0 space-y-3 rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Esikatselu</div>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">{formData.title || 'Dokumenttiluonnos'}</h3>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)]">
                  <div className="legal-document-body" dangerouslySetInnerHTML={{ __html: previewHtml || '<p>Ei sisältöä.</p>' }} />
                </div>
              </div>
            </div>
        </ResponsiveDialog>
      )}
    </div>
  );
}

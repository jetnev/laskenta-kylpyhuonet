import { useMemo, useRef, useState } from 'react';
import {
  ArrowsClockwise,
  CheckCircle,
  Copy,
  Eye,
  Lock,
  NotePencil,
  Plus,
  ShieldCheck,
  User,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { ResponsiveDialog } from '../ResponsiveDialog';
import { ReadOnlyAlert } from '../ReadOnlyAlert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useAuth } from '../../hooks/use-auth';
import { useDocumentSettings, useQuoteTerms } from '../../hooks/use-data';
import { QuoteTerms, TermTemplateCustomerSegment, TermTemplateScopeType } from '../../lib/types';
import {
  renderTermTemplateHtml,
  resolveTermTemplatePlaceholders,
  TERM_TEMPLATE_NOTICE,
  TERM_TEMPLATE_PLACEHOLDERS,
  TERM_TEMPLATE_SCOPE_LABELS,
  TERM_TEMPLATE_SEGMENT_LABELS,
} from '../../lib/term-templates';

type TemplateFilter = 'all' | 'master' | 'own' | 'consumer' | 'business';

type TemplateFormState = {
  name: string;
  description: string;
  customerSegment: TermTemplateCustomerSegment;
  scopeType: TermTemplateScopeType;
  contentMd: string;
  isActive: boolean;
  isDefault: boolean;
};

const DEFAULT_FORM: TemplateFormState = {
  name: '',
  description: '',
  customerSegment: 'business',
  scopeType: 'project',
  contentMd: '',
  isActive: true,
  isDefault: false,
};

const FILTERS: Array<{ value: TemplateFilter; label: string }> = [
  { value: 'all', label: 'Kaikki' },
  { value: 'master', label: 'Master' },
  { value: 'own', label: 'Omat' },
  { value: 'consumer', label: 'Kuluttaja' },
  { value: 'business', label: 'B2B' },
];

function toFormState(template?: QuoteTerms | null): TemplateFormState {
  if (!template) {
    return DEFAULT_FORM;
  }

  return {
    name: template.name,
    description: template.description,
    customerSegment: template.customerSegment,
    scopeType: template.scopeType,
    contentMd: template.contentMd,
    isActive: template.isActive,
    isDefault: template.isDefault,
  };
}

export default function TermsPage() {
  const {
    addTerms,
    archiveTerms,
    cloneTermsFromMaster,
    duplicateTerms,
    ownTemplates,
    restoreTermsFromMaster,
    terms,
    updateTerms,
  } = useQuoteTerms();
  const { documentSettings } = useDocumentSettings();
  const { canEdit } = useAuth();
  const [filter, setFilter] = useState<TemplateFilter>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<QuoteTerms | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<QuoteTerms | null>(null);
  const [formData, setFormData] = useState<TemplateFormState>(DEFAULT_FORM);
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const filteredTerms = useMemo(() => {
    return terms.filter((template) => {
      if (filter === 'master') return template.isSystem;
      if (filter === 'own') return !template.isSystem;
      if (filter === 'consumer') return template.customerSegment === 'consumer';
      if (filter === 'business') return template.customerSegment === 'business';
      return true;
    });
  }, [filter, terms]);

  const previewContext = useMemo(() => {
    const createdAt = new Date();
    const validUntil = new Date(createdAt);
    validUntil.setDate(validUntil.getDate() + 30);

    return {
      customer: {
        name: 'Malliasiakas Oy',
        address: 'Esimerkkikatu 10 A 3, 00100 Helsinki',
      },
      project: {
        name: 'Kylpyhuoneremontti',
        site: 'Esimerkkikatu 10 A 3, Helsinki',
      },
      quote: {
        quoteNumber: 'TAR-ESIKATSELU-001',
        createdAt: createdAt.toISOString().slice(0, 10),
        validUntil: validUntil.toISOString().slice(0, 10),
        schedule: 'Asennus voidaan aloittaa 2-3 viikon sisällä tilauksesta.',
        notes: 'Tarjoukseen sisältyvät eritellyt tuotteet, asennus, suojaus ja loppusiivous.',
        projectCosts: 245,
      },
      settings: documentSettings,
    };
  }, [documentSettings]);

  const previewHtml = useMemo(
    () => renderTermTemplateHtml(resolveTermTemplatePlaceholders(formData.contentMd || '', previewContext)),
    [formData.contentMd, previewContext]
  );

  const previewTemplateHtml = useMemo(
    () =>
      previewTemplate
        ? renderTermTemplateHtml(resolveTermTemplatePlaceholders(previewTemplate.contentMd, previewContext))
        : '',
    [previewContext, previewTemplate]
  );

  const openNewTemplateDialog = () => {
    if (!canEdit) {
      toast.error('Sinulla ei ole oikeuksia luoda omia ehtopohjia.');
      return;
    }

    setEditingTemplate(null);
    setFormData({
      ...DEFAULT_FORM,
      isDefault: ownTemplates.length === 0,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (template: QuoteTerms) => {
    if (template.isSystem) {
      toast.error('Master-pohjaa ei voi muokata suoraan. Luo siitä oma kopio.');
      return;
    }
    if (!canEdit) {
      toast.error('Sinulla ei ole oikeuksia muokata ehtopohjia.');
      return;
    }

    setEditingTemplate(template);
    setFormData(toFormState(template));
    setDialogOpen(true);
  };

  const handleSave = () => {
    try {
      if (editingTemplate) {
        updateTerms(editingTemplate.id, formData);
        toast.success('Ehtopohja päivitetty.');
      } else {
        addTerms(formData);
        toast.success('Oma ehtopohja luotu.');
      }
      setDialogOpen(false);
      setEditingTemplate(null);
      setFormData(DEFAULT_FORM);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tallennus epäonnistui.');
    }
  };

  const handleCloneFromMaster = (template: QuoteTerms) => {
    try {
      const created = cloneTermsFromMaster(template.id);
      setEditingTemplate(created);
      setFormData(toFormState(created));
      setDialogOpen(true);
      toast.success('Master-pohjasta luotiin oma kopio.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kopion luonti epäonnistui.');
    }
  };

  const handleDuplicate = (template: QuoteTerms) => {
    try {
      const created = duplicateTerms(template.id);
      setEditingTemplate(created);
      setFormData(toFormState(created));
      setDialogOpen(true);
      toast.success('Ehtopohja monistettiin.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Monistus epäonnistui.');
    }
  };

  const handleRestore = (template: QuoteTerms) => {
    try {
      const restored = restoreTermsFromMaster(template.id);
      if (editingTemplate?.id === restored.id) {
        setEditingTemplate(restored);
        setFormData(toFormState(restored));
      }
      toast.success('Ehtopohjan sisältö palautettiin masterista.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Palautus epäonnistui.');
    }
  };

  const handleArchiveToggle = (template: QuoteTerms) => {
    try {
      archiveTerms(template.id, template.isActive);
      toast.success(template.isActive ? 'Ehtopohja arkistoitiin.' : 'Ehtopohja palautettiin käyttöön.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tilamuutos epäonnistui.');
    }
  };

  const insertPlaceholder = (token: string) => {
    const textarea = contentTextareaRef.current;

    if (!textarea) {
      setFormData((current) => ({
        ...current,
        contentMd: current.contentMd.trim().length > 0 ? `${current.contentMd}\n${token}` : token,
      }));
      return;
    }

    const useSelection = document.activeElement === textarea;
    const start = useSelection ? (textarea.selectionStart ?? textarea.value.length) : textarea.value.length;
    const end = useSelection ? (textarea.selectionEnd ?? textarea.value.length) : textarea.value.length;
    const nextContent = `${textarea.value.slice(0, start)}${token}${textarea.value.slice(end)}`;
    const nextCursorPosition = start + token.length;

    setFormData((current) => ({
      ...current,
      contentMd: nextContent,
    }));

    window.requestAnimationFrame(() => {
      const nextTextarea = contentTextareaRef.current;
      if (!nextTextarea) {
        return;
      }

      nextTextarea.focus();
      nextTextarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-w-7xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold">Ehtopohjat</h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-3xl">
            Käytä valmiita master-pohjia lähtökohtana tai luo täysin omia ehtopohjia. Masterit ovat vain luettavia, mutta omat kopiot ovat vapaasti muokattavia.
          </p>
        </div>
        {canEdit ? (
          <Button onClick={openNewTemplateDialog} className="gap-2 self-start">
            <Plus weight="bold" />
            Uusi ehtopohja
          </Button>
        ) : (
          <Button disabled className="gap-2 self-start">
            <Lock weight="bold" />
            Vain luku
          </Button>
        )}
      </div>

      {!canEdit && <ReadOnlyAlert />}

      <Card className="border-muted bg-muted/40 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="text-sm font-medium">Master-pohjat ja omat versiot</div>
            <p className="text-sm text-muted-foreground">{TERM_TEMPLATE_NOTICE}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={filter === item.value ? 'default' : 'outline'}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredTerms.map((template) => (
          <Card key={template.id} className={`p-6 space-y-4 ${!template.isActive ? 'opacity-70' : ''}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{template.name}</h2>
                  <Badge variant={template.isSystem ? 'secondary' : 'default'} className="gap-1">
                    {template.isSystem ? <ShieldCheck className="h-3.5 w-3.5" weight="fill" /> : <User className="h-3.5 w-3.5" weight="fill" />}
                    {template.isSystem ? 'Master' : 'Oma'}
                  </Badge>
                  <Badge variant="outline">{TERM_TEMPLATE_SEGMENT_LABELS[template.customerSegment]}</Badge>
                  <Badge variant="outline">{TERM_TEMPLATE_SCOPE_LABELS[template.scopeType]}</Badge>
                  {template.isDefault && (
                    <Badge className="gap-1">
                      <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                      Oletus
                    </Badge>
                  )}
                  {!template.isActive && <Badge variant="outline">Arkistoitu</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {template.description || 'Ei erillistä kuvausta.'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Päivitetty {new Date(template.updatedAt).toLocaleString('fi-FI')}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(template)} className="gap-2">
                  <Eye className="h-4 w-4" />
                  Esikatsele
                </Button>
                {template.isSystem ? (
                  <Button variant="default" size="sm" onClick={() => handleCloneFromMaster(template)} className="gap-2" disabled={!canEdit}>
                    <Copy className="h-4 w-4" />
                    Luo oma kopio
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(template)} className="gap-2" disabled={!canEdit}>
                      <NotePencil className="h-4 w-4" />
                      Muokkaa
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDuplicate(template)} className="gap-2" disabled={!canEdit}>
                      <Copy className="h-4 w-4" />
                      Monista
                    </Button>
                    {template.baseTemplateId && (
                      <Button variant="outline" size="sm" onClick={() => handleRestore(template)} className="gap-2" disabled={!canEdit}>
                        <ArrowsClockwise className="h-4 w-4" />
                        Palauta masterista
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleArchiveToggle(template)} disabled={!canEdit}>
                      {template.isActive ? 'Arkistoi' : 'Palauta käyttöön'}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="line-clamp-6 whitespace-pre-wrap text-sm text-muted-foreground">
                {template.contentMd}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTerms.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">
          Valitulla suodattimella ei löytynyt ehtopohjia.
        </Card>
      )}

      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingTemplate(null);
            setFormData(DEFAULT_FORM);
          }
        }}
        title={editingTemplate ? 'Muokkaa omaa ehtopohjaa' : 'Uusi ehtopohja'}
        maxWidth="full"
        footer={(
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 sm:flex-initial">
              Peruuta
            </Button>
            <Button onClick={handleSave} className="flex-1 sm:flex-initial">
              Tallenna
            </Button>
          </>
        )}
      >
        <div className="space-y-5">
          <Card className="p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="terms-name">Pohjan nimi</Label>
                <Input id="terms-name" value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="terms-description">Kuvaus</Label>
                <Textarea id="terms-description" rows={2} value={formData.description} onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms-segment">Asiakassegmentti</Label>
                <Select value={formData.customerSegment} onValueChange={(value) => setFormData((current) => ({ ...current, customerSegment: value as TermTemplateCustomerSegment }))}>
                  <SelectTrigger id="terms-segment"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consumer">Kuluttaja</SelectItem>
                    <SelectItem value="business">B2B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms-scope">Käyttötarkoitus</Label>
                <Select value={formData.scopeType} onValueChange={(value) => setFormData((current) => ({ ...current, scopeType: value as TermTemplateScopeType }))}>
                  <SelectTrigger id="terms-scope"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product_only">Tuotetoimitus</SelectItem>
                    <SelectItem value="product_install">Tuotetoimitus + asennus</SelectItem>
                    <SelectItem value="installation_contract">Asennusurakka</SelectItem>
                    <SelectItem value="project">Projekti</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant={formData.isDefault ? 'default' : 'outline'} onClick={() => setFormData((current) => ({ ...current, isDefault: !current.isDefault }))}>
                {formData.isDefault ? 'Oletuspohja käytössä' : 'Merkitse oletukseksi'}
              </Button>
              <Button type="button" variant={formData.isActive ? 'default' : 'outline'} onClick={() => setFormData((current) => ({ ...current, isActive: !current.isActive }))}>
                {formData.isActive ? 'Aktiivinen' : 'Arkistoitu'}
              </Button>
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="p-4 space-y-3">
              <div>
                <h2 className="text-sm font-semibold">Sisältö</h2>
                <p className="text-sm text-muted-foreground">Kirjoita ehdot tähän. Käytä otsikoita ja kappaleita paremman luettavuuden vuoksi.</p>
              </div>
              <div className="rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                Klikkaa oikean reunan muuttujaa, niin se lisätään suoraan tekstikursorin kohdalle. Jos valitset tekstin ensin, muuttuja korvaa valitun kohdan.
              </div>
              <Textarea
                id="terms-content"
                ref={contentTextareaRef}
                rows={20}
                value={formData.contentMd}
                onChange={(event) => setFormData((current) => ({ ...current, contentMd: event.target.value }))}
                placeholder="Kirjoita ehtopohjan sisältö tähän. Voit käyttää otsikoita ja muuttujia, kuten {{asiakas_nimi}}."
                className="min-h-[460px] resize-y text-[15px] leading-7"
              />
            </Card>

            <div className="space-y-4">
              <Card className="p-4 space-y-3">
                <div>
                  <h2 className="text-sm font-semibold">Käytettävät muuttujat</h2>
                  <p className="text-sm text-muted-foreground">Lisää muuttuja juuri siihen kohtaan, jossa haluat sen näkyvän valmiissa dokumentissa.</p>
                </div>
                <div className="max-h-[360px] overflow-y-auto pr-1">
                  <div className="grid gap-2">
                    {TERM_TEMPLATE_PLACEHOLDERS.map((item) => (
                      <Button
                        key={item.token}
                        type="button"
                        variant="outline"
                        className="h-auto items-start justify-start gap-1 px-3 py-3 text-left whitespace-normal"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertPlaceholder(item.token)}
                      >
                        <span className="font-mono text-[11px] leading-4">{item.token}</span>
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <div>
                  <h2 className="text-sm font-semibold">Kirjoitusvinkit</h2>
                  <p className="text-sm text-muted-foreground">Näillä ohjeilla esikatselu ja lopullinen dokumentti pysyvät selkeinä.</p>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>#-otsikot toimivat hyvin pääosioissa, kuten Reklamaatiot, Maksuehto tai Työn rajaukset.</p>
                  <p>Kirjoita jokainen asiakokonaisuus omalle kappaleelleen, niin dokumentti ei muutu yhdeksi tekstimassaksi.</p>
                  <p>Käytä muuttujia vain niissä kohdissa, joissa tiedon pitää vaihtua tarjouksen tai asiakkaan mukaan.</p>
                </div>
              </Card>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold">Esimerkkiesikatselu</h2>
                <p className="text-sm text-muted-foreground">Muuttujat täytetään esimerkkiasiakkaan tiedoilla ja omilla dokumenttiasetuksillasi, jotta näet miltä valmis ehto näyttää.</p>
              </div>
              <Badge variant="outline" className="self-start sm:self-auto">Asiakasnäkymä</Badge>
            </div>
            <div className="bg-muted/15 p-4 sm:p-6">
              <div className="mx-auto max-w-4xl rounded-[28px] border bg-background p-6 shadow-sm sm:p-8">
                <div className="mb-5 flex flex-wrap gap-2">
                  <Badge variant="secondary">Esimerkkiasiakas</Badge>
                  <Badge variant="outline">{documentSettings.companyName || 'Yritystiedot puuttuvat'}</Badge>
                  {documentSettings.companyEmail && <Badge variant="outline">{documentSettings.companyEmail}</Badge>}
                </div>
                <div
                  className="prose prose-base prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground prose-h1:mb-4 prose-h1:text-2xl prose-h2:mt-8 prose-h2:text-xl prose-h3:mt-6 prose-h3:text-lg prose-p:leading-7 prose-p:text-foreground/90 prose-li:leading-7 prose-li:text-foreground/90 max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewHtml || '<p>Ei sisältöä.</p>' }}
                />
              </div>
            </div>
          </Card>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={Boolean(previewTemplate)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewTemplate(null);
          }
        }}
        title={previewTemplate?.name || 'Esikatselu'}
        maxWidth="full"
        footer={(
          <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
            Sulje
          </Button>
        )}
      >
        {previewTemplate && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={previewTemplate.isSystem ? 'secondary' : 'default'}>
                {previewTemplate.isSystem ? 'Master' : 'Oma'}
              </Badge>
              <Badge variant="outline">{TERM_TEMPLATE_SEGMENT_LABELS[previewTemplate.customerSegment]}</Badge>
              <Badge variant="outline">{TERM_TEMPLATE_SCOPE_LABELS[previewTemplate.scopeType]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{previewTemplate.description || 'Ei erillistä kuvausta.'}</p>
            <Card className="overflow-hidden">
              <div className="border-b bg-muted/20 px-5 py-4">
                <div className="text-sm font-semibold">Dokumenttiesikatselu</div>
                <p className="mt-1 text-sm text-muted-foreground">Muuttujat näytetään esimerkkitiedoilla täytettyinä, jotta rakenne on helppo arvioida.</p>
              </div>
              <div className="bg-muted/15 p-4 sm:p-6">
                <div className="mx-auto max-w-4xl rounded-[28px] border bg-background p-6 shadow-sm sm:p-8">
                  <div
                    className="prose prose-base prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground prose-h1:mb-4 prose-h1:text-2xl prose-h2:mt-8 prose-h2:text-xl prose-h3:mt-6 prose-h3:text-lg prose-p:leading-7 prose-p:text-foreground/90 prose-li:leading-7 prose-li:text-foreground/90 max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewTemplateHtml || '<p>Ei sisältöä.</p>' }}
                  />
                </div>
              </div>
            </Card>
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
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

type TemplateFilter = 'all' | 'ready' | 'own' | 'consumer' | 'business';

type TemplateGuide = {
  summary: string;
  difference: string;
  example: string;
};

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
  { value: 'ready', label: 'Valmiit' },
  { value: 'own', label: 'Omat' },
  { value: 'consumer', label: 'Kuluttaja' },
  { value: 'business', label: 'B2B' },
];

const SEGMENT_GUIDES: Array<{ segment: TermTemplateCustomerSegment; title: string; description: string }> = [
  {
    segment: 'consumer',
    title: 'Kuluttaja',
    description: 'Tarkoitettu yksityisasiakkaalle. Kielen kannattaa olla selkeää ja vastuiden helposti ymmärrettäviä.',
  },
  {
    segment: 'business',
    title: 'B2B',
    description: 'Tarkoitettu yrityksille, työmaille ja urakoitsijoille. Painottaa rajauksia, työmaan valmiutta ja lisätöitä.',
  },
];

const SCOPE_GUIDES: Array<{ scopeType: TermTemplateScopeType; title: string; difference: string; example: string }> = [
  {
    scopeType: 'product_only',
    title: 'Tuotetoimitus',
    difference: 'Pelkkä toimitus ilman asennusvastuuta tai työmaalla tehtävää suoritusta.',
    example: 'Esim. peilien, kalusteiden tai varusteiden toimitus ilman asennusta.',
  },
  {
    scopeType: 'product_install',
    title: 'Tuotetoimitus + asennus',
    difference: 'Sisältää nimetyt tuotteet ja rajatun asennustyön, mutta ei vielä täyttä urakkarakennetta.',
    example: 'Esim. allaskaapin, peilikaapin tai suihkuseinän toimitus ja asennus.',
  },
  {
    scopeType: 'installation_contract',
    title: 'Asennusurakka',
    difference: 'Korostaa työmaan valmiutta, kiinnitysoletuksia, lisätöitä ja urakkarajauksia.',
    example: 'Esim. hotellin, taloyhtiön tai usean asunnon varusteasennukset.',
  },
  {
    scopeType: 'project',
    title: 'Projektitoimitus',
    difference: 'Laajin vaihtoehto, kun määrät, aikataulu tai sisältö voivat muuttua projektin aikana.',
    example: 'Esim. linjasaneeraus, laaja kalustetoimitus tai toimitusurakka useaan tilaan.',
  },
];

const TEMPLATE_GUIDES: Record<TermTemplateCustomerSegment, Record<TermTemplateScopeType, TemplateGuide>> = {
  consumer: {
    product_only: {
      summary: 'Yksityisasiakkaalle tehtävä pelkkä tavaratoimitus ilman asennusvastuuta.',
      difference: 'Kevyin vaihtoehto. Rajaa työn pois ja keskittyy toimitukseen, vastaanottoon ja reklamaatioihin.',
      example: 'Sopii esimerkiksi peilien, kalusteiden tai varusteiden toimitukseen asuntoon ilman asennusta.',
    },
    product_install: {
      summary: 'Yksityisasiakkaalle tehtävä toimitus, jossa mukana on selvästi rajattu asennustyö.',
      difference: 'Laajempi kuin pelkkä tuotetoimitus, mutta kevyempi kuin urakka- tai projektipohja.',
      example: 'Sopii esimerkiksi allaskaapin, peilikaapin tai suihkuseinän toimitukseen ja asennukseen.',
    },
    installation_contract: {
      summary: 'Kuluttajakohteen asennuspainotteinen kokonaisuus, jossa työmaan valmius ja rajaukset pitää avata tarkasti.',
      difference: 'Korostaa asennusvastuita, työmaan edellytyksiä ja lisätöiden käsittelyä enemmän kuin tavallinen toimitus + asennus.',
      example: 'Sopii esimerkiksi saunan, kylpyhuoneen tai usean tilan varusteasennuksiin omakotitalossa.',
    },
    project: {
      summary: 'Laajempi kuluttajakohde, jossa toimitus tai asennus koskee useampaa tilaa tai vaihetta.',
      difference: 'Joustavin kuluttajavaihtoehto, kun aikataulu, määrät tai sisältö voivat täsmentyä projektin aikana.',
      example: 'Sopii esimerkiksi omakotitalon kylpyhuone- ja kodinhoitohuonekokonaisuuteen.',
    },
  },
  business: {
    product_only: {
      summary: 'Yritysasiakkaan pelkkä tuotetoimitus ilman työmaalle tehtävää suoritusta.',
      difference: 'Painottaa toimitusta, vastaanottoa ja vastuunrajausta ilman asennus- tai työmaavelvoitteita.',
      example: 'Sopii esimerkiksi rakennusliikkeelle tai urakoitsijalle tehtävään kaluste- tai varustetoimitukseen.',
    },
    product_install: {
      summary: 'Yritysasiakkaan toimitus, jossa mukana on rajattu asennuskokonaisuus.',
      difference: 'Yhdistää toimituksen ja asennuksen, mutta on edelleen selvästi rajatumpi kuin urakka- tai projektipohja.',
      example: 'Sopii esimerkiksi taloyhtiön tai uudiskohteen kaluste- ja varustetoimitukseen asennettuna.',
    },
    installation_contract: {
      summary: 'Asennusurakka, jossa työmaan valmius, lisätyöt ja urakkarajaukset pitää kirjata tarkasti.',
      difference: 'Asennuspainotteisin vaihtoehto. Mukana ovat työmaan edellytykset, kiinnitysoletukset ja lisätöiden laskutus.',
      example: 'Sopii esimerkiksi hotellin, taloyhtiön tai usean asunnon varusteasennuksiin.',
    },
    project: {
      summary: 'Laaja projekti- tai urakkakohde, jossa määrät, aikataulu tai sisältö voivat elää projektin aikana.',
      difference: 'Laajin vaihtoehto. Sopii tilanteisiin, joissa sopimusasiakirjojen järjestys, muutoshallinta ja projektivastuut pitää kirjata selvästi.',
      example: 'Sopii esimerkiksi linjasaneeraukseen, kerrostalokohteen kalustetoimitukseen tai laajaan toimitusurakkaan.',
    },
  },
};

function getTemplateGuide(customerSegment: TermTemplateCustomerSegment, scopeType: TermTemplateScopeType) {
  return TEMPLATE_GUIDES[customerSegment][scopeType];
}

function getTemplateSurface(template: QuoteTerms) {
  if (template.isSystem && template.customerSegment === 'consumer') {
    return {
      shell: 'border-amber-200/70 bg-white shadow-sm',
      header: 'border-b border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50',
      meta: 'border-amber-200/70 bg-white/85',
      panel: 'border-amber-100 bg-amber-50/50',
      excerpt: 'border-amber-100 bg-white/90',
    };
  }

  if (template.isSystem) {
    return {
      shell: 'border-sky-200/70 bg-white shadow-sm',
      header: 'border-b border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-cyan-50',
      meta: 'border-sky-200/70 bg-white/85',
      panel: 'border-sky-100 bg-sky-50/50',
      excerpt: 'border-sky-100 bg-white/90',
    };
  }

  if (template.customerSegment === 'consumer') {
    return {
      shell: 'border-emerald-200/70 bg-white shadow-sm',
      header: 'border-b border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-lime-50',
      meta: 'border-emerald-200/70 bg-white/85',
      panel: 'border-emerald-100 bg-emerald-50/50',
      excerpt: 'border-emerald-100 bg-white/90',
    };
  }

  return {
    shell: 'border-primary/20 bg-white shadow-sm',
    header: 'border-b border-primary/15 bg-gradient-to-br from-primary/5 via-white to-primary/10',
    meta: 'border-primary/15 bg-white/85',
    panel: 'border-primary/10 bg-primary/5',
    excerpt: 'border-primary/10 bg-white/90',
  };
}

type TermDocumentPreviewProps = {
  html: string;
  companyName?: string;
  companyEmail?: string;
  segmentLabel: string;
  scopeLabel: string;
  eyebrow: string;
  title: string;
};

function TermDocumentPreview({
  html,
  companyName,
  companyEmail,
  segmentLabel,
  scopeLabel,
  eyebrow,
  title,
}: TermDocumentPreviewProps) {
  const resolvedCompanyName = companyName?.trim() || 'Yrityksen nimi puuttuu';
  const resolvedCompanyEmail = companyEmail?.trim() || 'Lisää sähköposti dokumenttiasetuksiin viimeistellympää asiakasnäkymää varten.';

  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-slate-50 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)]">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 bg-white/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</div>
            <div className="text-sm font-semibold text-slate-950">{title}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{segmentLabel}</Badge>
          <Badge variant="outline">{scopeLabel}</Badge>
        </div>
      </div>

      <div className="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(241,245,249,0.94)_56%,rgba(226,232,240,0.9))] p-4 sm:p-6">
        <div className="mx-auto w-full max-w-[920px] rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-[0_28px_80px_-50px_rgba(15,23,42,0.6)] sm:p-10">
          <div className="mb-8 flex flex-col gap-5 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Tarjousliite / Ehdot</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">{resolvedCompanyName}</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{resolvedCompanyEmail}</p>
            </div>

            <div className="grid gap-2 sm:min-w-[230px]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Dokumentti</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{title}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Käyttö</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{segmentLabel} · {scopeLabel}</div>
              </div>
            </div>
          </div>

          <div
            className="prose prose-slate prose-base max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-slate-950 prose-h1:mb-4 prose-h1:text-3xl prose-h2:mt-8 prose-h2:border-t prose-h2:border-slate-100 prose-h2:pt-6 prose-h2:text-xl prose-h3:mt-6 prose-h3:text-lg prose-p:my-3 prose-p:leading-7 prose-p:text-slate-700 prose-strong:text-slate-950 prose-li:my-1 prose-li:leading-7 prose-li:text-slate-700"
            dangerouslySetInnerHTML={{ __html: html || '<p>Ei sisältöä.</p>' }}
          />
        </div>
      </div>
    </div>
  );
}

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
    deleteTerms,
    duplicateTerms,
    ownTemplates,
    restoreTermsFromMaster,
    terms,
    updateTerms,
  } = useQuoteTerms();
  const { documentSettings } = useDocumentSettings();
  const { canDelete, canEdit } = useAuth();
  const [filter, setFilter] = useState<TemplateFilter>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<QuoteTerms | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<QuoteTerms | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<QuoteTerms | null>(null);
  const [formData, setFormData] = useState<TemplateFormState>(DEFAULT_FORM);
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const filteredTerms = useMemo(() => {
    return terms.filter((template) => {
      if (filter === 'ready') return template.isSystem;
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
        vatPercent: documentSettings.defaultVatPercent,
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

  const selectedTemplateGuide = getTemplateGuide(formData.customerSegment, formData.scopeType);

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
      toast.error('Valmista pohjaa ei voi muokata suoraan. Luo siitä oma versio.');
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
      toast.success('Valmiista pohjasta luotiin oma versio.');
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
      toast.success('Ehtopohjan alkuperäinen sisältö palautettiin.');
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

  const handleDeleteTemplate = () => {
    if (!templateToDelete) {
      return;
    }

    try {
      const deletedTemplate = deleteTerms(templateToDelete.id);

      if (editingTemplate?.id === deletedTemplate.id) {
        setEditingTemplate(null);
        setFormData(DEFAULT_FORM);
        setDialogOpen(false);
      }
      if (previewTemplate?.id === deletedTemplate.id) {
        setPreviewTemplate(null);
      }

      setTemplateToDelete(null);
      toast.success('Oma ehtopohja poistettiin.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Poistaminen epäonnistui.');
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
            Käytä valmiita pohjia lähtökohtana tai tee niistä omia versioita. Omia ehtopohjia voit muokata, arkistoida ja poistaa, kun niitä ei enää tarvita.
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
            <div className="text-sm font-medium">Valmiit pohjat ja omat versiot</div>
            <p className="text-sm text-muted-foreground">{TERM_TEMPLATE_NOTICE}</p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Näytetään {filteredTerms.length} {filteredTerms.length === 1 ? 'pohja' : 'pohjaa'}
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
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="p-4 sm:p-5">
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold">Kuluttaja vai B2B?</h2>
              <p className="text-sm text-muted-foreground">Valitse segmentti sen mukaan kenelle tarjous tehdään.</p>
            </div>
            <div className="space-y-3">
              {SEGMENT_GUIDES.map((guide) => (
                <div key={guide.segment} className="rounded-xl border bg-muted/15 p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{guide.title}</Badge>
                    <div className="text-sm font-medium">{TERM_TEMPLATE_SEGMENT_LABELS[guide.segment]}</div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{guide.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold">Mikä ero pohjatyypeillä on?</h2>
              <p className="text-sm text-muted-foreground">Pohjatyyppi määrittää kuinka laajaa toimitusta tai urakkaa ehdot kattavat.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {SCOPE_GUIDES.map((guide) => (
                <div key={guide.scopeType} className="rounded-xl border bg-muted/15 p-3">
                  <div className="text-sm font-semibold">{guide.title}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{guide.difference}</p>
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sopii esim.</div>
                  <p className="mt-1 text-sm text-foreground/80">{guide.example}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredTerms.map((template) => {
          const templateGuide = getTemplateGuide(template.customerSegment, template.scopeType);
          const surface = getTemplateSurface(template);

          return (
            <Card key={template.id} className={`overflow-hidden p-0 ${surface.shell} ${!template.isActive ? 'opacity-70' : ''}`}>
              <div className={`px-5 py-5 sm:px-6 ${surface.header}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={template.isSystem ? 'secondary' : 'default'} className="gap-1">
                        {template.isSystem ? <ShieldCheck className="h-3.5 w-3.5" weight="fill" /> : <User className="h-3.5 w-3.5" weight="fill" />}
                        {template.isSystem ? 'Valmis pohja' : 'Oma versio'}
                      </Badge>
                      <Badge variant="outline">{TERM_TEMPLATE_SEGMENT_LABELS[template.customerSegment]}</Badge>
                      <Badge variant="outline">{TERM_TEMPLATE_SCOPE_LABELS[template.scopeType]}</Badge>
                      {template.isDefault && (
                        <Badge className="gap-1">
                          <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                          Oletuspohja
                        </Badge>
                      )}
                      {!template.isActive && <Badge variant="outline">Arkistoitu</Badge>}
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {template.isSystem ? 'Valmis lähtökohta' : 'Muokattava oma versio'}
                      </div>
                      <h2 className="mt-1 text-xl font-semibold leading-tight text-foreground">{template.name}</h2>
                    </div>

                    <p className="max-w-3xl text-sm leading-6 text-foreground/80">
                      {template.description || templateGuide.summary}
                    </p>
                  </div>

                  <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${surface.meta}`}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Päivitetty</div>
                    <div className="mt-1 font-medium text-foreground">{new Date(template.updatedAt).toLocaleString('fi-FI')}</div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      {template.isDefault
                        ? 'Tämä on valittuna uusille tarjouksille oletuksena.'
                        : template.isSystem
                          ? 'Voit ottaa tästä oman version ja muokata sitä vapaasti.'
                          : 'Voit muokata, monistaa, arkistoida tai poistaa tämän version.'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className={`rounded-2xl border p-4 ${surface.panel}`}>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ero muihin</div>
                      <p className="mt-2 text-sm leading-6 text-foreground/85">{templateGuide.difference}</p>
                    </div>
                    <div className={`rounded-2xl border p-4 ${surface.panel}`}>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sopii esimerkiksi</div>
                      <p className="mt-2 text-sm leading-6 text-foreground/85">{templateGuide.example}</p>
                    </div>
                  </div>

                  <div className={`rounded-2xl border p-4 ${surface.panel}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sisällönosto</div>
                        <p className="mt-1 text-sm text-muted-foreground">Tältä pohjan rakenne näyttää ennen koko dokumentin avaamista.</p>
                      </div>
                      <Badge variant="outline" className="self-start sm:self-auto">Esikatselu kortissa</Badge>
                    </div>

                    <div className={`mt-4 rounded-2xl border p-4 ${surface.excerpt}`}>
                      <div className="line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {template.contentMd}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`rounded-2xl border p-4 ${surface.panel}`}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Toiminnot</div>
                  <div className="mt-3 flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(template)} className="w-full justify-start gap-2">
                      <Eye className="h-4 w-4" />
                      Esikatsele
                    </Button>
                    {template.isSystem ? (
                      <Button variant="default" size="sm" onClick={() => handleCloneFromMaster(template)} className="w-full justify-start gap-2" disabled={!canEdit}>
                        <Copy className="h-4 w-4" />
                        Ota oma versio
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(template)} className="w-full justify-start gap-2" disabled={!canEdit}>
                          <NotePencil className="h-4 w-4" />
                          Muokkaa
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDuplicate(template)} className="w-full justify-start gap-2" disabled={!canEdit}>
                          <Copy className="h-4 w-4" />
                          Monista
                        </Button>
                        {template.baseTemplateId && (
                          <Button variant="outline" size="sm" onClick={() => handleRestore(template)} className="w-full justify-start gap-2" disabled={!canEdit}>
                            <ArrowsClockwise className="h-4 w-4" />
                            Palauta alkuperäinen
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleArchiveToggle(template)} className="w-full justify-start" disabled={!canEdit}>
                          {template.isActive ? 'Arkistoi' : 'Palauta käyttöön'}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setTemplateToDelete(template)} className="w-full justify-start" disabled={!canDelete}>
                          Poista
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
        )})}
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

            <div className="mt-4 rounded-2xl border bg-muted/15 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-sm font-semibold">Valittu pohjatyyppi</div>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedTemplateGuide.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{TERM_TEMPLATE_SEGMENT_LABELS[formData.customerSegment]}</Badge>
                  <Badge variant="outline">{TERM_TEMPLATE_SCOPE_LABELS[formData.scopeType]}</Badge>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ero muihin</div>
                  <p className="mt-1 text-sm text-foreground/80">{selectedTemplateGuide.difference}</p>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sopii esimerkiksi</div>
                  <p className="mt-1 text-sm text-foreground/80">{selectedTemplateGuide.example}</p>
                </div>
              </div>
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
            <div className="p-4 sm:p-6">
              <TermDocumentPreview
                html={previewHtml}
                companyName={documentSettings.companyName}
                companyEmail={documentSettings.companyEmail}
                segmentLabel={TERM_TEMPLATE_SEGMENT_LABELS[formData.customerSegment]}
                scopeLabel={TERM_TEMPLATE_SCOPE_LABELS[formData.scopeType]}
                eyebrow="Asiakasnäkymä"
                title="Esimerkkiasiakkaan ehdot"
              />
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
            {(() => {
              const previewGuide = getTemplateGuide(previewTemplate.customerSegment, previewTemplate.scopeType);
              const previewSurface = getTemplateSurface(previewTemplate);

              return (
                <>
                  <div className={`rounded-[28px] border p-5 sm:p-6 ${previewSurface.header}`}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={previewTemplate.isSystem ? 'secondary' : 'default'}>
                            {previewTemplate.isSystem ? 'Valmis pohja' : 'Oma versio'}
                          </Badge>
                          <Badge variant="outline">{TERM_TEMPLATE_SEGMENT_LABELS[previewTemplate.customerSegment]}</Badge>
                          <Badge variant="outline">{TERM_TEMPLATE_SCOPE_LABELS[previewTemplate.scopeType]}</Badge>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {previewTemplate.isSystem ? 'Valmis lähtökohta' : 'Muokattu oma versio'}
                          </div>
                          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-[2rem]">{previewTemplate.name}</h2>
                        </div>
                        <p className="max-w-3xl text-sm leading-6 text-foreground/80">{previewTemplate.description || previewGuide.summary}</p>
                      </div>

                      <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${previewSurface.meta}`}>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Esikatselu käyttää</div>
                        <div className="mt-1 font-medium text-foreground">Malliasiakkaan tietoja</div>
                        <div className="mt-1 text-xs text-muted-foreground">Sisältö täydennetään nykyisillä dokumenttiasetuksillasi, jotta lopputulos vastaa oikeaa tarjousliitettä.</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="space-y-4">
                      <div className={`rounded-[24px] border p-4 ${previewSurface.panel}`}>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ero muihin</div>
                        <p className="mt-2 text-sm leading-6 text-foreground/85">{previewGuide.difference}</p>
                      </div>

                      <div className={`rounded-[24px] border p-4 ${previewSurface.panel}`}>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sopii esimerkiksi</div>
                        <p className="mt-2 text-sm leading-6 text-foreground/85">{previewGuide.example}</p>
                      </div>

                      <div className={`rounded-[24px] border p-4 ${previewSurface.excerpt}`}>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rakenne nopeasti</div>
                        <div className="mt-3 line-clamp-8 whitespace-pre-wrap text-sm leading-6 text-foreground/75">
                          {previewTemplate.contentMd}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="px-1">
                        <div className="text-sm font-semibold text-foreground">Dokumenttiesikatselu</div>
                        <p className="mt-1 text-sm text-muted-foreground">Nyt esikatselu esitetään valmiin tarjousliitteen kaltaisena paperina, jotta rytmi, otsikointi ja yleisilme on helpompi arvioida.</p>
                      </div>

                      <TermDocumentPreview
                        html={previewTemplateHtml}
                        companyName={documentSettings.companyName}
                        companyEmail={documentSettings.companyEmail}
                        segmentLabel={TERM_TEMPLATE_SEGMENT_LABELS[previewTemplate.customerSegment]}
                        scopeLabel={TERM_TEMPLATE_SCOPE_LABELS[previewTemplate.scopeType]}
                        eyebrow="Dokumenttiesikatselu"
                        title={previewTemplate.name}
                      />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </ResponsiveDialog>

      <AlertDialog open={Boolean(templateToDelete)} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Poistetaanko oma ehtopohja?</AlertDialogTitle>
            <AlertDialogDescription>
              {templateToDelete
                ? `Poistat ehtopohjan "${templateToDelete.name}" pysyvästi. Jos pohja on käytössä tarjouksella, poisto estetään kunnes ehtopohja irrotetaan tarjoukselta.`
                : 'Poistetaanko ehtopohja pysyvästi?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Peruuta</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-destructive text-white hover:bg-destructive/90">
              Poista pysyvästi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

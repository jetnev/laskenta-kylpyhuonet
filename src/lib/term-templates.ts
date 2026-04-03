import { marked } from 'marked';
import type {
  Customer,
  Project,
  Quote,
  QuoteTerms,
  Settings,
  TermTemplateCustomerSegment,
  TermTemplateScopeType,
} from './types';

export const TERM_TEMPLATE_NOTICE = 'Suositus: tarkistuta yrityskohtaiset ehdot ennen tuotantokäyttöä.';

export const TERM_TEMPLATE_SEGMENT_LABELS: Record<TermTemplateCustomerSegment, string> = {
  consumer: 'Kuluttaja',
  business: 'B2B',
};

export const TERM_TEMPLATE_SCOPE_LABELS: Record<TermTemplateScopeType, string> = {
  product_only: 'Tuotetoimitus',
  product_install: 'Tuotetoimitus + asennus',
  installation_contract: 'Asennusurakka',
  project: 'Projekti',
};

export const TERM_TEMPLATE_PLACEHOLDERS = [
  { token: '{{yritys_nimi}}', label: 'Yrityksen nimi' },
  { token: '{{yritys_y_tunnus}}', label: 'Yrityksen Y-tunnus' },
  { token: '{{asiakas_nimi}}', label: 'Asiakkaan nimi' },
  { token: '{{asiakas_osoite}}', label: 'Asiakkaan osoite' },
  { token: '{{tarjous_numero}}', label: 'Tarjousnumero' },
  { token: '{{tarjous_pvm}}', label: 'Tarjouksen päiväys' },
  { token: '{{voimassa_asti}}', label: 'Tarjouksen voimassaolo' },
  { token: '{{maksuehto}}', label: 'Maksuehto' },
  { token: '{{toimitusaika}}', label: 'Toimitusaika' },
  { token: '{{kohde_nimi}}', label: 'Kohteen nimi' },
  { token: '{{kohde_osoite}}', label: 'Kohteen osoite' },
  { token: '{{asennuksen_sisalto}}', label: 'Asennuksen sisältö' },
  { token: '{{ei_sisally}}', label: 'Rajaukset' },
  { token: '{{projektikulut}}', label: 'Projektikulut' },
  { token: '{{reklamaatio_yhteystieto}}', label: 'Reklamaatioyhteystieto' },
] as const;

export interface TermTemplateInput {
  name: string;
  description: string;
  customerSegment: TermTemplateCustomerSegment;
  scopeType: TermTemplateScopeType;
  contentMd: string;
  isActive: boolean;
  isDefault: boolean;
}

type LegacyQuoteTerms = Partial<QuoteTerms> & {
  content?: string;
  customerSegment?: unknown;
  scopeType?: unknown;
};

const MASTER_CREATED_AT = '2026-04-03T00:00:00.000Z';

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'ehtopohja';
}

function ensureUniqueName(existing: QuoteTerms[], baseName: string) {
  const existingNames = new Set(existing.map((template) => template.name.trim().toLowerCase()));
  if (!existingNames.has(baseName.trim().toLowerCase())) {
    return baseName;
  }

  let index = 2;
  while (existingNames.has(`${baseName} ${index}`.trim().toLowerCase())) {
    index += 1;
  }

  return `${baseName} ${index}`;
}

function ensureUniqueSlug(existing: QuoteTerms[], baseSlug: string) {
  const existingSlugs = new Set(existing.map((template) => template.slug));
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let index = 2;
  while (existingSlugs.has(`${baseSlug}-${index}`)) {
    index += 1;
  }

  return `${baseSlug}-${index}`;
}

function toSegment(value: unknown): TermTemplateCustomerSegment {
  return value === 'consumer' ? 'consumer' : 'business';
}

function toScope(value: unknown): TermTemplateScopeType {
  if (value === 'product_only' || value === 'product_install' || value === 'installation_contract' || value === 'project') {
    return value;
  }
  return 'project';
}

function buildSystemTemplate(input: {
  id: string;
  name: string;
  slug: string;
  description: string;
  customerSegment: TermTemplateCustomerSegment;
  scopeType: TermTemplateScopeType;
  contentMd: string;
  sortOrder: number;
  isDefault?: boolean;
}): QuoteTerms {
  return {
    ...input,
    isSystem: true,
    baseTemplateId: undefined,
    version: 1,
    isActive: true,
    isDefault: Boolean(input.isDefault),
    createdAt: MASTER_CREATED_AT,
    updatedAt: MASTER_CREATED_AT,
    createdByUserId: 'system',
    updatedByUserId: 'system',
    ownerUserId: undefined,
  };
}

export const SYSTEM_TERM_TEMPLATES: QuoteTerms[] = [
  buildSystemTemplate({
    id: 'master-consumer-product-only',
    name: 'Kuluttajamyynti - tuotetoimitus',
    slug: 'kuluttaja-tuotetoimitus',
    description: 'Kuluttaja-asiakkaalle tarkoitettu toimitusehtopohja ilman asennusta.',
    customerSegment: 'consumer',
    scopeType: 'product_only',
    sortOrder: 10,
    contentMd: `# Sopimuksen kohde
Tarjous koskee tarjouksessa eriteltyjä tuotteita ja mahdollisia lisävarusteita.

# Hinnat ja maksut
Hinnat määräytyvät tarjouksen mukaan. Mahdolliset toimitus-, käsittely- ja muut erilliskulut esitetään tarjouksessa erikseen.
Maksuehto: {{maksuehto}}

# Toimitus
Toimitusaika annetaan arviona, ellei kirjallisesti toisin sovita.
Toimitusaika: {{toimitusaika}}

# Asiakkaan vastuut
Asiakas vastaa siitä, että toimitusosoite, yhteystiedot, mitat, kulkureitit ja muut toimituksen kannalta olennaiset tiedot ovat oikeat.

# Vastaanotto ja tarkastus
Asiakkaan tulee tarkastaa toimitus vastaanoton yhteydessä ja ilmoittaa havaitut puutteet tai vauriot ilman aiheetonta viivytystä.

# Reklamaatiot
Mahdolliset virheet ja puutteet tulee ilmoittaa kirjallisesti yhteystietoon: {{reklamaatio_yhteystieto}}

# Ylivoimainen este
Osapuoli ei vastaa viivästyksestä tai vahingosta siltä osin kuin se johtuu vaikutusmahdollisuuksien ulkopuolella olevasta esteestä.

# Soveltamisjärjestys
Ensisijaisesti noudatetaan tarjousta ja tilausvahvistusta, toissijaisesti näitä ehtoja.`,
  }),
  buildSystemTemplate({
    id: 'master-consumer-product-install',
    name: 'Kuluttajamyynti - tuotetoimitus ja asennus',
    slug: 'kuluttaja-tuotetoimitus-ja-asennus',
    description: 'Kuluttajamyynnin ehtopohja, jossa mukana toimitus ja asennustyö.',
    customerSegment: 'consumer',
    scopeType: 'product_install',
    sortOrder: 20,
    contentMd: `# Sopimuksen kohde
Tarjous koskee tarjouksessa eriteltyjen tuotteiden toimitusta ja tarjouksessa yksilöityä asennustyötä.

# Asennuksen sisältö
Asennus sisältää vain tarjouksessa nimetyt työt.
Asennuksen sisältö: {{asennuksen_sisalto}}

# Työn rajaukset
Tarjoukseen eivät sisälly sellaiset työt, joita ei ole nimenomaisesti kirjattu tarjoukseen.
Tarjoukseen kuulumattomat työt: {{ei_sisally}}

# Asennusedellytykset
Asiakas vastaa siitä, että kohde on sovittuna ajankohtana asennuskelpoinen, kulkureitit ovat esteettömät ja työalue turvallinen.

# Aikataulu
Asennusajankohta sovitaan erikseen. Ilmoitetut ajat ovat arvioita, ellei toisin kirjallisesti vahvisteta.

# Lisätyöt
Mahdolliset lisätyöt sovitaan erikseen ennen työn suorittamista.

# Tarkastus ja vastaanotto
Asiakkaan tulee tarkastaa työn lopputulos kohtuullisessa ajassa työn valmistuttua ja ilmoittaa mahdollisista puutteista viipymättä.

# Reklamaatiot
Kirjalliset ilmoitukset: {{reklamaatio_yhteystieto}}

# Ylivoimainen este
Osapuoli ei vastaa viivästyksestä tai vahingosta siltä osin kuin se johtuu vaikutusmahdollisuuksien ulkopuolella olevasta esteestä.`,
  }),
  buildSystemTemplate({
    id: 'master-business-product-only',
    name: 'B2B - tuotetoimitus',
    slug: 'b2b-tuotetoimitus',
    description: 'Yritysasiakkaan tuotetoimituksen ehdot ilman asennustyötä.',
    customerSegment: 'business',
    scopeType: 'product_only',
    sortOrder: 30,
    contentMd: `# Soveltaminen
Näitä ehtoja sovelletaan tarjouksessa eriteltyjen tuotteiden myyntiin yritysasiakkaille.

# Hinnat
Hinnat määräytyvät tarjouksen mukaan. Ellei toisin ilmoiteta, hinnat esitetään verottomina.
Maksuehto: {{maksuehto}}

# Tarjouksen voimassaolo
Tarjous on voimassa tarjouksessa ilmoitettuun päivään asti.
Voimassa asti: {{voimassa_asti}}

# Toimitus
Toimitusaika annetaan arviona, ellei kirjallisesti toisin sovita.
Toimitusaika: {{toimitusaika}}

# Vastaanotto ja tarkastus
Asiakkaan tulee tarkastaa toimitus viivytyksettä vastaanoton jälkeen.

# Virheet ja reklamaatiot
Virheistä, puutteista ja kuljetusvaurioista tulee ilmoittaa kirjallisesti ilman aiheetonta viivytystä yhteystietoon: {{reklamaatio_yhteystieto}}

# Vastuun rajaus
Myyjän vastuu rajoittuu ensisijaisesti virheen korjaamiseen, puuttuvan toimituksen täydentämiseen tai hinnanalennukseen siltä osin kuin tämä on sovitun mukainen ja tilanteessa tarkoituksenmukainen.

# Ylivoimainen este
Osapuoli ei vastaa viivästyksestä tai vahingosta siltä osin kuin se johtuu vaikutusmahdollisuuksien ulkopuolella olevasta esteestä.

# Soveltamisjärjestys
Ensisijaisesti noudatetaan tarjousta, tilausta ja tilausvahvistusta, toissijaisesti näitä ehtoja.`,
  }),
  buildSystemTemplate({
    id: 'master-business-product-install',
    name: 'B2B - tuotetoimitus ja asennus',
    slug: 'b2b-tuotetoimitus-ja-asennus',
    description: 'Yritysasiakkaan toimitus- ja asennuskokonaisuuden ehtopohja.',
    customerSegment: 'business',
    scopeType: 'product_install',
    sortOrder: 40,
    contentMd: `# Sopimuksen kohde
Tarjous koskee tuotteiden toimitusta ja tarjouksessa erikseen määriteltyä asennusta kohteessa {{kohde_nimi}}.

# Hinnat ja laskutus
Hinnat määräytyvät tarjouksen mukaan. Ellei toisin ole ilmoitettu, hinnat ovat verottomia.
Maksuehto: {{maksuehto}}

# Aikataulu
Toimitus- ja asennusaikataulu perustuu tarjouksen tekohetkellä käytettävissä olleisiin tietoihin.
Toimitusaika: {{toimitusaika}}

# Tilaajan vastuut
Tilaaja vastaa siitä, että kohde on työvalmis, työalueelle on esteetön pääsy ja asennuksen edellyttämät lähtötiedot, rakenteet ja käyttöluvat ovat kunnossa.

# Rajaukset
Tarjoukseen sisältyvät vain siinä nimenomaisesti mainitut tuotteet, työt ja palvelut.
Tarjoukseen kuulumattomat työt: {{ei_sisally}}

# Lisä- ja muutostyöt
Lisä- ja muutostyöt tehdään erillisellä sopimuksella tai muuten kirjallisesti hyväksytyllä tavalla.

# Vastaanotto
Tilaajan tulee tarkastaa toimitus ja työn lopputulos viivytyksettä.

# Reklamaatiot
Kirjalliset reklamaatiot: {{reklamaatio_yhteystieto}}

# Ylivoimainen este
Osapuoli ei vastaa viivästyksestä tai vahingosta siltä osin kuin se johtuu vaikutusmahdollisuuksien ulkopuolella olevasta esteestä.`,
  }),
  buildSystemTemplate({
    id: 'master-business-installation-contract',
    name: 'B2B - varusteasennusurakka',
    slug: 'b2b-varusteasennusurakka',
    description: 'Asennusurakan ehtopohja varuste- ja kalustetoimituksille.',
    customerSegment: 'business',
    scopeType: 'installation_contract',
    sortOrder: 50,
    contentMd: `# Sopimuksen kohde
Tarjous koskee tarjouksessa eriteltyjen tuotteiden asennusurakkaa sekä mahdollisia erikseen nimettyjä toimituksia.

# Kytkentä tarjottuun toimitukseen
Asennustarjous on voimassa vain yhdessä tarjotun varustetoimituksen kanssa, ellei toisin erikseen kirjallisesti sovita.

# Hinnat
Yksikköhinnat ja kokonaishinnat määräytyvät tarjouksen mukaan. Ellei toisin ilmoiteta, hinnat ovat ALV 0 %.
Maksuehto: {{maksuehto}}

# Urakan sisältö
Urakka sisältää vain tarjouksessa yksilöidyt tuotteet, työt ja suoritteet.
Asennuksen sisältö: {{asennuksen_sisalto}}

# Tilaajan vastuut
Tilaaja vastaa siitä, että:
- kohde on sovitussa aikataulussa asennusvalmis
- kulkureitit ovat esteettömät
- mahdollinen hissi on käytettävissä pystyhaalausta varten
- seinä- ja kattorakenteiden tarvittavat vahvikkeet ovat tilaajan vastuulla
- työalueella on normaalit työskentelyedellytykset

# Reikä- ja kiinnitysoletus
Hinnoittelu perustuu normaaleihin alustoihin ja tavanomaiseen kiinnitykseen. Timanttiporausta tai muuta erikoiskiinnitystä edellyttävät työt eivät sisälly hintaan, ellei niitä ole erikseen kirjattu tarjoukseen.

# Siivous
Urakka sisältää asennuksen jälkeisen perussiivouksen / lastapuhdas-luovutuksen siltä osin kuin se koskee urakoitsijan omaa työtä ja jätettä.

# Projektikulut
Mahdolliset projektikulut esitetään tarjouksessa omana eränään.
Projektikulut: {{projektikulut}}

# Lisä- ja muutostyöt
Tarjouksen ulkopuoliset työt, odotus, keskeytykset, lisäkäynnit, puutteelliset lähtötiedot tai työmaan keskeneräisyydestä johtuvat lisätyöt laskutetaan erikseen.

# Vastaanotto ja reklamointi
Tilaajan tulee tarkastaa työn lopputulos viivytyksettä valmistumisen jälkeen. Mahdolliset puutteet tulee ilmoittaa kirjallisesti yhteystietoon: {{reklamaatio_yhteystieto}}

# Ylivoimainen este
Osapuoli ei vastaa viivästyksestä tai vahingosta siltä osin kuin se johtuu vaikutusmahdollisuuksien ulkopuolella olevasta esteestä.`,
  }),
  buildSystemTemplate({
    id: 'master-business-project',
    name: 'B2B - projektitoimitus / urakkakohde',
    slug: 'b2b-projektitoimitus',
    description: 'Laajempaan projekti- tai urakkatoimitukseen tarkoitettu ehtopohja.',
    customerSegment: 'business',
    scopeType: 'project',
    sortOrder: 60,
    contentMd: `# Sopimuksen kohde
Tarjous koskee projektikohtaista toimitusta ja mahdollisia asennuksia kohteessa {{kohde_nimi}}.

# Sopimusasiakirjat
Ensisijaisesti noudatetaan tarjousta, sen liitteitä, mahdollista tilausvahvistusta ja näitä ehtoja tässä järjestyksessä, ellei kirjallisesti toisin sovita.

# Hinnat
Hinnat perustuvat tarjouksen tekohetkellä käytettävissä olleisiin tietoihin, määriin ja rajauksiin.

# Määrämuutokset
Jos kohteen määrät, laajuus, tuotevalinnat tai suoritusolosuhteet muuttuvat, myyjällä on oikeus tarkistaa hintaa ja aikataulua muutosta vastaavasti.

# Aikataulu ja edellytykset
Toimitus- ja asennusaikataulu edellyttää, että kohde etenee suunnitellusti, työalue on vapaa ja muut osapuolet ovat tehneet omat työnsä aikataulussa.

# Tilaajan vastuut
Tilaaja vastaa lähtötietojen oikeellisuudesta, työmaan valmiudesta, vastaanotosta, välivarastoinnista, suojauksesta ja muista tarjouksessa tilaajalle osoitetuista velvoitteista.

# Lisä- ja muutostyöt
Kaikki tarjouksen ulkopuoliset muutokset käsitellään lisä- ja muutostöinä.

# Vastaanotto, puutteet ja reklamaatiot
Tilaajan tulee tarkastaa toimitus ja ilmoittaa puutteista tai virheistä ilman aiheetonta viivytystä yhteystietoon: {{reklamaatio_yhteystieto}}

# Ylivoimainen este
Osapuoli ei vastaa viivästyksestä tai vahingosta siltä osin kuin se johtuu vaikutusmahdollisuuksien ulkopuolella olevasta esteestä.`,
  }),
];

export function getSystemTermTemplates() {
  return SYSTEM_TERM_TEMPLATES.map((template) => ({ ...template }));
}

export function hydrateStoredTermTemplates(storedTemplates: LegacyQuoteTerms[] | undefined, ownerUserId?: string) {
  return (storedTemplates ?? []).map((template, index) => {
    const name = typeof template.name === 'string' && template.name.trim() ? template.name.trim() : `Ehtopohja ${index + 1}`;
    const contentMd = typeof template.contentMd === 'string'
      ? template.contentMd
      : typeof template.content === 'string'
        ? template.content
        : '';
    const slug = typeof template.slug === 'string' && template.slug.trim() ? template.slug.trim() : slugify(name);
    const createdAt = typeof template.createdAt === 'string' ? template.createdAt : nowIso();
    const updatedAt = typeof template.updatedAt === 'string' ? template.updatedAt : createdAt;

    return {
      id: typeof template.id === 'string' && template.id.trim() ? template.id : crypto.randomUUID(),
      name,
      slug,
      description: typeof template.description === 'string' ? template.description : '',
      customerSegment: toSegment(template.customerSegment),
      scopeType: toScope(template.scopeType),
      contentMd,
      isSystem: false,
      baseTemplateId: typeof template.baseTemplateId === 'string' ? template.baseTemplateId : undefined,
      version: typeof template.version === 'number' && template.version > 0 ? template.version : 1,
      isActive: typeof template.isActive === 'boolean' ? template.isActive : true,
      isDefault: typeof template.isDefault === 'boolean' ? template.isDefault : index === 0,
      sortOrder: typeof template.sortOrder === 'number' ? template.sortOrder : 1000 + index,
      createdAt,
      updatedAt,
      createdByUserId: typeof template.createdByUserId === 'string' ? template.createdByUserId : ownerUserId,
      updatedByUserId: typeof template.updatedByUserId === 'string' ? template.updatedByUserId : ownerUserId,
      ownerUserId: typeof template.ownerUserId === 'string' ? template.ownerUserId : ownerUserId,
    } satisfies QuoteTerms;
  });
}

export function listTermTemplates(storedTemplates: LegacyQuoteTerms[] | undefined, ownerUserId?: string) {
  const userTemplates = hydrateStoredTermTemplates(storedTemplates, ownerUserId);
  return [...getSystemTermTemplates(), ...userTemplates].sort((left, right) => {
    if (left.isSystem !== right.isSystem) {
      return left.isSystem ? -1 : 1;
    }
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return left.name.localeCompare(right.name, 'fi');
  });
}

export function createTermTemplate(storedTemplates: LegacyQuoteTerms[] | undefined, input: TermTemplateInput, ownerUserId: string) {
  const userTemplates = hydrateStoredTermTemplates(storedTemplates, ownerUserId);
  const trimmedName = input.name.trim();
  const trimmedContent = input.contentMd.trim();

  if (!trimmedName) {
    throw new Error('Anna ehtopohjalle nimi.');
  }
  if (!trimmedContent) {
    throw new Error('Anna ehtopohjalle sisältö.');
  }

  const now = nowIso();
  const template: QuoteTerms = {
    id: crypto.randomUUID(),
    name: trimmedName,
    slug: ensureUniqueSlug(userTemplates, slugify(trimmedName)),
    description: input.description.trim(),
    customerSegment: input.customerSegment,
    scopeType: input.scopeType,
    contentMd: trimmedContent,
    isSystem: false,
    baseTemplateId: undefined,
    version: 1,
    isActive: input.isActive,
    isDefault: input.isDefault,
    sortOrder: userTemplates.length > 0 ? Math.max(...userTemplates.map((item) => item.sortOrder)) + 10 : 1000,
    createdAt: now,
    updatedAt: now,
    createdByUserId: ownerUserId,
    updatedByUserId: ownerUserId,
    ownerUserId,
  };

  const nextTemplates = input.isDefault
    ? userTemplates.map((item) => ({ ...item, isDefault: false }))
    : [...userTemplates];

  nextTemplates.push(template);
  return { templates: nextTemplates, template };
}

export function updateTermTemplate(storedTemplates: LegacyQuoteTerms[] | undefined, templateId: string, updates: Partial<TermTemplateInput>, ownerUserId: string) {
  if (getSystemTermTemplates().some((template) => template.id === templateId)) {
    throw new Error('Master-pohjaa ei voi muokata suoraan. Luo siitä oma kopio.');
  }

  const userTemplates = hydrateStoredTermTemplates(storedTemplates, ownerUserId);
  const currentTemplate = userTemplates.find((template) => template.id === templateId);

  if (!currentTemplate) {
    throw new Error('Ehtopohjaa ei löytynyt.');
  }
  if (currentTemplate.isSystem) {
    throw new Error('Master-pohjaa ei voi muokata suoraan. Luo siitä oma kopio.');
  }

  const nextName = typeof updates.name === 'string' ? updates.name.trim() : currentTemplate.name;
  const nextContent = typeof updates.contentMd === 'string' ? updates.contentMd.trim() : currentTemplate.contentMd;

  if (!nextName) {
    throw new Error('Anna ehtopohjalle nimi.');
  }
  if (!nextContent) {
    throw new Error('Anna ehtopohjalle sisältö.');
  }

  const baseTemplates = userTemplates.filter((template) => template.id !== templateId);
  const desiredSlug = typeof updates.name === 'string' ? ensureUniqueSlug(baseTemplates, slugify(nextName)) : currentTemplate.slug;
  const now = nowIso();
  const nextTemplates = userTemplates.map((template) => {
    if (template.id !== templateId) {
      return updates.isDefault ? { ...template, isDefault: false } : template;
    }

    return {
      ...template,
      name: nextName,
      slug: desiredSlug,
      description: typeof updates.description === 'string' ? updates.description.trim() : template.description,
      customerSegment: updates.customerSegment ?? template.customerSegment,
      scopeType: updates.scopeType ?? template.scopeType,
      contentMd: nextContent,
      isActive: typeof updates.isActive === 'boolean' ? updates.isActive : template.isActive,
      isDefault: typeof updates.isDefault === 'boolean' ? updates.isDefault : template.isDefault,
      version: template.version + 1,
      updatedAt: now,
      updatedByUserId: ownerUserId,
    };
  });

  return {
    templates: nextTemplates,
    template: nextTemplates.find((template) => template.id === templateId)!,
  };
}

export function cloneTermTemplateFromMaster(storedTemplates: LegacyQuoteTerms[] | undefined, masterId: string, ownerUserId: string) {
  const userTemplates = hydrateStoredTermTemplates(storedTemplates, ownerUserId);
  const masterTemplate = getSystemTermTemplates().find((template) => template.id === masterId);

  if (!masterTemplate) {
    throw new Error('Master-pohjaa ei löytynyt.');
  }

  const desiredName = ensureUniqueName(userTemplates, `${masterTemplate.name} (oma versio)`);
  const now = nowIso();
  const template: QuoteTerms = {
    ...masterTemplate,
    id: crypto.randomUUID(),
    name: desiredName,
    slug: ensureUniqueSlug(userTemplates, slugify(desiredName)),
    isSystem: false,
    baseTemplateId: masterTemplate.id,
    version: 1,
    isActive: true,
    isDefault: false,
    sortOrder: (userTemplates.at(-1)?.sortOrder ?? 1000) + 10,
    createdAt: now,
    updatedAt: now,
    createdByUserId: ownerUserId,
    updatedByUserId: ownerUserId,
    ownerUserId,
  };

  return {
    templates: [...userTemplates, template],
    template,
  };
}

export function duplicateTermTemplate(storedTemplates: LegacyQuoteTerms[] | undefined, templateId: string, ownerUserId: string) {
  const templates = listTermTemplates(storedTemplates, ownerUserId);
  const sourceTemplate = templates.find((template) => template.id === templateId);

  if (!sourceTemplate) {
    throw new Error('Ehtopohjaa ei löytynyt.');
  }

  if (sourceTemplate.isSystem) {
    return cloneTermTemplateFromMaster(storedTemplates, sourceTemplate.id, ownerUserId);
  }

  const userTemplates = hydrateStoredTermTemplates(storedTemplates, ownerUserId);
  const desiredName = ensureUniqueName(userTemplates, `${sourceTemplate.name} (kopio)`);
  const now = nowIso();
  const template: QuoteTerms = {
    ...sourceTemplate,
    id: crypto.randomUUID(),
    name: desiredName,
    slug: ensureUniqueSlug(userTemplates, slugify(desiredName)),
    version: 1,
    isDefault: false,
    sortOrder: (userTemplates.at(-1)?.sortOrder ?? 1000) + 10,
    createdAt: now,
    updatedAt: now,
    createdByUserId: ownerUserId,
    updatedByUserId: ownerUserId,
    ownerUserId,
  };

  return {
    templates: [...userTemplates, template],
    template,
  };
}

export function restoreTermTemplateFromMaster(storedTemplates: LegacyQuoteTerms[] | undefined, templateId: string, ownerUserId: string) {
  const userTemplates = hydrateStoredTermTemplates(storedTemplates, ownerUserId);
  const template = userTemplates.find((entry) => entry.id === templateId);

  if (!template) {
    throw new Error('Ehtopohjaa ei löytynyt.');
  }
  if (!template.baseTemplateId) {
    throw new Error('Palautus masterista on mahdollinen vain masterista luoduille kopioille.');
  }

  const masterTemplate = getSystemTermTemplates().find((entry) => entry.id === template.baseTemplateId);
  if (!masterTemplate) {
    throw new Error('Master-pohjaa ei löytynyt.');
  }

  const now = nowIso();
  const nextTemplates = userTemplates.map((entry) =>
    entry.id === templateId
      ? {
          ...entry,
          description: masterTemplate.description,
          customerSegment: masterTemplate.customerSegment,
          scopeType: masterTemplate.scopeType,
          contentMd: masterTemplate.contentMd,
          version: entry.version + 1,
          updatedAt: now,
          updatedByUserId: ownerUserId,
        }
      : entry
  );

  return {
    templates: nextTemplates,
    template: nextTemplates.find((entry) => entry.id === templateId)!,
  };
}

export function setTermTemplateArchived(storedTemplates: LegacyQuoteTerms[] | undefined, templateId: string, archived: boolean, ownerUserId: string) {
  const userTemplates = hydrateStoredTermTemplates(storedTemplates, ownerUserId);
  const template = userTemplates.find((entry) => entry.id === templateId);

  if (!template) {
    throw new Error('Ehtopohjaa ei löytynyt.');
  }
  if (template.isSystem) {
    throw new Error('Master-pohjaa ei voi arkistoida.');
  }

  const now = nowIso();
  const nextTemplates = userTemplates.map((entry) =>
    entry.id === templateId
      ? {
          ...entry,
          isActive: !archived,
          isDefault: archived ? false : entry.isDefault,
          updatedAt: now,
          updatedByUserId: ownerUserId,
        }
      : entry
  );

  return {
    templates: nextTemplates,
    template: nextTemplates.find((entry) => entry.id === templateId)!,
  };
}

export function getDefaultTermTemplate(templates: QuoteTerms[]) {
  return templates.find((template) => !template.isSystem && template.isActive && template.isDefault);
}

export function createQuoteTermsSnapshot(template: QuoteTerms | null | undefined) {
  if (!template) {
    return {
      termsId: undefined,
      termsSnapshotName: undefined,
      termsSnapshotContentMd: undefined,
    };
  }

  return {
    termsId: template.id,
    termsSnapshotName: template.name,
    termsSnapshotContentMd: template.contentMd,
  };
}

export function resolveQuoteTermsSnapshotTemplate(
  quote: Pick<Quote, 'termsId' | 'termsSnapshotName' | 'termsSnapshotContentMd'>,
  template?: QuoteTerms | null
) {
  if (quote.termsSnapshotContentMd?.trim()) {
    return {
      ...(template ?? getSystemTermTemplates()[0]),
      id: quote.termsId || template?.id || 'snapshot-template',
      name: quote.termsSnapshotName?.trim() || template?.name || 'Tarjousehdot',
      contentMd: quote.termsSnapshotContentMd,
      isSystem: false,
    } satisfies QuoteTerms;
  }

  return template ?? null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderTermTemplateHtml(contentMd: string) {
  return marked.parse(escapeHtml(contentMd), {
    breaks: true,
  }) as string;
}

export function renderTermTemplatePlainText(contentMd: string) {
  return contentMd
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface TermTemplateRenderContext {
  customer?: Customer;
  project?: Project;
  quote?: Quote;
  settings?: Settings;
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fi-FI').format(date);
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number') {
    return '-';
  }

  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function resolveTermTemplatePlaceholders(contentMd: string, context: TermTemplateRenderContext) {
  const replacementMap: Record<string, string> = {
    '{{yritys_nimi}}': context.settings?.companyName || '-',
    '{{yritys_y_tunnus}}': '-',
    '{{asiakas_nimi}}': context.customer?.name || '-',
    '{{asiakas_osoite}}': context.customer?.address || '-',
    '{{tarjous_numero}}': context.quote?.quoteNumber || '-',
    '{{tarjous_pvm}}': formatDate(context.quote?.createdAt),
    '{{voimassa_asti}}': formatDate(context.quote?.validUntil),
    '{{maksuehto}}': '14 päivää netto',
    '{{toimitusaika}}': context.quote?.schedule || '-',
    '{{kohde_nimi}}': context.project?.name || '-',
    '{{kohde_osoite}}': context.project?.site || '-',
    '{{asennuksen_sisalto}}': context.quote?.notes || '-',
    '{{ei_sisally}}': '-',
    '{{projektikulut}}': formatCurrency(context.quote?.projectCosts),
    '{{reklamaatio_yhteystieto}}': context.settings?.companyEmail || context.settings?.companyPhone || '-',
  };

  return contentMd.replace(/\{\{[a-z_]+\}\}/g, (token) => replacementMap[token] ?? token);
}
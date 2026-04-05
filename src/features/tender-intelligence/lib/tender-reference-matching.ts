export interface TenderReferenceEvidenceLink {
  sourceIndex: number;
  confidence: number | null;
  matchedRule: string;
}

export interface TenderReferenceRequirementCandidate<RequirementId = string> {
  id: RequirementId;
  title: string;
  description: string | null;
  sourceExcerpt: string | null;
  evidenceLinks?: TenderReferenceEvidenceLink[];
}

export interface TenderReferenceProfileCandidate {
  id: string;
  title: string;
  clientName: string | null;
  projectType: string | null;
  description: string | null;
  location: string | null;
  completedYear: number | null;
  contractValue: number | null;
  tags: string[] | null;
}

export interface TenderReferenceMatchSummary {
  matchedKeywords: string[];
  matchedFields: string[];
  projectTypeMatched: boolean;
  locationMatched: boolean;
  referenceWindowYears: number | null;
  completedYearMatched: boolean | null;
  score: number;
}

export interface TenderReferenceProfileMatchSuggestion<RequirementId = string> {
  requirementId: RequirementId;
  profileId: string;
  title: string;
  rationale: string;
  confidence: number;
  score: number;
  matchSummary: TenderReferenceMatchSummary;
  evidenceLinks: TenderReferenceEvidenceLink[];
}

const REFERENCE_REQUIREMENT_PATTERN = /\breferenss\w*\b|vastaava\w*\s+(?:kohde|toimitus|urakka|projekti)|aikaisemmat\s+kohteet|kokemus\s+vastaavista/i;
const REFERENCE_WINDOW_PATTERN = /viimeisen\s+(\d+)\s+vuoden\s+aikana/i;
const GENERIC_REFERENCE_WORDS = new Set([
  'aikana',
  'esita',
  'esittaa',
  'jotka',
  'kohde',
  'kohdetta',
  'kohteet',
  'kohteita',
  'kokemus',
  'mukaiset',
  'mukaiset',
  'referenssi',
  'referenssit',
  'tarjous',
  'tarjouksessa',
  'tarjouspyynnon',
  'tarjoajalla',
  'toimitus',
  'toimitukset',
  'tulee',
  'urakka',
  'vaaditaan',
  'vastaava',
  'vastaavat',
  'vuoden',
  'vuotta',
]);

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeComparableText(value: string | null | undefined) {
  return compactWhitespace(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildRequirementText(candidate: Pick<TenderReferenceRequirementCandidate, 'title' | 'description' | 'sourceExcerpt'>) {
  return [candidate.title, candidate.description, candidate.sourceExcerpt].filter(Boolean).join(' ');
}

function buildProfileFieldMap(profile: TenderReferenceProfileCandidate) {
  return {
    otsikko: normalizeComparableText(profile.title),
    asiakas: normalizeComparableText(profile.clientName),
    projektityyppi: normalizeComparableText(profile.projectType),
    kuvaus: normalizeComparableText(profile.description),
    sijainti: normalizeComparableText(profile.location),
    tagit: normalizeComparableText((profile.tags ?? []).join(' ')),
  };
}

function tokenizeRequirementKeywords(requirementText: string) {
  const normalized = normalizeComparableText(requirementText);

  if (!normalized) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      normalized
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token.length >= 4)
        .filter((token) => !/^\d+$/.test(token))
        .filter((token) => !GENERIC_REFERENCE_WORDS.has(token)),
    ),
  );
}

function extractReferenceWindowYears(requirementText: string) {
  const match = REFERENCE_WINDOW_PATTERN.exec(requirementText);

  if (!match?.[1]) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function hasClearValue(value: string | null | undefined) {
  return normalizeComparableText(value).length >= 4;
}

function matchesClearPhrase(requirementText: string, value: string | null | undefined) {
  const normalizedValue = normalizeComparableText(value);

  if (!normalizedValue) {
    return false;
  }

  if (requirementText.includes(normalizedValue)) {
    return true;
  }

  const stemLength = Math.max(4, normalizedValue.length - 2);
  const normalizedStem = normalizedValue.slice(0, stemLength);

  return requirementText
    .split(' ')
    .some((token) => token.startsWith(normalizedStem));
}

function formatFieldList(fields: string[]) {
  if (fields.length === 1) {
    return fields[0];
  }

  if (fields.length === 2) {
    return `${fields[0]} ja ${fields[1]}`;
  }

  return `${fields.slice(0, -1).join(', ')} ja ${fields[fields.length - 1]}`;
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

export function isTenderReferenceRequirementCandidate(
  candidate: Pick<TenderReferenceRequirementCandidate, 'title' | 'description' | 'sourceExcerpt'>,
) {
  return REFERENCE_REQUIREMENT_PATTERN.test(buildRequirementText(candidate));
}

function buildMatchRationale(options: {
  matchedKeywords: string[];
  matchedFields: string[];
  profile: TenderReferenceProfileCandidate;
  projectTypeMatched: boolean;
  locationMatched: boolean;
  referenceWindowYears: number | null;
  completedYearMatched: boolean | null;
}) {
  const parts: string[] = [];

  if (options.matchedKeywords.length > 0) {
    parts.push(
      `Avainsanat ${options.matchedKeywords.join(', ')} löytyivät profiilin ${formatFieldList(options.matchedFields)}.`,
    );
  }

  if (options.projectTypeMatched && options.profile.projectType) {
    parts.push(`Projektityyppi "${options.profile.projectType}" esiintyy myös vaatimustekstissä.`);
  }

  if (options.locationMatched && options.profile.location) {
    parts.push(`Sijainti "${options.profile.location}" täsmää vaatimuksen sanamuotoon.`);
  }

  if (options.referenceWindowYears != null && options.completedYearMatched && options.profile.completedYear != null) {
    parts.push(
      `Valmistumisvuosi ${options.profile.completedYear} osuu vaatimuksen viimeisen ${options.referenceWindowYears} vuoden ikkunaan.`,
    );
  }

  return parts.join(' ');
}

function buildSuggestionForProfile<RequirementId>(options: {
  requirement: TenderReferenceRequirementCandidate<RequirementId>;
  profile: TenderReferenceProfileCandidate;
  currentYear: number;
}) {
  const requirementText = buildRequirementText(options.requirement);

  if (!isTenderReferenceRequirementCandidate(options.requirement)) {
    return null;
  }

  const normalizedRequirementText = normalizeComparableText(requirementText);
  const requirementKeywords = tokenizeRequirementKeywords(requirementText);
  const profileFields = buildProfileFieldMap(options.profile);
  const matchedKeywords = new Set<string>();
  const matchedFields = new Set<string>();
  let keywordScore = 0;

  requirementKeywords.forEach((keyword) => {
    const fieldHits = Object.entries(profileFields)
      .filter(([, normalizedValue]) => normalizedValue.includes(keyword))
      .map(([field]) => field);

    if (fieldHits.length === 0) {
      return;
    }

    matchedKeywords.add(keyword);
    fieldHits.forEach((field) => matchedFields.add(field));
    keywordScore += fieldHits.some((field) => field === 'otsikko' || field === 'tagit' || field === 'asiakas') ? 0.12 : 0.08;
    keywordScore += Math.min(0.04, Math.max(0, fieldHits.length - 1) * 0.02);
  });

  keywordScore = Math.min(keywordScore, 0.48);

  const normalizedProjectType = normalizeComparableText(options.profile.projectType);
  const projectTypeMatched = Boolean(normalizedProjectType) && normalizedRequirementText.includes(normalizedProjectType);
  const projectTypeScore = projectTypeMatched ? 0.22 : 0;

  const locationMatched = hasClearValue(options.profile.location) && matchesClearPhrase(normalizedRequirementText, options.profile.location);
  const locationScore = locationMatched ? 0.14 : 0;

  const referenceWindowYears = extractReferenceWindowYears(requirementText);
  let completedYearMatched: boolean | null = null;
  let completedYearScore = 0;

  if (referenceWindowYears != null) {
    if (options.profile.completedYear == null) {
      return null;
    }

    completedYearMatched = options.profile.completedYear >= options.currentYear - referenceWindowYears;

    if (!completedYearMatched) {
      return null;
    }

    completedYearScore = 0.12;
  }

  if (matchedKeywords.size === 0 && !projectTypeMatched && !locationMatched) {
    return null;
  }

  const score = roundScore(Math.min(0.96, keywordScore + projectTypeScore + locationScore + completedYearScore));

  if (score < 0.34) {
    return null;
  }

  const rationale = buildMatchRationale({
    matchedKeywords: Array.from(matchedKeywords),
    matchedFields: Array.from(matchedFields),
    profile: options.profile,
    projectTypeMatched,
    locationMatched,
    referenceWindowYears,
    completedYearMatched,
  });

  if (!rationale) {
    return null;
  }

  return {
    requirementId: options.requirement.id,
    profileId: options.profile.id,
    title: options.profile.title,
    rationale,
    confidence: score,
    score,
    matchSummary: {
      matchedKeywords: Array.from(matchedKeywords),
      matchedFields: Array.from(matchedFields),
      projectTypeMatched,
      locationMatched,
      referenceWindowYears,
      completedYearMatched,
      score,
    },
    evidenceLinks: [...(options.requirement.evidenceLinks ?? [])],
  } satisfies TenderReferenceProfileMatchSuggestion<RequirementId>;
}

export function buildTenderReferenceMatches<RequirementId>(input: {
  requirements: TenderReferenceRequirementCandidate<RequirementId>[];
  profiles: TenderReferenceProfileCandidate[];
  currentYear?: number;
  maxSuggestionsPerRequirement?: number;
}) {
  if (input.requirements.length === 0 || input.profiles.length === 0) {
    return [] as TenderReferenceProfileMatchSuggestion<RequirementId>[];
  }

  const currentYear = input.currentYear ?? new Date().getUTCFullYear();
  const maxSuggestionsPerRequirement = Math.max(1, input.maxSuggestionsPerRequirement ?? 3);
  const grouped = new Map<RequirementId, TenderReferenceProfileMatchSuggestion<RequirementId>[]>();

  input.requirements.forEach((requirement) => {
    const matches = input.profiles
      .map((profile) => buildSuggestionForProfile({ requirement, profile, currentYear }))
      .filter((match): match is TenderReferenceProfileMatchSuggestion<RequirementId> => Boolean(match))
      .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, 'fi-FI'))
      .slice(0, maxSuggestionsPerRequirement);

    if (matches.length > 0) {
      grouped.set(requirement.id, matches);
    }
  });

  return input.requirements.flatMap((requirement) => grouped.get(requirement.id) ?? []);
}
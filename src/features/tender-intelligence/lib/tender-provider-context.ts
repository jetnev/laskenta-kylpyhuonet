export const TENDER_PROVIDER_CONTEXT_ARTIFACT_SECTION_TITLES = {
  outlineOverview: 'Tarjoajaprofiilin lähtötiedot',
  outlineTemplates: 'Hyödynnettävät vastauspohjat',
  summaryOverview: 'Tarjoajaprofiilin ydinviesti',
  clarificationConstraints: 'Tarjoajaprofiilin kovat rajaukset',
} as const;

const TENDER_PROVIDER_CONTEXT_SECTION_META = [
  {
    label: 'Tarjoajaprofiili',
    markers: [
      `## ${TENDER_PROVIDER_CONTEXT_ARTIFACT_SECTION_TITLES.outlineOverview}`,
      `## ${TENDER_PROVIDER_CONTEXT_ARTIFACT_SECTION_TITLES.summaryOverview}`,
      '## Tarjoajaprofiili',
    ],
  },
  {
    label: 'Vastauspohjat',
    markers: [
      `## ${TENDER_PROVIDER_CONTEXT_ARTIFACT_SECTION_TITLES.outlineTemplates}`,
      '## Vastauspohjat',
    ],
  },
  {
    label: 'Tarjoajan reunaehdot',
    markers: [
      `## ${TENDER_PROVIDER_CONTEXT_ARTIFACT_SECTION_TITLES.clarificationConstraints}`,
      '## Tarjoajan reunaehdot',
    ],
  },
] as const;

function normalizeContent(value: string | null | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : null;
}

export function listTenderProviderContextLabels(contentMd?: string | null) {
  const normalizedContent = normalizeContent(contentMd);

  if (!normalizedContent) {
    return [];
  }

  return TENDER_PROVIDER_CONTEXT_SECTION_META
    .filter((section) => section.markers.some((marker) => normalizedContent.includes(marker)))
    .map((section) => section.label);
}

export function hasTenderProviderContext(contentMd?: string | null) {
  return listTenderProviderContextLabels(contentMd).length > 0;
}
function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.trim();
  }

  if (error && typeof error === 'object') {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown };
    const parts = [candidate.message, candidate.details, candidate.hint]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .map((part) => part.trim());

    return Array.from(new Set(parts)).join(' ').trim();
  }

  return '';
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== 'object') {
    return '';
  }

  const candidate = error as { code?: unknown };
  return typeof candidate.code === 'string' ? candidate.code.toUpperCase().trim() : '';
}

function includesAny(message: string, candidates: string[]) {
  return candidates.some((candidate) => message.includes(candidate));
}

function isEdgeFunctionUnavailableMessage(message: string) {
  return (
    message.includes('functionsfetcherror')
    || (
      message.includes('edge function')
      && includesAny(message, ['failed to send a request', 'non-2xx status code', '404', 'not found'])
    )
  );
}

function isStorageBucketUnavailableMessage(message: string) {
  return (
    message.includes('bucket')
    && includesAny(message, ['not found', 'does not exist', 'missing'])
  );
}

export type TenderIntelligenceEnvironmentIssueType = 'schema' | 'storage' | 'analysis-runner' | 'extraction-runner';
export type TenderIntelligenceEnvironmentOperation = 'generic' | 'storage-upload' | 'analysis-runner' | 'extraction-runner';

export function getTenderIntelligenceSchemaUnavailableMessage() {
  return 'Tarjousäly ei ole käytössä tässä ympäristössä vielä. Tämän ympäristön Supabase-tietokannasta puuttuvat Tarjousälyn taulut tai niiden schema cache ei ole päivittynyt. Ota Tarjousälyn migraatiot käyttöön tässä ympäristössä ja päivitä sen jälkeen palvelun schema.';
}

export function getTenderIntelligenceStorageUnavailableMessage() {
  return 'Tarjousälyn dokumenttivarasto ei ole käytössä tässä ympäristössä vielä. Tarkista että Supabase Storage -bucket `tender-intelligence` on olemassa ja että ympäristön storage-oikeudet ovat kunnossa ennen dokumenttien latausta.';
}

export function getTenderIntelligenceAnalysisRunnerUnavailableMessage() {
  return 'Tarjousälyn analyysipalvelu ei ole käytössä tässä ympäristössä vielä. Julkaise Edge Function `tender-analysis-runner` ja varmista, että tietokantamuutokset on viety tähän ympäristöön ennen analyysin käynnistämistä.';
}

export function getTenderIntelligenceExtractionRunnerUnavailableMessage() {
  return 'Tarjousälyn extraction-palvelu ei ole käytössä tässä ympäristössä vielä. Julkaise Edge Function `tender-document-extractor` ja varmista, että dokumenttien storage sekä migraatiot ovat valmiina ennen extractionin käynnistämistä.';
}

export function isTenderIntelligenceSchemaUnavailableError(error: unknown) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  if (code === '42P01' && message.includes('tender_')) {
    return true;
  }

  if (code === 'PGRST205' || code === 'PGRST204') {
    return message.includes('tender_') || message.includes('schema cache');
  }

  return (
    (message.includes('public.tender_packages') || message.includes('tender_packages'))
    && (
      message.includes('schema cache')
      || message.includes('does not exist')
      || message.includes('could not find the table')
    )
  );
}

export function isTenderIntelligenceSchemaUnavailableMessage(message?: string | null) {
  const normalizedMessage = message?.trim().toLowerCase() ?? '';

  if (!normalizedMessage) {
    return false;
  }

  return (
    normalizedMessage.includes(getTenderIntelligenceSchemaUnavailableMessage().toLowerCase())
    || (
      (normalizedMessage.includes('public.tender_packages') || normalizedMessage.includes('tender_packages'))
      && (
        normalizedMessage.includes('schema cache')
        || normalizedMessage.includes('does not exist')
        || normalizedMessage.includes('could not find the table')
      )
    )
  );
}

export function getTenderIntelligenceEnvironmentIssueTypeFromMessage(message?: string | null): TenderIntelligenceEnvironmentIssueType | null {
  const normalizedMessage = message?.trim().toLowerCase() ?? '';

  if (!normalizedMessage) {
    return null;
  }

  if (isTenderIntelligenceSchemaUnavailableMessage(normalizedMessage)) {
    return 'schema';
  }

  if (
    normalizedMessage.includes(getTenderIntelligenceStorageUnavailableMessage().toLowerCase())
    || isStorageBucketUnavailableMessage(normalizedMessage)
  ) {
    return 'storage';
  }

  if (normalizedMessage.includes(getTenderIntelligenceAnalysisRunnerUnavailableMessage().toLowerCase())) {
    return 'analysis-runner';
  }

  if (normalizedMessage.includes(getTenderIntelligenceExtractionRunnerUnavailableMessage().toLowerCase())) {
    return 'extraction-runner';
  }

  return null;
}

export function getTenderIntelligenceEnvironmentIssueMessage(
  error: unknown,
  options: { operation?: TenderIntelligenceEnvironmentOperation } = {},
) {
  if (isTenderIntelligenceSchemaUnavailableError(error)) {
    return getTenderIntelligenceSchemaUnavailableMessage();
  }

  const message = getErrorMessage(error).toLowerCase();

  if (!message) {
    return null;
  }

  if (options.operation === 'storage-upload' && isStorageBucketUnavailableMessage(message)) {
    return getTenderIntelligenceStorageUnavailableMessage();
  }

  if (options.operation === 'analysis-runner' && isEdgeFunctionUnavailableMessage(message)) {
    return getTenderIntelligenceAnalysisRunnerUnavailableMessage();
  }

  if (options.operation === 'extraction-runner' && isEdgeFunctionUnavailableMessage(message)) {
    return getTenderIntelligenceExtractionRunnerUnavailableMessage();
  }

  return null;
}
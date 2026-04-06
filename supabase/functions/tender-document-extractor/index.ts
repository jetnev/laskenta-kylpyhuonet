// deno-lint-ignore-file no-explicit-any
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { strFromU8, unzipSync } from 'npm:fflate@0.8.2';
import { getDocument } from 'npm:pdfjs-dist@5.4.296/legacy/build/pdf.mjs';
import * as XLSX from 'npm:xlsx@0.18.5';

import {
  chunkTenderExtractedText,
  getTenderDocumentExtractionSupport,
  normalizeTenderExtractedText,
} from '../../../src/features/tender-intelligence/lib/tender-document-extraction.ts';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ExtractionRunnerResponse {
  accepted: boolean;
  extractionId: string | null;
  tenderDocumentId: string | null;
  status: string;
  message: string | null;
  chunkCount?: number | null;
  characterCount?: number | null;
}

function jsonResponse(body: ExtractionRunnerResponse, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function rejected(status: number, message: string) {
  return jsonResponse(
    {
      accepted: false,
      extractionId: null,
      tenderDocumentId: null,
      status: 'rejected',
      message,
      chunkCount: null,
      characterCount: null,
    },
    status,
  );
}

async function updateDocumentParseStatus(
  client: SupabaseClient,
  documentId: string,
  parseStatus: 'not-started' | 'queued' | 'processing' | 'completed' | 'failed',
) {
  const { error } = await client
    .from('tender_documents')
    .update({ parse_status: parseStatus })
    .eq('id', documentId);

  if (error) {
    throw error;
  }
}

async function upsertExtraction(
  client: SupabaseClient,
  payload: {
    tender_document_id: string;
    extraction_status: 'not_started' | 'pending' | 'extracting' | 'extracted' | 'failed' | 'unsupported';
    extractor_type: 'none' | 'plain_text' | 'markdown' | 'csv' | 'xlsx' | 'pdf' | 'docx' | 'unsupported';
    source_mime_type: string;
    character_count?: number | null;
    chunk_count?: number | null;
    extracted_text?: string | null;
    error_message?: string | null;
    extracted_at?: string | null;
  },
) {
  const { data, error } = await client
    .from('tender_document_extractions')
    .upsert(payload, { onConflict: 'tender_document_id' })
    .select('id, extraction_status')
    .single();

  if (error) {
    throw error;
  }

  return data as { id: string; extraction_status: string };
}

async function clearDocumentChunks(client: SupabaseClient, documentId: string) {
  const { error } = await client
    .from('tender_document_chunks')
    .delete()
    .eq('tender_document_id', documentId);

  if (error) {
    throw error;
  }
}

async function insertChunks(
  client: SupabaseClient,
  input: {
    extractionId: string;
    documentId: string;
    chunks: ReturnType<typeof chunkTenderExtractedText>;
  },
) {
  if (input.chunks.length === 0) {
    return;
  }

  const { error } = await client.from('tender_document_chunks').insert(
    input.chunks.map((chunk) => ({
      extraction_id: input.extractionId,
      tender_document_id: input.documentId,
      chunk_index: chunk.chunkIndex,
      text_content: chunk.textContent,
      character_count: chunk.characterCount,
    })),
  );

  if (error) {
    throw error;
  }
}

function decodeText(bytes: Uint8Array) {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  return normalizeTenderExtractedText(text.replace(/^\ufeff/, ''));
}

function extractTextFromWorkbook(bytes: Uint8Array) {
  const workbook = XLSX.read(bytes, { type: 'array' });
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      continue;
    }

    const csv = normalizeTenderExtractedText(
      XLSX.utils.sheet_to_csv(sheet, { blankrows: false }),
    );

    if (!csv) {
      continue;
    }

    parts.push(`# ${sheetName}`);
    parts.push(csv);
  }

  return normalizeTenderExtractedText(parts.join('\n\n'));
}

function normalizePdfToken(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function finalizePdfLine(tokens: string[]) {
  return tokens.join(' ').replace(/\s+([,.;:!?])/g, '$1').trim();
}

function isPdfTextItem(value: unknown): value is {
  str: string;
  hasEOL?: boolean;
  transform?: number[];
} {
  return Boolean(value)
    && typeof value === 'object'
    && 'str' in value
    && typeof (value as { str?: unknown }).str === 'string';
}

async function extractTextFromPdf(bytes: Uint8Array) {
  const loadingTask = getDocument({
    data: bytes,
    disableWorker: true,
    isEvalSupported: false,
    useWorkerFetch: false,
    stopAtErrors: false,
  });

  try {
    const pdfDocument = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const lines: string[] = [];
      let currentLineTokens: string[] = [];
      let lastY: number | null = null;

      const flushLine = () => {
        if (currentLineTokens.length === 0) {
          return;
        }

        const line = finalizePdfLine(currentLineTokens);
        currentLineTokens = [];

        if (line) {
          lines.push(line);
        }
      };

      for (const item of textContent.items) {
        if (!isPdfTextItem(item)) {
          continue;
        }

        const token = normalizePdfToken(item.str);

        if (!token) {
          continue;
        }

        const nextY = Array.isArray(item.transform) && typeof item.transform[5] === 'number'
          ? item.transform[5]
          : null;

        if (
          currentLineTokens.length > 0
          && nextY != null
          && lastY != null
          && Math.abs(nextY - lastY) > 2
        ) {
          flushLine();
        }

        currentLineTokens.push(token);
        lastY = nextY ?? lastY;

        if (item.hasEOL) {
          flushLine();
        }
      }

      flushLine();

      const pageText = normalizeTenderExtractedText(lines.join('\n'));

      if (pageText) {
        pageTexts.push(pageText);
      }

      page.cleanup();
    }

    return normalizeTenderExtractedText(pageTexts.join('\n\n'));
  } finally {
    await loadingTask.destroy();
  }
}

function getOpenXmlElementsByLocalName(root: Document | Element, localName: string) {
  const namespaceMatches = Array.from(root.getElementsByTagNameNS('*', localName));

  if (namespaceMatches.length > 0) {
    return namespaceMatches;
  }

  return Array.from(root.getElementsByTagName(`w:${localName}`));
}

function collectOpenXmlNodeText(node: Node | null): string {
  if (!node) {
    return '';
  }

  let text = '';

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType !== 1) {
      continue;
    }

    const element = child as Element;

    switch (element.localName) {
      case 't':
        text += element.textContent ?? '';
        break;
      case 'tab':
        text += '\t';
        break;
      case 'br':
      case 'cr':
        text += '\n';
        break;
      case 'instrText':
        break;
      default:
        text += collectOpenXmlNodeText(element);
        break;
    }
  }

  return text;
}

function extractTextFromOpenXmlPart(xml: string) {
  const parsed = new DOMParser().parseFromString(xml, 'application/xml');

  if (!parsed?.documentElement || parsed.getElementsByTagName('parsererror').length > 0) {
    return '';
  }

  const paragraphs = getOpenXmlElementsByLocalName(parsed, 'p');
  const blocks = (paragraphs.length > 0 ? paragraphs : [parsed.documentElement])
    .map((paragraph) => normalizeTenderExtractedText(collectOpenXmlNodeText(paragraph)))
    .filter(Boolean);

  return normalizeTenderExtractedText(blocks.join('\n\n'));
}

function getDocxTextPartPaths(entries: Record<string, Uint8Array>) {
  return Object.keys(entries)
    .filter((path) => (
      path === 'word/document.xml'
      || path === 'word/footnotes.xml'
      || path === 'word/endnotes.xml'
      || path === 'word/comments.xml'
      || /^word\/header\d+\.xml$/i.test(path)
      || /^word\/footer\d+\.xml$/i.test(path)
    ))
    .sort((left, right) => {
      const rank = (value: string) => {
        if (value === 'word/document.xml') {
          return 0;
        }

        if (value === 'word/footnotes.xml') {
          return 1;
        }

        if (value === 'word/endnotes.xml') {
          return 2;
        }

        if (value === 'word/comments.xml') {
          return 3;
        }

        if (/^word\/header\d+\.xml$/i.test(value)) {
          return 4;
        }

        if (/^word\/footer\d+\.xml$/i.test(value)) {
          return 5;
        }

        return 10;
      };

      const rankDifference = rank(left) - rank(right);

      if (rankDifference !== 0) {
        return rankDifference;
      }

      return left.localeCompare(right);
    });
}

function extractTextFromDocx(bytes: Uint8Array) {
  const archive = unzipSync(bytes);
  const partPaths = getDocxTextPartPaths(archive);

  if (partPaths.length === 0) {
    throw new Error('DOCX-dokumentin tekstiosia ei löytynyt extractionia varten.');
  }

  const parts = partPaths
    .map((path) => extractTextFromOpenXmlPart(strFromU8(archive[path])))
    .filter(Boolean);

  return normalizeTenderExtractedText(parts.join('\n\n'));
}

function buildUnsupportedMessage(mimeType: string) {
  return `Tiedostotyypin ${mimeType || 'tuntematon'} extractionia ei tueta vielä tässä vaiheessa.`;
}

function buildEmptyExtractionMessage(fileName: string, extractorType: string) {
  if (extractorType === 'pdf') {
    return `PDF-dokumentista “${fileName}” ei löytynyt tekstikerrosta. Skannattujen PDF-tiedostojen OCR ei kuulu vielä tähän vaiheeseen.`;
  }

  if (extractorType === 'docx') {
    return `DOCX-dokumentista “${fileName}” ei löytynyt luettavaa tekstisisältöä.`;
  }

  return `Dokumentista “${fileName}” ei saatu talteen tekstiä.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return rejected(405, 'Vain POST-pyynnöt ovat sallittuja.');
  }

  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return rejected(401, 'Autentikointi puuttuu.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return rejected(500, 'Palvelimen Supabase-asetukset puuttuvat.');
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      return rejected(401, 'Käyttäjää ei voitu tunnistaa.');
    }

    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return rejected(400, 'Pyyntö ei sisällä kelvollista JSON-dataa.');
    }

    const tenderPackageId = typeof body.tenderPackageId === 'string' ? body.tenderPackageId.trim() : '';
    const tenderDocumentId = typeof body.tenderDocumentId === 'string' ? body.tenderDocumentId.trim() : '';

    if (!tenderPackageId) {
      return rejected(400, 'tenderPackageId puuttuu tai on virheellinen.');
    }

    if (!tenderDocumentId) {
      return rejected(400, 'tenderDocumentId puuttuu tai on virheellinen.');
    }

    const { data: packageRow, error: packageError } = await client
      .from('tender_packages')
      .select('id, organization_id')
      .eq('id', tenderPackageId)
      .maybeSingle();

    if (packageError) {
      return rejected(500, 'Tarjouspyyntöpakettia ei voitu tarkistaa.');
    }

    if (!packageRow) {
      return rejected(404, 'Tarjouspyyntöpakettia ei löytynyt tai sinulla ei ole oikeutta siihen.');
    }

    const { data: documentRow, error: documentError } = await client
      .from('tender_documents')
      .select('id, tender_package_id, organization_id, storage_bucket, storage_path, mime_type, file_name, upload_status')
      .eq('id', tenderDocumentId)
      .maybeSingle();

    if (documentError) {
      return rejected(500, 'Dokumenttia ei voitu tarkistaa.');
    }

    if (!documentRow) {
      return rejected(404, 'Dokumenttia ei löytynyt tai sinulla ei ole oikeutta siihen.');
    }

    if (documentRow.tender_package_id !== tenderPackageId) {
      return rejected(409, 'Dokumentti ei kuulu valittuun tarjouspyyntöpakettiin.');
    }

    if (documentRow.upload_status !== 'uploaded' || !documentRow.storage_path) {
      return rejected(409, 'Dokumentti ei ole vielä valmis extractioniin.');
    }

    const support = getTenderDocumentExtractionSupport(documentRow.mime_type);

    await upsertExtraction(client, {
      tender_document_id: tenderDocumentId,
      extraction_status: 'pending',
      extractor_type: support.supported ? support.extractorType : 'unsupported',
      source_mime_type: documentRow.mime_type,
      character_count: null,
      chunk_count: null,
      extracted_text: null,
      error_message: null,
      extracted_at: null,
    });

    await updateDocumentParseStatus(client, tenderDocumentId, 'queued');

    if (!support.supported) {
      await clearDocumentChunks(client, tenderDocumentId);

      const unsupportedMessage = buildUnsupportedMessage(documentRow.mime_type);
      const unsupportedRow = await upsertExtraction(client, {
        tender_document_id: tenderDocumentId,
        extraction_status: 'unsupported',
        extractor_type: 'unsupported',
        source_mime_type: documentRow.mime_type,
        character_count: null,
        chunk_count: null,
        extracted_text: null,
        error_message: unsupportedMessage,
        extracted_at: new Date().toISOString(),
      });

      await updateDocumentParseStatus(client, tenderDocumentId, 'failed');

      return jsonResponse(
        {
          accepted: true,
          extractionId: unsupportedRow.id,
          tenderDocumentId,
          status: 'unsupported',
          message: unsupportedMessage,
          chunkCount: 0,
          characterCount: 0,
        },
        200,
      );
    }

    try {
      await upsertExtraction(client, {
        tender_document_id: tenderDocumentId,
        extraction_status: 'extracting',
        extractor_type: support.extractorType,
        source_mime_type: documentRow.mime_type,
        character_count: null,
        chunk_count: null,
        extracted_text: null,
        error_message: null,
        extracted_at: null,
      });

      await updateDocumentParseStatus(client, tenderDocumentId, 'processing');

      const { data: downloadedFile, error: downloadError } = await client.storage
        .from(documentRow.storage_bucket)
        .download(documentRow.storage_path);

      if (downloadError || !downloadedFile) {
        throw new Error('Dokumenttia ei voitu ladata Storage-bucketista extractionia varten.');
      }

      const bytes = new Uint8Array(await downloadedFile.arrayBuffer());

      const extractedText = support.extractorType === 'xlsx'
        ? extractTextFromWorkbook(bytes)
        : support.extractorType === 'pdf'
          ? await extractTextFromPdf(bytes)
          : support.extractorType === 'docx'
            ? extractTextFromDocx(bytes)
            : decodeText(bytes);

      if (!extractedText) {
        throw new Error(buildEmptyExtractionMessage(documentRow.file_name, support.extractorType));
      }

      const chunks = chunkTenderExtractedText(extractedText);
      await clearDocumentChunks(client, tenderDocumentId);

      const extractedRow = await upsertExtraction(client, {
        tender_document_id: tenderDocumentId,
        extraction_status: 'extracted',
        extractor_type: support.extractorType,
        source_mime_type: documentRow.mime_type,
        character_count: extractedText.length,
        chunk_count: chunks.length,
        extracted_text: extractedText,
        error_message: null,
        extracted_at: new Date().toISOString(),
      });

      await insertChunks(client, {
        extractionId: extractedRow.id,
        documentId: tenderDocumentId,
        chunks,
      });

      await updateDocumentParseStatus(client, tenderDocumentId, 'completed');

      return jsonResponse(
        {
          accepted: true,
          extractionId: extractedRow.id,
          tenderDocumentId,
          status: 'extracted',
          message: null,
          chunkCount: chunks.length,
          characterCount: extractedText.length,
        },
        200,
      );
    } catch (runError: unknown) {
      const errorMessage = runError instanceof Error
        ? runError.message
        : 'Dokumentin extraction epäonnistui.';

      await clearDocumentChunks(client, tenderDocumentId);

      const failedRow = await upsertExtraction(client, {
        tender_document_id: tenderDocumentId,
        extraction_status: 'failed',
        extractor_type: support.extractorType,
        source_mime_type: documentRow.mime_type,
        character_count: null,
        chunk_count: null,
        extracted_text: null,
        error_message: errorMessage,
        extracted_at: new Date().toISOString(),
      });

      await updateDocumentParseStatus(client, tenderDocumentId, 'failed');

      return jsonResponse(
        {
          accepted: true,
          extractionId: failedRow.id,
          tenderDocumentId,
          status: 'failed',
          message: errorMessage,
          chunkCount: null,
          characterCount: null,
        },
        200,
      );
    }
  } catch (outerError: unknown) {
    const message = outerError instanceof Error
      ? outerError.message
      : 'Dokumentin extraction käynnistys epäonnistui odottamatta.';

    return rejected(500, message);
  }
});
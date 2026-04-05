import { FileArrowUp, SpinnerGap, Trash, WarningCircle } from '@phosphor-icons/react';
import { useRef, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import {
  TENDER_DOCUMENT_ACCEPT_ATTRIBUTE,
  TENDER_DOCUMENT_MAX_FILE_SIZE_BYTES,
  formatTenderDocumentFileSize,
  getTenderDocumentTypeLabel,
} from '../lib/tender-document-upload';
import { resolveTenderDocumentExtractionStatus } from '../lib/tender-document-extraction';
import {
  TENDER_DOCUMENT_EXTRACTION_STATUS_META,
  TENDER_DOCUMENT_EXTRACTOR_TYPE_META,
  TENDER_DOCUMENT_PARSE_STATUS_META,
  TENDER_DOCUMENT_UPLOAD_STATUS_META,
  formatTenderTimestamp,
  getTenderTextPreview,
} from '../lib/tender-intelligence-ui';
import type { TenderDocumentsUploadResult } from '../hooks/use-tender-intelligence';
import type { TenderDocumentExtraction, TenderPackageDetails } from '../types/tender-intelligence';

interface TenderDocumentsPanelProps {
  selectedPackage: TenderPackageDetails;
  loading?: boolean;
  uploading?: boolean;
  extractingPackage?: boolean;
  extractingDocumentIds?: string[];
  deletingDocumentIds?: string[];
  error?: string | null;
  onStartDocumentExtraction: (packageId: string, documentId: string) => Promise<TenderDocumentExtraction>;
  onStartPackageExtraction: (packageId: string) => Promise<TenderDocumentExtraction[]>;
  onUploadDocuments: (packageId: string, files: File[]) => Promise<TenderDocumentsUploadResult>;
  onDeleteDocument: (documentId: string) => Promise<void>;
}

export default function TenderDocumentsPanel({
  selectedPackage,
  loading = false,
  uploading = false,
  extractingPackage = false,
  extractingDocumentIds = [],
  deletingDocumentIds = [],
  error,
  onStartDocumentExtraction,
  onStartPackageExtraction,
  onUploadDocuments,
  onDeleteDocument,
}: TenderDocumentsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasDocuments = selectedPackage.documents.length > 0;
  const extractionByDocumentId = new Map(selectedPackage.documentExtractions.map((item) => [item.documentId, item]));
  const extractableDocuments = selectedPackage.documents.filter(
    (document) => document.uploadState === 'uploaded' && Boolean(document.storagePath)
  );

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    const result = await onUploadDocuments(selectedPackage.package.id, files);

    if (result.uploaded.length > 0) {
      toast.success(
        result.uploaded.length === 1
          ? `Dokumentti “${result.uploaded[0].fileName}” tallennettiin pakettiin.`
          : `${result.uploaded.length} dokumenttia tallennettiin pakettiin.`
      );
    }

    if (result.failed.length > 0) {
      toast.error(
        result.failed.length === 1
          ? result.failed[0].message
          : `${result.failed.length} tiedoston lataus epäonnistui. Ensimmäinen virhe: ${result.failed[0].message}`
      );
    }
  };

  const handleDelete = async (documentId: string, fileName: string) => {
    try {
      await onDeleteDocument(documentId);
      toast.success(`Dokumentti “${fileName}” poistettiin paketista.`);
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Dokumentin poisto epäonnistui.');
    }
  };

  const handleStartDocumentExtraction = async (documentId: string, fileName: string) => {
    try {
      const extraction = await onStartDocumentExtraction(selectedPackage.package.id, documentId);

      if (extraction.extractionStatus === 'extracted') {
        toast.success(
          `Dokumentin “${fileName}” extraction valmistui (${extraction.chunkCount ?? 0} chunkia).`
        );
        return;
      }

      if (extraction.extractionStatus === 'unsupported') {
        toast.error(extraction.errorMessage || `Dokumentin “${fileName}” tiedostotyyppiä ei tueta tässä vaiheessa.`);
        return;
      }

      if (extraction.extractionStatus === 'failed') {
        toast.error(extraction.errorMessage || `Dokumentin “${fileName}” extraction epäonnistui.`);
      }
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Dokumentin extraction epäonnistui.');
    }
  };

  const handleStartPackageExtraction = async () => {
    try {
      const results = await onStartPackageExtraction(selectedPackage.package.id);
      const extractedCount = results.filter((item) => item.extractionStatus === 'extracted').length;
      const unsupportedCount = results.filter((item) => item.extractionStatus === 'unsupported').length;
      const failedCount = results.filter((item) => item.extractionStatus === 'failed').length;

      if (failedCount > 0 || unsupportedCount > 0) {
        toast.error(
          `Package extraction valmis osittain: ${extractedCount} purettu, ${unsupportedCount} ei tuettu, ${failedCount} epäonnistui.`
        );
        return;
      }

      if (extractedCount > 0) {
        toast.success(
          extractedCount === 1
            ? 'Yhden dokumentin extraction valmistui.'
            : `${extractedCount} dokumentin extraction valmistui.`
        );
      }
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Paketin extraction epäonnistui.');
    }
  };

  return (
    <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <FileArrowUp className="h-5 w-5 text-slate-500" />
              Dokumentit, Storage ja extraction
            </CardTitle>
            <CardDescription>
              Liitä pakettiin TXT-, Markdown-, CSV-, PDF-, DOCX-, XLSX- tai ZIP-tiedostoja. Tiedostot tallennetaan Supabase Storageen ja dokumenteille voidaan käynnistää server-side extraction omasta Edge Function -rajastaan.
            </CardDescription>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:min-w-64">
            <Button
              type="button"
              variant="outline"
              disabled={uploading || loading || extractingPackage || extractableDocuments.length === 0}
              onClick={() => {
                void handleStartPackageExtraction();
              }}
            >
              {extractingPackage ? 'Puretaan dokumentteja...' : 'Käynnistä extraction paketille'}
              {extractingPackage && <SpinnerGap className="h-4 w-4 animate-spin" />}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={TENDER_DOCUMENT_ACCEPT_ATTRIBUTE}
              multiple
              onChange={(event) => {
                void handleFileSelection(event);
              }}
            />
            <Button type="button" className="justify-between" disabled={uploading || loading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? 'Ladataan dokumentteja...' : 'Lataa dokumentteja'}
              {uploading ? <SpinnerGap className="h-4 w-4 animate-spin" /> : <FileArrowUp className="h-4 w-4" />}
            </Button>
            <p className="text-xs leading-5 text-muted-foreground">
              Sallitut tiedostot: TXT, Markdown, CSV, PDF, DOCX, XLSX, ZIP. Maksimikoko {formatTenderDocumentFileSize(TENDER_DOCUMENT_MAX_FILE_SIZE_BYTES)} / tiedosto.
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Tässä vaiheessa extraction toimii oikeasti TXT-, Markdown-, CSV- ja XLSX-tiedostoille. PDF, DOCX ja ZIP merkitään rehellisesti ei-tuetuiksi, eikä analyysi käynnisty ilman vähintään yhtä purettua chunk-lähdettä.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!hasDocuments && !uploading && (
          <div className="rounded-2xl border border-dashed px-4 py-10 text-sm leading-6 text-muted-foreground">
            Paketissa ei ole vielä dokumentteja. Ensimmäinen upload luo metadatarivin, tallentaa tiedoston Storageen ja avaa sen jälkeen dokumenttikohtaisen extractionin tälle paketille.
          </div>
        )}

        <div className="space-y-3">
          {selectedPackage.documents.map((document) => {
            const extraction = extractionByDocumentId.get(document.id) ?? null;
            const extractionStatus = resolveTenderDocumentExtractionStatus(extraction?.extractionStatus);
            const uploadMeta = TENDER_DOCUMENT_UPLOAD_STATUS_META[document.uploadState];
            const parseMeta = TENDER_DOCUMENT_PARSE_STATUS_META[document.parseStatus];
            const extractionMeta = TENDER_DOCUMENT_EXTRACTION_STATUS_META[extractionStatus];
            const extractorMeta = extraction ? TENDER_DOCUMENT_EXTRACTOR_TYPE_META[extraction.extractorType] : null;
            const deleting = deletingDocumentIds.includes(document.id);
            const extracting = extractingDocumentIds.includes(document.id);
            const canExtract = document.uploadState === 'uploaded' && Boolean(document.storagePath) && !deleting && !uploading && !extracting;

            return (
              <div key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-950">{document.fileName}</p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        Lisätty {formatTenderTimestamp(document.createdAt)}
                        {document.storagePath ? ' • Tallennettu Storage-polkuun' : ' • Metadata odottaa tiedostoa'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{getTenderDocumentTypeLabel(document.fileName, document.mimeType)}</Badge>
                      <Badge variant="outline">{formatTenderDocumentFileSize(document.fileSizeBytes)}</Badge>
                      <Badge variant={uploadMeta.variant}>{uploadMeta.label}</Badge>
                      <Badge variant={parseMeta.variant}>Parsinta: {parseMeta.label}</Badge>
                      <Badge variant={extractionMeta.variant}>Extraction: {extractionMeta.label}</Badge>
                      {extractorMeta && extraction && <Badge variant={extractorMeta.variant}>{extractorMeta.label}</Badge>}
                    </div>

                    {extraction && (extraction.chunkCount != null || extraction.characterCount != null) && (
                      <p className="text-xs leading-5 text-muted-foreground">
                        {extraction.chunkCount ?? 0} chunkia • {extraction.characterCount ?? 0} merkkiä
                      </p>
                    )}

                    {extraction?.extractedText && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700">
                        {getTenderTextPreview(extraction.extractedText, 260)}
                      </div>
                    )}

                    {!extraction && (
                      <div className="rounded-2xl border border-dashed px-3 py-3 text-sm text-muted-foreground">
                        Extractionia ei ole vielä käynnistetty tälle dokumentille.
                      </div>
                    )}

                    {document.uploadError && (
                      <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                        <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{document.uploadError}</span>
                      </div>
                    )}

                    {extraction?.errorMessage && extraction.extractionStatus === 'unsupported' && (
                      <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700">
                        <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{extraction.errorMessage}</span>
                      </div>
                    )}

                    {extraction?.errorMessage && extraction.extractionStatus === 'failed' && (
                      <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                        <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{extraction.errorMessage}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canExtract || extractingPackage}
                      onClick={() => {
                        void handleStartDocumentExtraction(document.id, document.fileName);
                      }}
                    >
                      {extracting ? <SpinnerGap className="h-4 w-4 animate-spin" /> : null}
                      {extracting
                        ? 'Puretaan...'
                        : extraction?.extractionStatus === 'extracted'
                          ? 'Pura uudelleen'
                          : 'Käynnistä extraction'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deleting || uploading || extracting}
                      onClick={() => {
                        void handleDelete(document.id, document.fileName);
                      }}
                    >
                      {deleting ? <SpinnerGap className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
                      {deleting ? 'Poistetaan...' : 'Poista'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
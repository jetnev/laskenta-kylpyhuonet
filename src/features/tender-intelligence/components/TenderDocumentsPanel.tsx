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
import {
  TENDER_DOCUMENT_PARSE_STATUS_META,
  TENDER_DOCUMENT_UPLOAD_STATUS_META,
  formatTenderTimestamp,
} from '../lib/tender-intelligence-ui';
import type { TenderDocumentsUploadResult } from '../hooks/use-tender-intelligence';
import type { TenderPackageDetails } from '../types/tender-intelligence';

interface TenderDocumentsPanelProps {
  selectedPackage: TenderPackageDetails;
  loading?: boolean;
  uploading?: boolean;
  deletingDocumentIds?: string[];
  error?: string | null;
  onUploadDocuments: (packageId: string, files: File[]) => Promise<TenderDocumentsUploadResult>;
  onDeleteDocument: (documentId: string) => Promise<void>;
}

export default function TenderDocumentsPanel({
  selectedPackage,
  loading = false,
  uploading = false,
  deletingDocumentIds = [],
  error,
  onUploadDocuments,
  onDeleteDocument,
}: TenderDocumentsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasDocuments = selectedPackage.documents.length > 0;

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

  return (
    <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <FileArrowUp className="h-5 w-5 text-slate-500" />
              Dokumentit ja Storage
            </CardTitle>
            <CardDescription>
              Liitä pakettiin PDF-, DOCX-, XLSX- tai ZIP-tiedostoja. Tiedostot tallennetaan Supabase Storageen organisaatio- ja pakettikohtaiseen polkuun, mutta analyysiä ei vielä käynnistetä.
            </CardDescription>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:min-w-64">
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
              Sallitut tiedostot: PDF, DOCX, XLSX, ZIP. Maksimikoko {formatTenderDocumentFileSize(TENDER_DOCUMENT_MAX_FILE_SIZE_BYTES)} / tiedosto.
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
            Paketissa ei ole vielä dokumentteja. Ensimmäinen upload luo metadatarivin, tallentaa tiedoston Storageen ja näyttää dokumentin tässä listassa.
          </div>
        )}

        <div className="space-y-3">
          {selectedPackage.documents.map((document) => {
            const uploadMeta = TENDER_DOCUMENT_UPLOAD_STATUS_META[document.uploadState];
            const parseMeta = TENDER_DOCUMENT_PARSE_STATUS_META[document.parseStatus];
            const deleting = deletingDocumentIds.includes(document.id);

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
                    </div>

                    {document.uploadError && (
                      <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                        <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{document.uploadError}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deleting || uploading}
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
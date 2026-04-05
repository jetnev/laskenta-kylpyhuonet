import type { PostgrestError } from '@supabase/supabase-js';

import { getSupabaseConfigError, isSupabaseConfigured, requireSupabase } from '@/lib/supabase';

import type { TenderIntelligenceBackendAdapter } from './tender-intelligence-backend-adapter';
import {
  type CreateTenderPackageInput,
} from '../types/tender-intelligence';
import {
  buildTenderDocumentStoragePath,
  TENDER_INTELLIGENCE_STORAGE_BUCKET,
  validateTenderDocumentFile,
} from '../lib/tender-document-upload';
import {
  buildTenderPackageDetails,
  mapTenderAnalysisJobRowToDomain,
  mapCreateTenderPackageInputToInsert,
  mapTenderDocumentRowToDomain,
  mapTenderPackageRowToDomain,
} from '../lib/tender-intelligence-mappers';
import {
  tenderAnalysisJobRowsSchema,
  tenderDocumentRowSchema,
  tenderDocumentRowsSchema,
  tenderGoNoGoAssessmentRowsSchema,
  tenderPackageRowSchema,
  tenderPackageRowsSchema,
} from '../types/tender-intelligence-db';

type Listener = () => void;

export interface TenderIntelligenceRepository extends TenderIntelligenceBackendAdapter {
  subscribe(listener: Listener): () => void;
}

function requireConfiguredSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error(getSupabaseConfigError());
  }

  return requireSupabase();
}

function getRepositoryErrorMessage(error: unknown, fallbackMessage: string) {
  const candidate = error as PostgrestError | Error | null | undefined;
  const message = typeof candidate?.message === 'string' ? candidate.message.trim() : '';
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes('row-level security') ||
    normalizedMessage.includes('permission denied') ||
    normalizedMessage.includes('policy') ||
    normalizedMessage.includes('aktiivinen organisaatiojäsen')
  ) {
    return 'Sinulla ei ole oikeutta käyttää Tarjousälyn organisaatiodataa tällä tilillä.';
  }

  if (normalizedMessage.includes('supabase-asetukset puuttuvat')) {
    return getSupabaseConfigError();
  }

  return message || fallbackMessage;
}

function toRepositoryError(error: unknown, fallbackMessage: string) {
  return new Error(getRepositoryErrorMessage(error, fallbackMessage));
}

function isMissingStorageObjectError(error: unknown) {
  const candidate = error as Error | null | undefined;
  const message = typeof candidate?.message === 'string' ? candidate.message.toLowerCase() : '';

  return message.includes('not found') || message.includes('no such object') || message.includes('no object found');
}

async function assertTenderPackageAccess(packageId: string) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client.from('tender_packages').select('*').eq('id', packageId).maybeSingle();

  if (error) {
    throw toRepositoryError(error, 'Tarjouspyyntöpakettia ei voitu tarkistaa.');
  }

  if (!data) {
    throw new Error('Tarjouspyyntöpakettia ei löytynyt tai sinulla ei ole oikeutta siihen.');
  }

  return tenderPackageRowSchema.parse(data);
}

async function fetchTenderDocumentRowsForPackage(packageId: string) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client.from('tender_documents').select('*').eq('tender_package_id', packageId).order('created_at', { ascending: false });

  if (error) {
    throw toRepositoryError(error, 'Tarjouspyyntöpaketin dokumentteja ei voitu ladata.');
  }

  return tenderDocumentRowsSchema.parse(data ?? []);
}

async function fetchTenderDocumentRowById(documentId: string) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client.from('tender_documents').select('*').eq('id', documentId).maybeSingle();

  if (error) {
    throw toRepositoryError(error, 'Tarjousdokumenttia ei voitu ladata.');
  }

  return data ? tenderDocumentRowSchema.parse(data) : null;
}

async function fetchTenderDocumentCounts(packageIds: string[]) {
  if (packageIds.length === 0) {
    return new Map<string, number>();
  }

  const client = requireConfiguredSupabase();
  const { data, error } = await client.from('tender_documents').select('*').in('tender_package_id', packageIds);

  if (error) {
    throw toRepositoryError(error, 'Tarjouspyyntöpakettien dokumentteja ei voitu ladata.');
  }

  const documentRows = tenderDocumentRowsSchema.parse(data ?? []);
  const counts = new Map<string, number>();

  documentRows.forEach((row) => {
    counts.set(row.tender_package_id, (counts.get(row.tender_package_id) ?? 0) + 1);
  });

  return counts;
}

class SupabaseTenderIntelligenceRepository implements TenderIntelligenceRepository {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async listTenderPackages() {
    try {
      const client = requireConfiguredSupabase();
      const { data, error } = await client.from('tender_packages').select('*').order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      const packageRows = tenderPackageRowsSchema.parse(data ?? []);
      const documentCounts = await fetchTenderDocumentCounts(packageRows.map((row) => row.id));

      return packageRows.map((row) =>
        mapTenderPackageRowToDomain(row, {
          documentCount: documentCounts.get(row.id) ?? 0,
        })
      );
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketteja ei voitu ladata.');
    }
  }

  async getTenderPackageById(packageId: string) {
    try {
      const client = requireConfiguredSupabase();
      const { data, error } = await client.from('tender_packages').select('*').eq('id', packageId).maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      const packageRow = tenderPackageRowSchema.parse(data);
      const [documentRows, jobResponse, assessmentResponse] = await Promise.all([
        fetchTenderDocumentRowsForPackage(packageId),
        client.from('tender_analysis_jobs').select('*').eq('tender_package_id', packageId).order('created_at', { ascending: false }),
        client.from('tender_go_no_go_assessments').select('*').eq('tender_package_id', packageId).limit(1),
      ]);

      if (jobResponse.error) {
        throw jobResponse.error;
      }

      if (assessmentResponse.error) {
        throw assessmentResponse.error;
      }

      const jobRows = tenderAnalysisJobRowsSchema.parse(jobResponse.data ?? []);
      const assessmentRows = tenderGoNoGoAssessmentRowsSchema.parse(assessmentResponse.data ?? []);

      return buildTenderPackageDetails({
        packageRow,
        documentRows,
        analysisJobRows: jobRows,
        goNoGoAssessmentRow: assessmentRows[0] ?? null,
      });
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin tietoja ei voitu ladata.');
    }
  }

  async createTenderPackage(input: CreateTenderPackageInput) {
    try {
      const client = requireConfiguredSupabase();
      const payload = mapCreateTenderPackageInputToInsert(input);
      const { data, error } = await client.from('tender_packages').insert(payload).select('*').single();

      if (error) {
        throw error;
      }

      const packageRow = tenderPackageRowSchema.parse(data);
      const { error: assessmentError } = await client.from('tender_go_no_go_assessments').upsert(
        {
          tender_package_id: packageRow.id,
          recommendation: 'pending',
          summary: null,
          confidence: null,
        },
        { onConflict: 'tender_package_id' }
      );

      if (assessmentError) {
        console.warn('Tender Go/No-Go placeholder creation failed, continuing without assessment.', assessmentError);
      }

      const createdPackage = await this.getTenderPackageById(packageRow.id);

      if (!createdPackage) {
        throw new Error('Luotua tarjouspyyntöpakettia ei voitu hakea takaisin tietokannasta.');
      }

      this.emit();
      return createdPackage;
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin luonti epäonnistui.');
    }
  }

  async uploadTenderDocument(packageId: string, file: File) {
    try {
      const client = requireConfiguredSupabase();
      const packageRow = await assertTenderPackageAccess(packageId);
      const validatedFile = validateTenderDocumentFile(file);
      const documentId = crypto.randomUUID();
      const storagePath = buildTenderDocumentStoragePath({
        organizationId: packageRow.organization_id,
        packageId: packageRow.id,
        documentId,
        fileName: validatedFile.fileName,
      });
      const { data: insertedData, error: insertError } = await client
        .from('tender_documents')
        .insert({
          id: documentId,
          tender_package_id: packageId,
          file_name: validatedFile.fileName,
          mime_type: validatedFile.canonicalMimeType,
          storage_bucket: TENDER_INTELLIGENCE_STORAGE_BUCKET,
          storage_path: storagePath,
          file_size_bytes: validatedFile.fileSizeBytes,
          checksum: null,
          upload_error: null,
          upload_status: 'pending',
          parse_status: 'not-started',
        })
        .select('*')
        .single();

      if (insertError) {
        throw insertError;
      }

      const insertedRow = tenderDocumentRowSchema.parse(insertedData);
      const { error: uploadError } = await client.storage.from(TENDER_INTELLIGENCE_STORAGE_BUCKET).upload(storagePath, file, {
        cacheControl: '3600',
        contentType: validatedFile.canonicalMimeType,
        upsert: false,
      });

      if (uploadError) {
        const uploadFailureMessage = getRepositoryErrorMessage(
          uploadError,
          `Tiedoston “${validatedFile.fileName}” lataus Storageen epäonnistui.`
        );
        const { data: failedData, error: failedUpdateError } = await client
          .from('tender_documents')
          .update({
            upload_status: 'failed',
            upload_error: uploadFailureMessage,
            parse_status: 'not-started',
          })
          .eq('id', documentId)
          .select('*')
          .single();

        if (failedUpdateError) {
          console.warn('Tender document upload failed and metadata status update also failed.', failedUpdateError);
        }

        this.emit();

        if (failedData) {
          mapTenderDocumentRowToDomain(tenderDocumentRowSchema.parse(failedData));
        }

        throw new Error(uploadFailureMessage);
      }

      const { data: uploadedData, error: uploadedUpdateError } = await client
        .from('tender_documents')
        .update({
          upload_status: 'uploaded',
          upload_error: null,
          parse_status: 'not-started',
        })
        .eq('id', documentId)
        .select('*')
        .single();

      if (uploadedUpdateError) {
        throw uploadedUpdateError;
      }

      this.emit();
      return mapTenderDocumentRowToDomain(tenderDocumentRowSchema.parse(uploadedData ?? insertedRow));
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntödokumentin lataus epäonnistui.');
    }
  }

  async listTenderDocuments(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchTenderDocumentRowsForPackage(packageId);
      return rows.map(mapTenderDocumentRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin dokumenttilistaa ei voitu ladata.');
    }
  }

  async deleteTenderDocument(documentId: string) {
    try {
      const client = requireConfiguredSupabase();
      const documentRow = await fetchTenderDocumentRowById(documentId);

      if (!documentRow) {
        throw new Error('Dokumenttia ei löytynyt tai se on jo poistettu.');
      }

      await assertTenderPackageAccess(documentRow.tender_package_id);

      if (documentRow.storage_path) {
        const { error: storageDeleteError } = await client.storage.from(documentRow.storage_bucket).remove([documentRow.storage_path]);

        if (storageDeleteError && !isMissingStorageObjectError(storageDeleteError)) {
          throw storageDeleteError;
        }
      }

      const { error: deleteError } = await client.from('tender_documents').delete().eq('id', documentId);

      if (deleteError) {
        throw deleteError;
      }

      this.emit();
    } catch (error) {
      throw toRepositoryError(error, 'Tarjousdokumentin poisto epäonnistui.');
    }
  }

  async getTenderAnalysisStatus(packageId: string) {
    try {
      const client = requireConfiguredSupabase();
      const { data, error } = await client
        .from('tender_analysis_jobs')
        .select('*')
        .eq('tender_package_id', packageId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      const jobRows = tenderAnalysisJobRowsSchema.parse(data ?? []);
      return jobRows[0] ? mapTenderAnalysisJobRowToDomain(jobRows[0]) : null;
    } catch (error) {
      throw toRepositoryError(error, 'Tarjousanalyysin tilaa ei voitu hakea.');
    }
  }

  async getTenderResults(packageId: string) {
    const details = await this.getTenderPackageById(packageId);
    return details?.results ?? null;
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

const repository = new SupabaseTenderIntelligenceRepository();

export function getTenderIntelligenceRepository() {
  return repository;
}
import type { PostgrestError } from '@supabase/supabase-js';

import { getSupabaseConfigError, isSupabaseConfigured, requireSupabase } from '@/lib/supabase';

import type { TenderIntelligenceBackendAdapter } from './tender-intelligence-backend-adapter';
import {
  type AddTenderDocumentInput,
  type CreateTenderPackageInput,
} from '../types/tender-intelligence';
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
      const [documentResponse, jobResponse, assessmentResponse] = await Promise.all([
        client.from('tender_documents').select('*').eq('tender_package_id', packageId).order('created_at', { ascending: true }),
        client.from('tender_analysis_jobs').select('*').eq('tender_package_id', packageId).order('created_at', { ascending: false }),
        client.from('tender_go_no_go_assessments').select('*').eq('tender_package_id', packageId).limit(1),
      ]);

      if (documentResponse.error) {
        throw documentResponse.error;
      }

      if (jobResponse.error) {
        throw jobResponse.error;
      }

      if (assessmentResponse.error) {
        throw assessmentResponse.error;
      }

      const documentRows = tenderDocumentRowsSchema.parse(documentResponse.data ?? []);
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

  async addTenderDocument(packageId: string, input: AddTenderDocumentInput) {
    try {
      const client = requireConfiguredSupabase();
      const { data, error } = await client
        .from('tender_documents')
        .insert({
          tender_package_id: packageId,
          file_name: input.fileName,
          mime_type: input.mimeType,
          storage_path: null,
          file_size_bytes: null,
          checksum: null,
          upload_status: 'placeholder',
          parse_status: 'not-started',
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      this.emit();
      return mapTenderDocumentRowToDomain(tenderDocumentRowSchema.parse(data));
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntödokumentin metadataa ei voitu tallentaa.');
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
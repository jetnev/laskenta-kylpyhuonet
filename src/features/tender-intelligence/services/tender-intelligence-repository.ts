import type { PostgrestError } from '@supabase/supabase-js';

import { getSupabaseConfigError, isSupabaseConfigured, requireSupabase } from '@/lib/supabase';

import type { TenderIntelligenceBackendAdapter } from './tender-intelligence-backend-adapter';
import {
  type CreateTenderPackageInput,
  type TenderAnalysisJobStatus,
  type TenderAnalysisJobType,
} from '../types/tender-intelligence';
import {
  buildTenderDocumentStoragePath,
  TENDER_INTELLIGENCE_STORAGE_BUCKET,
  validateTenderDocumentFile,
} from '../lib/tender-document-upload';
import { getTenderAnalysisStartState } from '../lib/tender-analysis';
import { buildPlaceholderAnalysisSeedPlan } from '../lib/tender-placeholder-results';
import {
  buildTenderPackageDetails,
  mapTenderAnalysisJobRowToDomain,
  mapCreateTenderPackageInputToInsert,
  mapTenderDraftArtifactRowToDomain,
  mapTenderDocumentRowToDomain,
  mapTenderMissingItemRowToDomain,
  mapTenderPackageResultsRowsToDomain,
  mapTenderPackageRowToDomain,
  mapTenderReferenceSuggestionRowToDomain,
  mapTenderRequirementRowToDomain,
  mapTenderReviewTaskRowToDomain,
  mapTenderRiskFlagRowToDomain,
} from '../lib/tender-intelligence-mappers';
import {
  tenderAnalysisJobRowSchema,
  tenderAnalysisJobRowsSchema,
  tenderDocumentRowSchema,
  tenderDocumentRowsSchema,
  tenderDraftArtifactRowsSchema,
  tenderGoNoGoAssessmentRowSchema,
  tenderGoNoGoAssessmentRowsSchema,
  tenderMissingItemRowsSchema,
  tenderPackageRowSchema,
  tenderPackageRowsSchema,
  tenderReferenceSuggestionRowsSchema,
  tenderRequirementRowsSchema,
  tenderReviewTaskRowsSchema,
  tenderRiskFlagRowsSchema,
} from '../types/tender-intelligence-db';

type Listener = () => void;

const PLACEHOLDER_ANALYSIS_QUEUE_DELAY_MS = 300;
const PLACEHOLDER_ANALYSIS_RUNNING_DELAY_MS = 650;

export interface TenderIntelligenceRepository extends TenderIntelligenceBackendAdapter {
  subscribe(listener: Listener): () => void;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
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

async function fetchPackageRows<Row>(options: {
  tableName:
    | 'tender_documents'
    | 'tender_analysis_jobs'
    | 'tender_requirements'
    | 'tender_missing_items'
    | 'tender_risk_flags'
    | 'tender_reference_suggestions'
    | 'tender_draft_artifacts'
    | 'tender_review_tasks';
  packageId: string;
  schema: { parse(data: unknown): Row[] };
  fallbackMessage: string;
}) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client
    .from(options.tableName)
    .select('*')
    .eq('tender_package_id', options.packageId)
    .order('created_at', { ascending: false });

  if (error) {
    throw toRepositoryError(error, options.fallbackMessage);
  }

  return options.schema.parse(data ?? []);
}

async function fetchTenderDocumentRowsForPackage(packageId: string) {
  return fetchPackageRows({
    tableName: 'tender_documents',
    packageId,
    schema: tenderDocumentRowsSchema,
    fallbackMessage: 'Tarjouspyyntöpaketin dokumentteja ei voitu ladata.',
  });
}

async function fetchTenderAnalysisJobRowsForPackage(packageId: string) {
  return fetchPackageRows({
    tableName: 'tender_analysis_jobs',
    packageId,
    schema: tenderAnalysisJobRowsSchema,
    fallbackMessage: 'Tarjouspyyntöpaketin analyysijobeja ei voitu ladata.',
  });
}

async function fetchTenderDocumentRowById(documentId: string) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client.from('tender_documents').select('*').eq('id', documentId).maybeSingle();

  if (error) {
    throw toRepositoryError(error, 'Tarjousdokumenttia ei voitu ladata.');
  }

  return data ? tenderDocumentRowSchema.parse(data) : null;
}

async function fetchTenderAnalysisJobRowById(jobId: string) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client.from('tender_analysis_jobs').select('*').eq('id', jobId).maybeSingle();

  if (error) {
    throw toRepositoryError(error, 'Tarjouspyynnön analyysijobia ei voitu ladata.');
  }

  return data ? tenderAnalysisJobRowSchema.parse(data) : null;
}

async function fetchPackageResultCounts(
  tableName:
    | 'tender_documents'
    | 'tender_requirements'
    | 'tender_missing_items'
    | 'tender_risk_flags'
    | 'tender_review_tasks',
  packageIds: string[],
  fallbackMessage: string
) {
  if (packageIds.length === 0) {
    return new Map<string, number>();
  }

  const client = requireConfiguredSupabase();
  const { data, error } = await client.from(tableName).select('tender_package_id').in('tender_package_id', packageIds);

  if (error) {
    throw toRepositoryError(error, fallbackMessage);
  }

  const counts = new Map<string, number>();

  (data ?? []).forEach((row) => {
    const nextPackageId = typeof row.tender_package_id === 'string' ? row.tender_package_id : null;

    if (!nextPackageId) {
      return;
    }

    counts.set(nextPackageId, (counts.get(nextPackageId) ?? 0) + 1);
  });

  return counts;
}

async function deletePackageRows(
  tableName:
    | 'tender_review_tasks'
    | 'tender_draft_artifacts'
    | 'tender_reference_suggestions'
    | 'tender_risk_flags'
    | 'tender_missing_items'
    | 'tender_requirements',
  packageId: string,
  fallbackMessage: string
) {
  const client = requireConfiguredSupabase();
  const { error } = await client.from(tableName).delete().eq('tender_package_id', packageId);

  if (error) {
    throw toRepositoryError(error, fallbackMessage);
  }
}

class SupabaseTenderIntelligenceRepository implements TenderIntelligenceRepository {
  private listeners = new Set<Listener>();

  private async updateAnalysisJob(
    jobId: string,
    updates: {
      status?: TenderAnalysisJobStatus;
      started_at?: string | null;
      completed_at?: string | null;
      error_message?: string | null;
    },
    fallbackMessage: string
  ) {
    try {
      const client = requireConfiguredSupabase();
      const { data, error } = await client.from('tender_analysis_jobs').update(updates).eq('id', jobId).select('*').single();

      if (error) {
        throw error;
      }

      this.emit();
      return mapTenderAnalysisJobRowToDomain(tenderAnalysisJobRowSchema.parse(data));
    } catch (error) {
      throw toRepositoryError(error, fallbackMessage);
    }
  }

  private async clearAnalysisResults(packageId: string, emitAfter: boolean) {
    await assertTenderPackageAccess(packageId);

    await deletePackageRows('tender_review_tasks', packageId, 'Tarkistustehtäviä ei voitu poistaa paketilta.');
    await deletePackageRows('tender_draft_artifacts', packageId, 'Luonnosartefakteja ei voitu poistaa paketilta.');
    await deletePackageRows('tender_reference_suggestions', packageId, 'Referenssiehdotuksia ei voitu poistaa paketilta.');
    await deletePackageRows('tender_risk_flags', packageId, 'Riskilippuja ei voitu poistaa paketilta.');
    await deletePackageRows('tender_missing_items', packageId, 'Puutehavaintoja ei voitu poistaa paketilta.');
    await deletePackageRows('tender_requirements', packageId, 'Vaatimuksia ei voitu poistaa paketilta.');

    const client = requireConfiguredSupabase();
    const { error: assessmentError } = await client.from('tender_go_no_go_assessments').upsert(
      {
        tender_package_id: packageId,
        recommendation: 'pending',
        summary: null,
        confidence: null,
      },
      { onConflict: 'tender_package_id' }
    );

    if (assessmentError) {
      throw toRepositoryError(assessmentError, 'Go / No-Go -placeholderia ei voitu nollata paketilta.');
    }

    if (emitAfter) {
      this.emit();
    }
  }

  private async seedPlaceholderResults(packageId: string, emitAfter: boolean) {
    const client = requireConfiguredSupabase();
    const packageRow = await assertTenderPackageAccess(packageId);
    const documentRows = await fetchTenderDocumentRowsForPackage(packageId);

    if (documentRows.length === 0) {
      throw new Error('Analyysiä ei voi kirjoittaa ilman paketin dokumentteja.');
    }

    const plan = buildPlaceholderAnalysisSeedPlan({
      packageRow,
      documentRows,
    });

    try {
      await this.clearAnalysisResults(packageId, false);

      const { data: requirementData, error: requirementError } = await client
        .from('tender_requirements')
        .insert(
          plan.requirements.map((requirement) => ({
            tender_package_id: packageId,
            source_document_id: requirement.sourceDocumentId,
            requirement_type: requirement.requirementType,
            title: requirement.title,
            description: requirement.description,
            status: requirement.status,
            confidence: requirement.confidence,
            source_excerpt: requirement.sourceExcerpt,
          }))
        )
        .select('*');

      if (requirementError) {
        throw requirementError;
      }

      const requirementRows = tenderRequirementRowsSchema.parse(requirementData ?? []);

      const { data: missingItemData, error: missingItemError } = await client
        .from('tender_missing_items')
        .insert(
          plan.missingItems.map((item) => ({
            tender_package_id: packageId,
            related_requirement_id: item.relatedRequirementIndex == null ? null : requirementRows[item.relatedRequirementIndex]?.id ?? null,
            item_type: item.itemType,
            title: item.title,
            description: item.description,
            severity: item.severity,
            status: item.status,
          }))
        )
        .select('*');

      if (missingItemError) {
        throw missingItemError;
      }

      const missingItemRows = tenderMissingItemRowsSchema.parse(missingItemData ?? []);

      const { data: riskFlagData, error: riskFlagError } = await client
        .from('tender_risk_flags')
        .insert(
          plan.riskFlags.map((riskFlag) => ({
            tender_package_id: packageId,
            risk_type: riskFlag.riskType,
            title: riskFlag.title,
            description: riskFlag.description,
            severity: riskFlag.severity,
            status: riskFlag.status,
          }))
        )
        .select('*');

      if (riskFlagError) {
        throw riskFlagError;
      }

      const riskFlagRows = tenderRiskFlagRowsSchema.parse(riskFlagData ?? []);

      const { data: referenceSuggestionData, error: referenceSuggestionError } = await client
        .from('tender_reference_suggestions')
        .insert(
          plan.referenceSuggestions.map((suggestion) => ({
            tender_package_id: packageId,
            source_type: suggestion.sourceType,
            source_reference: suggestion.sourceReference,
            title: suggestion.title,
            rationale: suggestion.rationale,
            confidence: suggestion.confidence,
          }))
        )
        .select('*');

      if (referenceSuggestionError) {
        throw referenceSuggestionError;
      }

      const referenceSuggestionRows = tenderReferenceSuggestionRowsSchema.parse(referenceSuggestionData ?? []);

      const { data: draftArtifactData, error: draftArtifactError } = await client
        .from('tender_draft_artifacts')
        .insert(
          plan.draftArtifacts.map((artifact) => ({
            tender_package_id: packageId,
            artifact_type: artifact.artifactType,
            title: artifact.title,
            content_md: artifact.contentMd,
            status: artifact.status,
          }))
        )
        .select('*');

      if (draftArtifactError) {
        throw draftArtifactError;
      }

      const draftArtifactRows = tenderDraftArtifactRowsSchema.parse(draftArtifactData ?? []);

      const { data: reviewTaskData, error: reviewTaskError } = await client
        .from('tender_review_tasks')
        .insert(
          plan.reviewTasks.map((task) => ({
            tender_package_id: packageId,
            task_type: task.taskType,
            title: task.title,
            description: task.description,
            status: task.status,
            assigned_to_user_id: null,
          }))
        )
        .select('*');

      if (reviewTaskError) {
        throw reviewTaskError;
      }

      const reviewTaskRows = tenderReviewTaskRowsSchema.parse(reviewTaskData ?? []);

      const { data: goNoGoAssessmentData, error: goNoGoAssessmentError } = await client
        .from('tender_go_no_go_assessments')
        .upsert(
          {
            tender_package_id: packageId,
            recommendation: plan.goNoGoAssessment.recommendation,
            summary: plan.goNoGoAssessment.summary,
            confidence: plan.goNoGoAssessment.confidence,
          },
          { onConflict: 'tender_package_id' }
        )
        .select('*')
        .single();

      if (goNoGoAssessmentError) {
        throw goNoGoAssessmentError;
      }

      const goNoGoAssessmentRow = tenderGoNoGoAssessmentRowSchema.parse(goNoGoAssessmentData);
      const results = mapTenderPackageResultsRowsToDomain({
        requirementRows,
        missingItemRows,
        riskFlagRows,
        referenceSuggestionRows,
        draftArtifactRows,
        reviewTaskRows,
        goNoGoAssessmentRow,
      });

      if (emitAfter) {
        this.emit();
      }

      return results;
    } catch (error) {
      try {
        await this.clearAnalysisResults(packageId, false);
      } catch (cleanupError) {
        console.warn('Tender placeholder result cleanup failed after seed error.', cleanupError);
      }

      throw toRepositoryError(error, 'Placeholder-analyysitulosten kirjoitus epäonnistui.');
    }
  }

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
      const packageIds = packageRows.map((row) => row.id);
      const [documentCounts, requirementCounts, missingItemCounts, riskCounts, reviewTaskCounts] = await Promise.all([
        fetchPackageResultCounts('tender_documents', packageIds, 'Tarjouspyyntöpakettien dokumentteja ei voitu ladata.'),
        fetchPackageResultCounts('tender_requirements', packageIds, 'Tarjouspyyntöpakettien vaatimuksia ei voitu ladata.'),
        fetchPackageResultCounts('tender_missing_items', packageIds, 'Tarjouspyyntöpakettien puutteita ei voitu ladata.'),
        fetchPackageResultCounts('tender_risk_flags', packageIds, 'Tarjouspyyntöpakettien riskejä ei voitu ladata.'),
        fetchPackageResultCounts('tender_review_tasks', packageIds, 'Tarjouspyyntöpakettien tarkistustehtäviä ei voitu ladata.'),
      ]);

      return packageRows.map((row) =>
        mapTenderPackageRowToDomain(row, {
          documentCount: documentCounts.get(row.id) ?? 0,
          requirementCount: requirementCounts.get(row.id) ?? 0,
          missingItemCount: missingItemCounts.get(row.id) ?? 0,
          riskCount: riskCounts.get(row.id) ?? 0,
          reviewTaskCount: reviewTaskCounts.get(row.id) ?? 0,
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
      const [
        documentRows,
        analysisJobRows,
        requirementRows,
        missingItemRows,
        riskFlagRows,
        referenceSuggestionRows,
        draftArtifactRows,
        reviewTaskRows,
        assessmentResponse,
      ] = await Promise.all([
        fetchTenderDocumentRowsForPackage(packageId),
        fetchTenderAnalysisJobRowsForPackage(packageId),
        fetchPackageRows({
          tableName: 'tender_requirements',
          packageId,
          schema: tenderRequirementRowsSchema,
          fallbackMessage: 'Tarjouspyyntöpaketin vaatimuksia ei voitu ladata.',
        }),
        fetchPackageRows({
          tableName: 'tender_missing_items',
          packageId,
          schema: tenderMissingItemRowsSchema,
          fallbackMessage: 'Tarjouspyyntöpaketin puutteita ei voitu ladata.',
        }),
        fetchPackageRows({
          tableName: 'tender_risk_flags',
          packageId,
          schema: tenderRiskFlagRowsSchema,
          fallbackMessage: 'Tarjouspyyntöpaketin riskejä ei voitu ladata.',
        }),
        fetchPackageRows({
          tableName: 'tender_reference_suggestions',
          packageId,
          schema: tenderReferenceSuggestionRowsSchema,
          fallbackMessage: 'Tarjouspyyntöpaketin referenssiehdotuksia ei voitu ladata.',
        }),
        fetchPackageRows({
          tableName: 'tender_draft_artifacts',
          packageId,
          schema: tenderDraftArtifactRowsSchema,
          fallbackMessage: 'Tarjouspyyntöpaketin luonnosartefakteja ei voitu ladata.',
        }),
        fetchPackageRows({
          tableName: 'tender_review_tasks',
          packageId,
          schema: tenderReviewTaskRowsSchema,
          fallbackMessage: 'Tarjouspyyntöpaketin tarkistustehtäviä ei voitu ladata.',
        }),
        client.from('tender_go_no_go_assessments').select('*').eq('tender_package_id', packageId).limit(1),
      ]);

      if (assessmentResponse.error) {
        throw assessmentResponse.error;
      }

      const assessmentRows = tenderGoNoGoAssessmentRowsSchema.parse(assessmentResponse.data ?? []);

      return buildTenderPackageDetails({
        packageRow,
        documentRows,
        analysisJobRows,
        requirementRows,
        missingItemRows,
        riskFlagRows,
        referenceSuggestionRows,
        draftArtifactRows,
        reviewTaskRows,
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

  async createAnalysisJob(
    packageId: string,
    options: { jobType?: TenderAnalysisJobType; status?: TenderAnalysisJobStatus } = {}
  ) {
    try {
      const client = requireConfiguredSupabase();
      await assertTenderPackageAccess(packageId);

      const { data, error } = await client
        .from('tender_analysis_jobs')
        .insert({
          tender_package_id: packageId,
          job_type: options.jobType ?? 'placeholder_analysis',
          status: options.status ?? 'pending',
          provider: null,
          model: null,
          error_message: null,
          started_at: null,
          completed_at: null,
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      this.emit();
      return mapTenderAnalysisJobRowToDomain(tenderAnalysisJobRowSchema.parse(data));
    } catch (error) {
      throw toRepositoryError(error, 'Analyysijobin luonti epäonnistui.');
    }
  }

  async listAnalysisJobsForPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchTenderAnalysisJobRowsForPackage(packageId);
      return rows.map(mapTenderAnalysisJobRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin analyysijobilistaa ei voitu ladata.');
    }
  }

  async getLatestAnalysisJobForPackage(packageId: string) {
    const jobs = await this.listAnalysisJobsForPackage(packageId);
    return jobs[0] ?? null;
  }

  async listRequirementsForPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchPackageRows({
        tableName: 'tender_requirements',
        packageId,
        schema: tenderRequirementRowsSchema,
        fallbackMessage: 'Tarjouspyyntöpaketin vaatimuksia ei voitu ladata.',
      });

      return rows.map(mapTenderRequirementRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin vaatimuslistaa ei voitu ladata.');
    }
  }

  async listMissingItemsForPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchPackageRows({
        tableName: 'tender_missing_items',
        packageId,
        schema: tenderMissingItemRowsSchema,
        fallbackMessage: 'Tarjouspyyntöpaketin puutteita ei voitu ladata.',
      });

      return rows.map(mapTenderMissingItemRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin puutelistaa ei voitu ladata.');
    }
  }

  async listRiskFlagsForPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchPackageRows({
        tableName: 'tender_risk_flags',
        packageId,
        schema: tenderRiskFlagRowsSchema,
        fallbackMessage: 'Tarjouspyyntöpaketin riskihavaintoja ei voitu ladata.',
      });

      return rows.map(mapTenderRiskFlagRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin riskilistaa ei voitu ladata.');
    }
  }

  async listReferenceSuggestionsForPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchPackageRows({
        tableName: 'tender_reference_suggestions',
        packageId,
        schema: tenderReferenceSuggestionRowsSchema,
        fallbackMessage: 'Tarjouspyyntöpaketin referenssiehdotuksia ei voitu ladata.',
      });

      return rows.map(mapTenderReferenceSuggestionRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin referenssiehdotuksia ei voitu ladata.');
    }
  }

  async listDraftArtifactsForPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchPackageRows({
        tableName: 'tender_draft_artifacts',
        packageId,
        schema: tenderDraftArtifactRowsSchema,
        fallbackMessage: 'Tarjouspyyntöpaketin luonnosartefakteja ei voitu ladata.',
      });

      return rows.map(mapTenderDraftArtifactRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin luonnosartefakteja ei voitu ladata.');
    }
  }

  async listReviewTasksForPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchPackageRows({
        tableName: 'tender_review_tasks',
        packageId,
        schema: tenderReviewTaskRowsSchema,
        fallbackMessage: 'Tarjouspyyntöpaketin tarkistustehtäviä ei voitu ladata.',
      });

      return rows.map(mapTenderReviewTaskRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin tarkistustehtäviä ei voitu ladata.');
    }
  }

  async clearAnalysisResultsForPackage(packageId: string) {
    try {
      await this.clearAnalysisResults(packageId, true);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin analyysituloksia ei voitu tyhjentää.');
    }
  }

  async seedPlaceholderAnalysisResults(packageId: string) {
    return this.seedPlaceholderResults(packageId, true);
  }

  async startPlaceholderAnalysis(packageId: string) {
    let createdJobId: string | null = null;

    try {
      await assertTenderPackageAccess(packageId);
      const documentRows = await fetchTenderDocumentRowsForPackage(packageId);
      const latestJob = await this.getLatestAnalysisJobForPackage(packageId);
      const startState = getTenderAnalysisStartState({
        documentCount: documentRows.length,
        latestAnalysisJob: latestJob,
      });

      if (!startState.canStart) {
        throw new Error(startState.reason ?? 'Analyysiä ei voi käynnistää tälle paketille.');
      }

      const createdJob = await this.createAnalysisJob(packageId, {
        jobType: 'placeholder_analysis',
        status: 'pending',
      });
      createdJobId = createdJob.id;

      await wait(PLACEHOLDER_ANALYSIS_QUEUE_DELAY_MS);
      await this.updateAnalysisJob(
        createdJob.id,
        {
          status: 'queued',
          completed_at: null,
          error_message: null,
        },
        'Analyysijobin jonotusta ei voitu päivittää.'
      );

      await wait(PLACEHOLDER_ANALYSIS_QUEUE_DELAY_MS);
      await this.markAnalysisJobRunning(createdJob.id);

      await wait(PLACEHOLDER_ANALYSIS_RUNNING_DELAY_MS);
      await this.seedPlaceholderResults(packageId, false);

      return await this.markAnalysisJobCompleted(createdJob.id);
    } catch (error) {
      const message = getRepositoryErrorMessage(error, 'Placeholder-analyysin suoritus epäonnistui.');

      if (createdJobId) {
        try {
          await this.markAnalysisJobFailed(createdJobId, message);
        } catch (markFailedError) {
          console.warn('Tender placeholder analysis failed and status could not be updated to failed.', markFailedError);
        }
      }

      throw new Error(message);
    }
  }

  async markAnalysisJobRunning(jobId: string) {
    const existingJob = await fetchTenderAnalysisJobRowById(jobId);

    if (!existingJob) {
      throw new Error('Analyysijobia ei löytynyt.');
    }

    const startedAt = existingJob.started_at ?? new Date().toISOString();

    return this.updateAnalysisJob(
      jobId,
      {
        status: 'running',
        started_at: startedAt,
        completed_at: null,
        error_message: null,
      },
      'Analyysijobia ei voitu merkitä käynnissä olevaksi.'
    );
  }

  async markAnalysisJobCompleted(jobId: string) {
    const existingJob = await fetchTenderAnalysisJobRowById(jobId);

    if (!existingJob) {
      throw new Error('Analyysijobia ei löytynyt.');
    }

    const completedAt = new Date().toISOString();

    return this.updateAnalysisJob(
      jobId,
      {
        status: 'completed',
        started_at: existingJob.started_at ?? completedAt,
        completed_at: completedAt,
        error_message: null,
      },
      'Analyysijobia ei voitu merkitä valmiiksi.'
    );
  }

  async markAnalysisJobFailed(jobId: string, errorMessage: string) {
    const existingJob = await fetchTenderAnalysisJobRowById(jobId);

    if (!existingJob) {
      throw new Error('Analyysijobia ei löytynyt.');
    }

    return this.updateAnalysisJob(
      jobId,
      {
        status: 'failed',
        started_at: existingJob.started_at,
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      },
      'Analyysijobia ei voitu merkitä epäonnistuneeksi.'
    );
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
      return await this.getLatestAnalysisJobForPackage(packageId);
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
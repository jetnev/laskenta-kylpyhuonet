// deno-lint-ignore-file no-explicit-any
/**
 * Supabase Edge Function — Tarjousäly server-side analysis runner boundary
 *
 * Phase 8 entry-point.
 * Receives `{ tenderPackageId }`, validates auth + org access + extraction
 * readiness,
 * creates and transitions an analysis job through pending → queued → running →
 * completed, writes deterministic baseline results plus evidence rows, and
 * returns a
 * structured response.
 *
 * No AI, OCR, or semantic analysis happens here — the analysis is still a
 * deterministic rule-based baseline. The function requires real extracted
 * chunk data so that every stored finding can point to persistent provenance.
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { buildTenderReferenceMatches } from '../../../src/features/tender-intelligence/lib/tender-reference-matching.ts';
import {
  buildPlaceholderAnalysisSeedPlan,
  type PlaceholderEvidenceSourceSeed,
  type PlaceholderResultEvidenceLinkSeed,
} from './placeholder-seed.ts';

/* ------------------------------------------------------------------ */
/*  CORS                                                               */
/* ------------------------------------------------------------------ */

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/* ------------------------------------------------------------------ */
/*  Response helpers                                                   */
/* ------------------------------------------------------------------ */

interface RunnerResponse {
  accepted: boolean;
  analysisJobId: string | null;
  status: string;
  message: string | null;
}

function jsonResponse(body: RunnerResponse, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function rejected(
  status: number,
  message: string,
): Response {
  return jsonResponse({ accepted: false, analysisJobId: null, status: 'rejected', message }, status);
}

/* ------------------------------------------------------------------ */
/*  Baseline result writer                                             */
/* ------------------------------------------------------------------ */

async function clearAnalysisResults(client: SupabaseClient, packageId: string) {
  const resultTables = [
    'tender_result_evidence',
    'tender_review_tasks',
    'tender_draft_artifacts',
    'tender_reference_suggestions',
    'tender_risk_flags',
    'tender_missing_items',
    'tender_requirements',
  ] as const;

  for (const table of resultTables) {
    const { error } = await client.from(table).delete().eq('tender_package_id', packageId);
    if (error) throw error;
  }

  const { error: assessmentError } = await client.from('tender_go_no_go_assessments').upsert(
    {
      tender_package_id: packageId,
      recommendation: 'pending',
      summary: null,
      confidence: null,
    },
    { onConflict: 'tender_package_id' },
  );

  if (assessmentError) throw assessmentError;
}

async function insertTenderResultEvidenceRows<TSeed extends { evidenceLinks: PlaceholderResultEvidenceLinkSeed[] }>(
  client: SupabaseClient,
  options: {
    packageId: string;
    targetEntityType: 'requirement' | 'missing_item' | 'risk_flag' | 'reference_suggestion' | 'draft_artifact' | 'review_task';
    targetRows: { id: string }[];
    seeds: TSeed[];
    evidenceSources: PlaceholderEvidenceSourceSeed[];
  },
) {
  const payload = options.seeds.flatMap((seed, index) => {
    const targetId = options.targetRows[index]?.id;

    if (!targetId) {
      return [];
    }

    return seed.evidenceLinks.flatMap((link) => {
      const source = options.evidenceSources[link.sourceIndex];

      if (!source) {
        return [];
      }

      return {
        tender_package_id: options.packageId,
        source_document_id: source.documentId,
        extraction_id: source.extractionId,
        chunk_id: source.chunkId,
        target_entity_type: options.targetEntityType,
        target_entity_id: targetId,
        excerpt_text: source.excerptText,
        locator_text: source.locatorText,
        confidence: link.confidence,
      };
    });
  });

  if (payload.length < 1) {
    return;
  }

  const { error } = await client.from('tender_result_evidence').insert(payload);

  if (error) {
    throw error;
  }
}

async function insertRowsIfAny(
  client: SupabaseClient,
  tableName:
    | 'tender_requirements'
    | 'tender_missing_items'
    | 'tender_risk_flags'
    | 'tender_reference_suggestions'
    | 'tender_draft_artifacts'
    | 'tender_review_tasks',
  rows: Record<string, unknown>[],
) {
  if (rows.length < 1) {
    return [];
  }

  const { data, error } = await client.from(tableName).insert(rows).select('id');

  if (error) {
    throw error;
  }

  return (data ?? []) as { id: string }[];
}

async function seedPlaceholderResults(
  client: SupabaseClient,
  packageId: string,
  packageRow: { id: string; title: string; organization_id: string },
  documentRows: { id: string; file_name: string; tender_package_id: string }[],
  chunkRows: {
    id: string;
    tender_document_id: string;
    extraction_id: string;
    chunk_index: number;
    text_content: string;
  }[],
) {
  const plan = buildPlaceholderAnalysisSeedPlan({ packageRow, documentRows, chunkRows });
  const { data: referenceProfileRows, error: referenceProfileError } = await client
    .from('tender_reference_profiles')
    .select('id, title, client_name, project_type, description, location, completed_year, contract_value, tags')
    .eq('organization_id', packageRow.organization_id)
    .order('updated_at', { ascending: false });

  if (referenceProfileError) {
    throw referenceProfileError;
  }

  await clearAnalysisResults(client, packageId);

  const requirementRows = await insertRowsIfAny(
    client,
    'tender_requirements',
    plan.requirements.map((r) => ({
      tender_package_id: packageId,
      source_document_id: r.sourceDocumentId,
      requirement_type: r.requirementType,
      title: r.title,
      description: r.description,
      status: r.status,
      confidence: r.confidence,
      source_excerpt: r.sourceExcerpt,
    })),
  );
  const reqIds: string[] = requirementRows
    .map((row) => (typeof row === 'object' && row !== null && 'id' in row ? String(row.id) : null))
    .filter((id): id is string => Boolean(id));
  await insertTenderResultEvidenceRows(client, {
    packageId,
    targetEntityType: 'requirement',
    targetRows: reqIds.map((id) => ({ id })),
    seeds: plan.requirements,
    evidenceSources: plan.evidenceSources,
  });

  const missingItemData = await insertRowsIfAny(
    client,
    'tender_missing_items',
    plan.missingItems.map((m) => ({
      tender_package_id: packageId,
      related_requirement_id:
        m.relatedRequirementIndex != null ? reqIds[m.relatedRequirementIndex] ?? null : null,
      item_type: m.itemType,
      title: m.title,
      description: m.description,
      severity: m.severity,
      status: m.status,
    })),
  );
  await insertTenderResultEvidenceRows(client, {
    packageId,
    targetEntityType: 'missing_item',
    targetRows: (missingItemData ?? []) as { id: string }[],
    seeds: plan.missingItems,
    evidenceSources: plan.evidenceSources,
  });

  const riskFlagData = await insertRowsIfAny(
    client,
    'tender_risk_flags',
    plan.riskFlags.map((r) => ({
      tender_package_id: packageId,
      risk_type: r.riskType,
      title: r.title,
      description: r.description,
      severity: r.severity,
      status: r.status,
    })),
  );
  await insertTenderResultEvidenceRows(client, {
    packageId,
    targetEntityType: 'risk_flag',
    targetRows: (riskFlagData ?? []) as { id: string }[],
    seeds: plan.riskFlags,
    evidenceSources: plan.evidenceSources,
  });

  const referenceSuggestionData = await insertRowsIfAny(
    client,
    'tender_reference_suggestions',
    plan.referenceSuggestions.map((s) => ({
      tender_package_id: packageId,
      related_requirement_id: null,
      source_type: s.sourceType,
      source_reference: s.sourceReference,
      title: s.title,
      rationale: s.rationale,
      confidence: s.confidence,
    })),
  );
  await insertTenderResultEvidenceRows(client, {
    packageId,
    targetEntityType: 'reference_suggestion',
    targetRows: (referenceSuggestionData ?? []) as { id: string }[],
    seeds: plan.referenceSuggestions,
    evidenceSources: plan.evidenceSources,
  });

  const organizationReferenceSuggestions = buildTenderReferenceMatches({
    requirements: plan.requirements.map((requirement, requirementIndex) => ({
      id: requirementIndex,
      title: requirement.title,
      description: requirement.description,
      sourceExcerpt: requirement.sourceExcerpt,
      evidenceLinks: requirement.evidenceLinks,
    })),
    profiles: (referenceProfileRows ?? []).map((profile) => ({
      id: profile.id,
      title: profile.title,
      clientName: profile.client_name,
      projectType: profile.project_type,
      description: profile.description,
      location: profile.location,
      completedYear: profile.completed_year,
      contractValue: profile.contract_value,
      tags: profile.tags,
    })),
  }).flatMap((suggestion) => {
    const relatedRequirementId = reqIds[suggestion.requirementId] ?? null;

    return relatedRequirementId
      ? [{
          ...suggestion,
          relatedRequirementId,
        }]
      : [];
  });

  const organizationReferenceSuggestionData = await insertRowsIfAny(
    client,
    'tender_reference_suggestions',
    organizationReferenceSuggestions.map((suggestion) => ({
      tender_package_id: packageId,
      related_requirement_id: suggestion.relatedRequirementId,
      source_type: 'organization_reference_profile',
      source_reference: suggestion.profileId,
      title: suggestion.title,
      rationale: suggestion.rationale,
      confidence: suggestion.confidence,
    })),
  );
  await insertTenderResultEvidenceRows(client, {
    packageId,
    targetEntityType: 'reference_suggestion',
    targetRows: (organizationReferenceSuggestionData ?? []) as { id: string }[],
    seeds: organizationReferenceSuggestions,
    evidenceSources: plan.evidenceSources,
  });

  const draftArtifactData = await insertRowsIfAny(
    client,
    'tender_draft_artifacts',
    plan.draftArtifacts.map((a) => ({
      tender_package_id: packageId,
      artifact_type: a.artifactType,
      title: a.title,
      content_md: a.contentMd,
      status: a.status,
    })),
  );
  await insertTenderResultEvidenceRows(client, {
    packageId,
    targetEntityType: 'draft_artifact',
    targetRows: (draftArtifactData ?? []) as { id: string }[],
    seeds: plan.draftArtifacts,
    evidenceSources: plan.evidenceSources,
  });

  const reviewTaskData = await insertRowsIfAny(
    client,
    'tender_review_tasks',
    plan.reviewTasks.map((t) => ({
      tender_package_id: packageId,
      task_type: t.taskType,
      title: t.title,
      description: t.description,
      status: t.status,
      assigned_to_user_id: null,
    })),
  );
  await insertTenderResultEvidenceRows(client, {
    packageId,
    targetEntityType: 'review_task',
    targetRows: (reviewTaskData ?? []) as { id: string }[],
    seeds: plan.reviewTasks,
    evidenceSources: plan.evidenceSources,
  });

  const { error: goErr } = await client.from('tender_go_no_go_assessments').upsert(
    {
      tender_package_id: packageId,
      recommendation: plan.goNoGoAssessment.recommendation,
      summary: plan.goNoGoAssessment.summary,
      confidence: plan.goNoGoAssessment.confidence,
    },
    { onConflict: 'tender_package_id' },
  );
  if (goErr) throw goErr;
}

/* ------------------------------------------------------------------ */
/*  Job state helpers                                                  */
/* ------------------------------------------------------------------ */

async function updateJobStatus(
  client: SupabaseClient,
  jobId: string,
  updates: Record<string, unknown>,
) {
  const { data, error } = await client
    .from('tender_analysis_jobs')
    .update(updates)
    .eq('id', jobId)
    .select('id, status')
    .single();

  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                       */
/* ------------------------------------------------------------------ */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return rejected(405, 'Vain POST-pyynnöt ovat sallittuja.');
  }

  try {
    /* ---- auth ---- */
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

    /* ---- parse request ---- */
    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return rejected(400, 'Pyyntö ei sisällä kelvollista JSON-dataa.');
    }

    const tenderPackageId =
      typeof body.tenderPackageId === 'string' ? body.tenderPackageId.trim() : '';

    if (!tenderPackageId) {
      return rejected(400, 'tenderPackageId puuttuu tai on virheellinen.');
    }

    /* ---- package access (RLS enforces org scope) ---- */
    const { data: packageRow, error: packageError } = await client
      .from('tender_packages')
      .select('id, title, organization_id')
      .eq('id', tenderPackageId)
      .maybeSingle();

    if (packageError) {
      return rejected(500, 'Tarjouspyyntöpakettia ei voitu tarkistaa.');
    }

    if (!packageRow) {
      return rejected(
        404,
        'Tarjouspyyntöpakettia ei löytynyt tai sinulla ei ole oikeutta siihen.',
      );
    }

    /* ---- documents ---- */
    const { data: documentRows, error: docError } = await client
      .from('tender_documents')
      .select('id, file_name, tender_package_id')
      .eq('tender_package_id', tenderPackageId)
      .order('file_name', { ascending: true });

    if (docError) {
      return rejected(500, 'Dokumenttien tarkistus epäonnistui.');
    }

    if (!documentRows || documentRows.length === 0) {
      return rejected(
        422,
        'Lisää pakettiin vähintään yksi dokumentti ennen analyysin käynnistämistä.',
      );
    }

    /* ---- extraction readiness ---- */
    const { data: extractionRows, error: extractionError } = await client
      .from('tender_document_extractions')
      .select('id, tender_document_id, extraction_status, chunk_count')
      .eq('tender_package_id', tenderPackageId);

    if (extractionError) {
      return rejected(500, 'Dokumenttien extraction-tilaa ei voitu tarkistaa.');
    }

    const extractedRows = (extractionRows ?? []).filter(
      (row) => row.extraction_status === 'extracted',
    );
    const extractedDocumentCount = extractedRows.length;
    const extractedChunkCount = extractedRows.reduce(
      (sum: number, row) => sum + Math.max(0, Number(row.chunk_count ?? 0)),
      0,
    );

    if (extractedDocumentCount < 1) {
      return rejected(
        422,
        'Käynnistä extraction vähintään yhdelle tuetulle dokumentille ennen analyysin käynnistämistä.',
      );
    }

    if (extractedChunkCount < 1) {
      return rejected(
        422,
        'Puretuista dokumenteista ei löytynyt yhtään analyysiin kelpaavaa chunkia, joten evidence-pohjaista analyysiä ei voi vielä käynnistää.',
      );
    }

    const { data: chunkRows, error: chunkError } = await client
      .from('tender_document_chunks')
      .select('id, tender_document_id, extraction_id, chunk_index, text_content')
      .eq('tender_package_id', tenderPackageId)
      .order('created_at', { ascending: true });

    if (chunkError) {
      return rejected(500, 'Dokumenttien extraction-chunkeja ei voitu ladata analyysiä varten.');
    }

    if (!chunkRows || chunkRows.length === 0) {
      return rejected(
        422,
        'Puretuista dokumenteista ei löytynyt yhtään analyysiin kelpaavaa chunkia, joten evidence-pohjaista analyysiä ei voi vielä käynnistää.',
      );
    }

    /* ---- active job guard ---- */
    const { data: activeJobs } = await client
      .from('tender_analysis_jobs')
      .select('id, status')
      .eq('tender_package_id', tenderPackageId)
      .in('status', ['pending', 'queued', 'running']);

    if (activeJobs && activeJobs.length > 0) {
      return rejected(
        409,
        'Paketille on jo käynnissä analyysiajo. Odota nykyisen ajon valmistumista.',
      );
    }

    /* ---- create job ---- */
    const { data: jobData, error: jobError } = await client
      .from('tender_analysis_jobs')
      .insert({
        tender_package_id: tenderPackageId,
        job_type: 'placeholder_analysis',
        status: 'pending',
        provider: null,
        model: null,
        error_message: null,
        started_at: null,
        completed_at: null,
      })
      .select('id, status')
      .single();

    if (jobError || !jobData) {
      return rejected(500, 'Analyysijobin luonti epäonnistui.');
    }

    const jobId = jobData.id;

    /* ---- orchestration: pending → queued → running ---- */
    try {
      await updateJobStatus(client, jobId, {
        status: 'queued',
        completed_at: null,
        error_message: null,
      });

      const startedAt = new Date().toISOString();

      await updateJobStatus(client, jobId, {
        status: 'running',
        started_at: startedAt,
        completed_at: null,
        error_message: null,
      });

      /* ---- write deterministic baseline results ---- */
      await seedPlaceholderResults(client, tenderPackageId, packageRow, documentRows, chunkRows);

      /* ---- running → completed ---- */
      const completedAt = new Date().toISOString();

      await updateJobStatus(client, jobId, {
        status: 'completed',
        started_at: startedAt,
        completed_at: completedAt,
        error_message: null,
      });

      return jsonResponse(
        {
          accepted: true,
          analysisJobId: jobId,
          status: 'completed',
          message: null,
        },
        200,
      );
    } catch (runError: unknown) {
      /* ---- mark job failed ---- */
      const errorMessage =
        runError instanceof Error
          ? runError.message
          : 'Baseline-analyysin suoritus epäonnistui.';

      try {
        await updateJobStatus(client, jobId, {
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
        });
      } catch {
        // Best-effort status update — the job row already exists.
      }

      try {
        await clearAnalysisResults(client, tenderPackageId);
      } catch {
        // Best-effort cleanup.
      }

      return jsonResponse(
        {
          accepted: true,
          analysisJobId: jobId,
          status: 'failed',
          message: errorMessage,
        },
        200,
      );
    }
  } catch (outerError: unknown) {
    const message =
      outerError instanceof Error
        ? outerError.message
        : 'Analyysin käynnistys epäonnistui odottamatta.';

    return rejected(500, message);
  }
});

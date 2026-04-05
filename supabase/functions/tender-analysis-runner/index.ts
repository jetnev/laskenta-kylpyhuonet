// deno-lint-ignore-file no-explicit-any
/**
 * Supabase Edge Function — Tarjousäly server-side analysis runner boundary
 *
 * Phase 5 entry-point.
 * Receives `{ tenderPackageId }`, validates auth + org access + documents,
 * creates and transitions an analysis job through pending → queued → running →
 * completed, seeds placeholder results, and returns a structured response.
 *
 * No AI, OCR, or document parsing happens here — the analysis is still a
 * deterministic placeholder run. The function exists solely to move
 * orchestration behind a server-side boundary.
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { buildPlaceholderAnalysisSeedPlan } from './placeholder-seed.ts';

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
/*  Placeholder seed writer                                            */
/* ------------------------------------------------------------------ */

async function clearAnalysisResults(client: SupabaseClient, packageId: string) {
  const resultTables = [
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

async function seedPlaceholderResults(
  client: SupabaseClient,
  packageId: string,
  packageRow: { id: string; title: string; organization_id: string },
  documentRows: { id: string; file_name: string; tender_package_id: string }[],
) {
  const plan = buildPlaceholderAnalysisSeedPlan({ packageRow, documentRows });

  await clearAnalysisResults(client, packageId);

  // 1. Requirements
  const { data: requirementData, error: reqErr } = await client
    .from('tender_requirements')
    .insert(
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
    )
    .select('id');

  if (reqErr) throw reqErr;
  const reqIds: string[] = (requirementData ?? []).map((r: any) => r.id);

  // 2. Missing items (FK-linked to requirements)
  const { error: misErr } = await client.from('tender_missing_items').insert(
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
  if (misErr) throw misErr;

  // 3. Risk flags
  const { error: riskErr } = await client.from('tender_risk_flags').insert(
    plan.riskFlags.map((r) => ({
      tender_package_id: packageId,
      risk_type: r.riskType,
      title: r.title,
      description: r.description,
      severity: r.severity,
      status: r.status,
    })),
  );
  if (riskErr) throw riskErr;

  // 4. Reference suggestions
  const { error: refErr } = await client.from('tender_reference_suggestions').insert(
    plan.referenceSuggestions.map((s) => ({
      tender_package_id: packageId,
      source_type: s.sourceType,
      source_reference: s.sourceReference,
      title: s.title,
      rationale: s.rationale,
      confidence: s.confidence,
    })),
  );
  if (refErr) throw refErr;

  // 5. Draft artifacts
  const { error: draftErr } = await client.from('tender_draft_artifacts').insert(
    plan.draftArtifacts.map((a) => ({
      tender_package_id: packageId,
      artifact_type: a.artifactType,
      title: a.title,
      content_md: a.contentMd,
      status: a.status,
    })),
  );
  if (draftErr) throw draftErr;

  // 6. Review tasks
  const { error: taskErr } = await client.from('tender_review_tasks').insert(
    plan.reviewTasks.map((t) => ({
      tender_package_id: packageId,
      task_type: t.taskType,
      title: t.title,
      description: t.description,
      status: t.status,
      assigned_to_user_id: null,
    })),
  );
  if (taskErr) throw taskErr;

  // 7. Go / No-Go assessment
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

    const jobId: string = (jobData as any).id;

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

      /* ---- seed placeholder results ---- */
      await seedPlaceholderResults(client, tenderPackageId, packageRow, documentRows);

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
          : 'Placeholder-analyysin suoritus epäonnistui.';

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

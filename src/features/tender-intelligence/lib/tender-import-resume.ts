import type {
  TenderDraftPackageImportRun,
  TenderDraftPackageImportState,
  TenderEditorImportPreview,
  TenderEditorManagedBlockId,
  TenderEditorReconciliationPreview,
  TenderEditorSelectiveReimportSelection,
  TenderImportRegistryRepairAction,
  TenderImportRegistryRepairPreview,
} from '../types/tender-editor-import';

export type TenderImportResumeSupportStatus = 'resume_available' | 'already_applied' | 'blocked' | 'stale_context' | 'not_available';
export type TenderImportResumeActionKind = 'reimport' | 'registry_repair' | 'diagnostics_refresh' | null;

export interface TenderImportResumeSupport {
  status: TenderImportResumeSupportStatus;
  can_resume: boolean;
  action_kind: TenderImportResumeActionKind;
  action_label: string | null;
  summary: string;
  detail_lines: string[];
  latest_failed_run: TenderDraftPackageImportRun | null;
  selection: TenderEditorSelectiveReimportSelection | null;
  repair_action: TenderImportRegistryRepairAction | null;
  pending_block_ids: TenderEditorManagedBlockId[];
  blocked_block_ids: TenderEditorManagedBlockId[];
  settled_block_ids: TenderEditorManagedBlockId[];
}

function toUniqueBlockIds(blockIds: TenderEditorManagedBlockId[]) {
  return [...new Set(blockIds)];
}

function buildSupport(overrides: Partial<TenderImportResumeSupport> = {}): TenderImportResumeSupport {
  return {
    status: 'not_available',
    can_resume: false,
    action_kind: null,
    action_label: null,
    summary: 'Viimeisin ajo ei tarvitse erillista jatkoa.',
    detail_lines: [],
    latest_failed_run: null,
    selection: null,
    repair_action: null,
    pending_block_ids: [],
    blocked_block_ids: [],
    settled_block_ids: [],
    ...overrides,
  };
}

function resolveCurrentTargetQuoteId(importState?: TenderDraftPackageImportState | null) {
  return importState?.target_quote_id ?? importState?.imported_quote_id ?? null;
}

function hasTargetQuoteMismatch(
  run: TenderDraftPackageImportRun,
  importState?: TenderDraftPackageImportState | null,
) {
  const currentTargetQuoteId = resolveCurrentTargetQuoteId(importState);

  return Boolean(run.target_quote_id && currentTargetQuoteId && run.target_quote_id !== currentTargetQuoteId);
}

function shouldTreatBlockAsBlocked(block: TenderEditorReconciliationPreview['blocks'][number]) {
  return block.is_conflict || block.drift_status === 'removed_from_quote' || block.drift_status === 'registry_stale';
}

function classifyReimportBlock(options: {
  block: TenderEditorReconciliationPreview['blocks'][number] | null;
  action: 'update' | 'remove';
  overrideRequested: boolean;
}) {
  if (!options.block) {
    return 'settled' as const;
  }

  const canApply = options.action === 'update'
    ? options.block.can_select_for_update
    : options.block.can_select_for_removal;

  if (!canApply) {
    return shouldTreatBlockAsBlocked(options.block) ? 'blocked' as const : 'settled' as const;
  }

  if (options.block.is_conflict && !options.overrideRequested) {
    return 'blocked' as const;
  }

  return 'pending' as const;
}

function buildReimportResumeSupport(options: {
  run: TenderDraftPackageImportRun;
  preview?: TenderEditorImportPreview | null;
  importState?: TenderDraftPackageImportState | null;
  reimportPreview?: TenderEditorReconciliationPreview | null;
}): TenderImportResumeSupport {
  if (!options.preview || !options.reimportPreview) {
    return buildSupport({
      status: 'stale_context',
      summary: 'Tuoretta re-import reconciliation -nakymaa ei ole saatavilla keskeytyneen ajon jatkamiseen.',
      detail_lines: [
        'Lataa nykyinen import-preview ja reconciliation ennen kuin jatkat samaan quoteen kohdistuvaa ajoa.',
      ],
      latest_failed_run: options.run,
    });
  }

  if (options.run.payload_hash !== options.preview.payload_hash) {
    return buildSupport({
      status: 'stale_context',
      summary: 'Luonnospaketin payload on muuttunut keskeytyneen re-importin jalkeen.',
      detail_lines: [
        'Vanhaa blokkivalintaa ei tarjota jatkettavaksi, jotta uusi yritys pysyy turvallisesti idempotenttina.',
      ],
      latest_failed_run: options.run,
    });
  }

  if (options.importState?.suggested_import_mode !== 'update_existing_quote') {
    return buildSupport({
      status: 'blocked',
      summary: 'Keskeytynytta ajoa ei voi jatkaa automaattisesti, koska nykyinen import-kohde ei ole sama olemassa oleva quote.',
      detail_lines: [
        'Tama inkrementti tarjoaa automaattisen resumen vain samaan quoteen kohdistuville re-importeille.',
      ],
      latest_failed_run: options.run,
    });
  }

  const reimportBlocksById = new Map(options.reimportPreview.blocks.map((block) => [block.block_id, block]));
  const overrideRequestedBlockIds = new Set(options.run.execution_metadata.override_conflict_block_ids);
  const pendingUpdateBlockIds: TenderEditorManagedBlockId[] = [];
  const pendingRemoveBlockIds: TenderEditorManagedBlockId[] = [];
  const pendingOverrideBlockIds: TenderEditorManagedBlockId[] = [];
  const blockedBlockIds: TenderEditorManagedBlockId[] = [];
  const settledBlockIds: TenderEditorManagedBlockId[] = [];

  toUniqueBlockIds(options.run.execution_metadata.selected_update_block_ids).forEach((blockId) => {
    const block = reimportBlocksById.get(blockId) ?? null;
    const classification = classifyReimportBlock({
      block,
      action: 'update',
      overrideRequested: overrideRequestedBlockIds.has(blockId),
    });

    if (classification === 'pending') {
      pendingUpdateBlockIds.push(blockId);

      if (block?.is_conflict && overrideRequestedBlockIds.has(blockId)) {
        pendingOverrideBlockIds.push(blockId);
      }

      return;
    }

    if (classification === 'blocked') {
      blockedBlockIds.push(blockId);
      return;
    }

    settledBlockIds.push(blockId);
  });

  toUniqueBlockIds(options.run.execution_metadata.selected_remove_block_ids).forEach((blockId) => {
    const block = reimportBlocksById.get(blockId) ?? null;
    const classification = classifyReimportBlock({
      block,
      action: 'remove',
      overrideRequested: overrideRequestedBlockIds.has(blockId),
    });

    if (classification === 'pending') {
      pendingRemoveBlockIds.push(blockId);

      if (block?.is_conflict && overrideRequestedBlockIds.has(blockId)) {
        pendingOverrideBlockIds.push(blockId);
      }

      return;
    }

    if (classification === 'blocked') {
      blockedBlockIds.push(blockId);
      return;
    }

    settledBlockIds.push(blockId);
  });

  const pendingBlockIds = toUniqueBlockIds([...pendingUpdateBlockIds, ...pendingRemoveBlockIds]);
  const uniqueBlockedBlockIds = toUniqueBlockIds(blockedBlockIds);
  const uniqueSettledBlockIds = toUniqueBlockIds(settledBlockIds);
  const isRecoveredCreateRun = options.run.import_mode === 'create_new_quote';

  if (pendingBlockIds.length > 0) {
    const detailLines = [
      'Payload hash ja kohdequote vastaavat edelleen nykyista reconciliation-nakymaa.',
    ];

    if (isRecoveredCreateRun) {
      detailLines.unshift('Keskeytynyt create-new-quote-ajo ehti jo luoda kohdequoten, joten jatko tehdään samaan quoteen protected re-importina.');
    }

    if (uniqueSettledBlockIds.length > 0) {
      detailLines.push(`${uniqueSettledBlockIds.length} blokkia ei enaa vaadi jatkoa, joten uusi yritys ei kirjoita jo synkattua sisaltoa uudelleen.`);
    }

    if (uniqueBlockedBlockIds.length > 0) {
      detailLines.push(`${uniqueBlockedBlockIds.length} blokkia jai edelleen konfliktisuojaan tai puuttuu quote-puolelta.`);
    }

    return buildSupport({
      status: 'resume_available',
      can_resume: true,
      action_kind: 'reimport',
      action_label: isRecoveredCreateRun ? 'Jatka aiemmin luotuun quoteen' : 'Jatka keskeytynytta re-importia',
      summary: isRecoveredCreateRun
        ? `Create-new-quote-ajo epaonnistui myohassa vaiheessa, mutta ${pendingBlockIds.length} blokkia voidaan jatkaa samaan jo luotuun quoteen.`
        : `Viimeisin re-import epaonnistui, mutta ${pendingBlockIds.length} blokkia voidaan jatkaa samaan quoteen ilman jo synkattujen lohkojen uudelleenkirjoitusta.`,
      detail_lines: detailLines,
      latest_failed_run: options.run,
      selection: {
        update_block_ids: pendingUpdateBlockIds,
        remove_block_ids: pendingRemoveBlockIds,
        override_conflict_block_ids: toUniqueBlockIds(pendingOverrideBlockIds),
        conflict_policy: pendingOverrideBlockIds.length > 0 ? 'override_selected_conflicts' : 'protect_conflicts',
      },
      pending_block_ids: pendingBlockIds,
      blocked_block_ids: uniqueBlockedBlockIds,
      settled_block_ids: uniqueSettledBlockIds,
    });
  }

  if (uniqueBlockedBlockIds.length > 0) {
    const detailLines = [
      `${uniqueBlockedBlockIds.length} blokkia on edelleen konfliktisuojaan tai puuttuvaan quote-sisaltoon sidottu.`,
      'Paivita drift-tila quotesta tai tee uusi selektiivinen re-import tuoreesta reconciliation-nakymasta.',
    ];

    if (isRecoveredCreateRun) {
      detailLines.unshift('Keskeytynyt create-new-quote-ajo loi kohdequoten, mutta nykyinen reconciliation ei salli turvallista automaattijatkoa kaikille blokeille.');
    }

    if (uniqueSettledBlockIds.length > 0) {
      detailLines.unshift(`${uniqueSettledBlockIds.length} blokkia ehti jo synkkaan ennen keskeytysta.`);
    }

    return buildSupport({
      status: 'blocked',
      summary: 'Keskeytynytta re-importia ei voi jatkaa turvallisesti nykytilasta suoraan samalla blokkivalinnalla.',
      detail_lines: detailLines,
      latest_failed_run: options.run,
      blocked_block_ids: uniqueBlockedBlockIds,
      settled_block_ids: uniqueSettledBlockIds,
    });
  }

  return buildSupport({
    status: 'already_applied',
    summary: 'Viimeisin re-import nayttaa jo siirtaneen valitut muutokset perille, joten suoraa jatkoa ei enaa tarvita.',
    detail_lines: [
      'Nykyinen reconciliation ei enaa nayta jatkettavia blokkeja keskeytyneen ajon alkuperaisesta valinnasta.',
    ],
    latest_failed_run: options.run,
    settled_block_ids: uniqueSettledBlockIds,
  });
}

function buildRegistryRepairResumeSupport(options: {
  run: TenderDraftPackageImportRun;
  repairPreview?: TenderImportRegistryRepairPreview | null;
}): TenderImportResumeSupport {
  const repairAction = options.run.execution_metadata.repair_action;

  if (!repairAction) {
    return buildSupport({
      status: 'blocked',
      summary: 'Keskeytyneen registry repair -ajon korjaustoimintoa ei tunnistettu.',
      detail_lines: [
        'Kayta tuoretta repair-previewta ja valitse korjaustoiminto uudelleen ennen uutta yritysta.',
      ],
      latest_failed_run: options.run,
    });
  }

  const actionPreview = options.repairPreview?.actions.find((action) => action.action === repairAction) ?? null;
  const pendingBlockIds = actionPreview?.eligible_block_ids ?? [];
  const settledBlockIds = toUniqueBlockIds([
    ...options.run.execution_metadata.refreshed_hash_block_ids,
    ...options.run.execution_metadata.orphaned_block_ids,
    ...options.run.execution_metadata.pruned_registry_block_ids,
  ]).filter((blockId) => !pendingBlockIds.includes(blockId));
  const detailLines = ['Registry repair paivittaa vain registry-metadataa eika kirjoita quote-sisaltoa.'];

  if (pendingBlockIds.length > 0) {
    detailLines.unshift(`${pendingBlockIds.length} blokkia on edelleen eligible samalle repair-toiminnolle.`);
  }

  if (settledBlockIds.length > 0) {
    detailLines.push(`${settledBlockIds.length} blokkia ehti jo muuttua ennen keskeytysta, joten uusi yritys pysyy idempotenttina.`);
  }

  return buildSupport({
    status: 'resume_available',
    can_resume: true,
    action_kind: 'registry_repair',
    action_label: 'Jatka keskeytynytta registry repairia',
    summary: 'Viimeisin registry repair epaonnistui, mutta saman metadatakorjauksen voi ajaa turvallisesti uudelleen.',
    detail_lines: detailLines,
    latest_failed_run: options.run,
    repair_action: repairAction,
    pending_block_ids: pendingBlockIds,
    settled_block_ids: settledBlockIds,
  });
}

function buildDiagnosticsRefreshResumeSupport(run: TenderDraftPackageImportRun): TenderImportResumeSupport {
  return buildSupport({
    status: 'resume_available',
    can_resume: true,
    action_kind: 'diagnostics_refresh',
    action_label: 'Aja diagnostics refresh uudelleen',
    summary: 'Viimeisin diagnostics refresh epaonnistui, mutta live-tilan voi hakea uudelleen ilman quote-kirjoitusta.',
    detail_lines: [
      'Refresh paivittaa vain drift- ja registry-diagnostiikan nykyisesta quotesta.',
    ],
    latest_failed_run: run,
  });
}

export function buildTenderImportResumeSupport(options: {
  importRuns: TenderDraftPackageImportRun[];
  preview?: TenderEditorImportPreview | null;
  importState?: TenderDraftPackageImportState | null;
  reimportPreview?: TenderEditorReconciliationPreview | null;
  repairPreview?: TenderImportRegistryRepairPreview | null;
}) {
  const latestRun = [...options.importRuns]
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))[0] ?? null;

  if (!latestRun || latestRun.result_status !== 'failed') {
    return buildSupport();
  }

  if (hasTargetQuoteMismatch(latestRun, options.importState)) {
    return buildSupport({
      status: 'stale_context',
      summary: 'Kohdequote on vaihtunut keskeytyneen ajon jalkeen.',
      detail_lines: [
        'Vanhaa resume-polkuja ei tarjota, koska uusi yritys voisi muuten kohdistua vaaran quoteen.',
      ],
      latest_failed_run: latestRun,
    });
  }

  if (latestRun.run_type === 'registry_repair') {
    return buildRegistryRepairResumeSupport({
      run: latestRun,
      repairPreview: options.repairPreview,
    });
  }

  if (latestRun.run_type === 'diagnostics_refresh') {
    return buildDiagnosticsRefreshResumeSupport(latestRun);
  }

  return buildReimportResumeSupport({
    run: latestRun,
    preview: options.preview,
    importState: options.importState,
    reimportPreview: options.reimportPreview,
  });
}
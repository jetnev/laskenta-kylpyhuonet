import type { TenderDraftPackage } from '../types/tender-intelligence';
import type {
  TenderDraftPackageImportRun,
  TenderEditorImportResult,
} from '../types/tender-editor-import';

export interface TenderDraftPackageImportFailureRecovery {
  importStatePatch: Partial<{
    import_status: TenderDraftPackage['importStatus'];
    reimport_status: TenderDraftPackage['reimportStatus'];
    imported_quote_id: string | null;
    imported_by_user_id: string | null;
    imported_at: string | null;
  }>;
  recoveredTargetQuoteId: string | null;
  recoveredExecutionMetadata: TenderDraftPackageImportRun['execution_metadata'] | null;
}

export function buildTenderDraftPackageImportFailureRecovery(options: {
  draftPackage: TenderDraftPackage;
  actorUserId: string;
  adapterResult?: TenderEditorImportResult | null;
  fallbackImportedAt?: string | null;
}): TenderDraftPackageImportFailureRecovery {
  const recoveredTargetQuoteId = options.adapterResult?.imported_quote_id ?? options.draftPackage.importedQuoteId ?? null;

  if (!recoveredTargetQuoteId) {
    return {
      importStatePatch: {
        import_status: 'failed',
        reimport_status: 'import_failed',
      },
      recoveredTargetQuoteId: null,
      recoveredExecutionMetadata: null,
    };
  }

  return {
    importStatePatch: {
      import_status: 'imported',
      reimport_status: 'import_failed',
      imported_quote_id: recoveredTargetQuoteId,
      imported_by_user_id: options.draftPackage.importedByUserId ?? options.actorUserId,
      imported_at: options.draftPackage.importedAt ?? options.fallbackImportedAt ?? new Date().toISOString(),
    },
    recoveredTargetQuoteId,
    recoveredExecutionMetadata: options.adapterResult?.execution_metadata ?? null,
  };
}
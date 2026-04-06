import type { TenderDraftPackageImportState, TenderEditorImportValidationResult } from '../types/tender-editor-import';
import type { TenderDraftPackage, TenderPackageDetails } from '../types/tender-intelligence';
import { buildTenderDraftPackageReadiness } from './tender-draft-package';
import { buildTenderGoNoGoDecisionSupport, type TenderGoNoGoSignalState } from './tender-go-no-go';

export type TenderDraftQualityGateState = TenderGoNoGoSignalState;

export interface TenderDraftQualityGateCheck {
  key: 'content' | 'draft-status' | 'go-no-go' | 'import-validation' | 'workflow' | 'reimport-safety';
  label: string;
  state: TenderDraftQualityGateState;
  detail: string;
}

export interface TenderDraftQualityGate {
  state: TenderDraftQualityGateState;
  summary: string;
  checks: TenderDraftQualityGateCheck[];
  nextActions: string[];
  canExportToEditor: boolean;
}

export function buildTenderDraftQualityGate(options: {
  packageDetails: TenderPackageDetails;
  selectedDraftPackage?: TenderDraftPackage | null;
  importValidation?: TenderEditorImportValidationResult | null;
  draftPackageImportState?: TenderDraftPackageImportState | null;
}): TenderDraftQualityGate {
  const readiness = buildTenderDraftPackageReadiness(options.packageDetails);
  const decision = buildTenderGoNoGoDecisionSupport(options.packageDetails);
  const decisionDetail = decision.state === 'ready'
    ? decision.summary
    : decision.signals.find((signal) => signal.state === decision.state)?.detail ?? decision.summary;
  const importErrorMessage = options.importValidation?.issues.find((issue) => issue.severity === 'error')?.message ?? null;
  const checks: TenderDraftQualityGateCheck[] = [
    {
      key: 'content',
      label: 'Luonnospaketin ydinsisältö',
      state: readiness.canGenerate ? 'ready' : 'blocked',
      detail: readiness.blockedReason ?? 'Hyväksytty ydinsisältö riittää editoriviennin pohjaksi.',
    },
    {
      key: 'draft-status',
      label: 'Draft package -tila',
      state:
        !options.selectedDraftPackage
          ? 'blocked'
          : options.selectedDraftPackage.status === 'draft'
            ? 'blocked'
            : 'ready',
      detail:
        !options.selectedDraftPackage
          ? 'Valitse draft package ennen editorivientiä.'
          : options.selectedDraftPackage.status === 'draft'
            ? 'Merkitse draft package tarkistetuksi ennen editorivientiä.'
            : 'Draft package on merkitty tarkistetuksi tai viedyksi.',
    },
    {
      key: 'go-no-go',
      label: 'Go / No-Go',
      state: decision.state,
      detail: decisionDetail,
    },
    {
      key: 'import-validation',
      label: 'Import-validointi',
      state:
        !options.importValidation
          ? 'blocked'
          : options.importValidation.can_import
            ? options.importValidation.warning_count > 0 ? 'warning' : 'ready'
            : 'blocked',
      detail:
        !options.importValidation
          ? 'Import-previewtä ei ole vielä ladattu tälle luonnospaketille.'
          : options.importValidation.can_import
            ? options.importValidation.warning_count > 0
              ? `${options.importValidation.warning_count} varoitusta jäi vielä tarkistettavaksi ennen importia.`
              : 'Import-validointi sallii editoriviennin ilman virheitä.'
            : importErrorMessage ?? 'Import-validointi estää editoriviennin.',
    },
    {
      key: 'workflow',
      label: 'Avoimet workflow-rivit',
      state: readiness.unresolvedItemCount > 0 ? 'warning' : 'ready',
      detail:
        readiness.unresolvedItemCount > 0
          ? `Paketissa on ${readiness.unresolvedItemCount} avointa tai tarkistamatonta workflow-riviä.`
          : 'Review-workflow ei sisällä enää avoimia vientiä estäviä rivejä.',
    },
    {
      key: 'reimport-safety',
      label: 'Re-import turvallisuus',
      state:
        !options.draftPackageImportState || options.draftPackageImportState.suggested_import_mode === 'create_new_quote'
          ? 'ready'
          : (
            !options.draftPackageImportState.safe_reimport_now
            || options.draftPackageImportState.manual_quote_edit_detected
            || options.draftPackageImportState.conflict_block_count > 0
            || options.draftPackageImportState.registry_warning_count > 0
          )
            ? 'warning'
            : 'ready',
      detail:
        !options.draftPackageImportState
          ? 'Import-stateä ei ole vielä muodostettu tälle luonnospaketille.'
          : options.draftPackageImportState.suggested_import_mode === 'create_new_quote'
            ? 'Ensimmäinen import menee uuden quoten luontiin ilman re-import-riskiä.'
            : (
              !options.draftPackageImportState.safe_reimport_now
              || options.draftPackageImportState.manual_quote_edit_detected
              || options.draftPackageImportState.conflict_block_count > 0
              || options.draftPackageImportState.registry_warning_count > 0
            )
              ? 'Re-import on mahdollinen, mutta quote-puolella on manuaalimuutoksia, konflikteja tai registry-varoituksia jotka kannattaa tarkistaa.'
              : 'Re-import näyttää turvalliselta nykyisen registry- ja drift-tiedon perusteella.',
    },
  ];

  const state: TenderDraftQualityGateState = checks.some((check) => check.state === 'blocked')
    ? 'blocked'
    : checks.some((check) => check.state === 'warning')
      ? 'warning'
      : 'ready';

  const nextActions = [
    ...(!options.selectedDraftPackage ? ['Valitse tai muodosta draft package ennen editorivientiä.'] : []),
    ...(options.selectedDraftPackage?.status === 'draft' ? ['Merkitse draft package tarkistetuksi ennen editorivientiä.'] : []),
    ...(!readiness.canGenerate ? ['Hyväksy vähintään yksi vaatimus, referenssi tai draft artefakti mukaan luonnospaketin ydinsisällöksi.'] : []),
    ...decision.nextActions,
    ...(!options.importValidation ? ['Lataa import-preview ja validointi ennen editorivientiä.'] : []),
    ...(options.importValidation && !options.importValidation.can_import ? ['Korjaa import-validoinnin estävät virheet ennen editorivientiä.'] : []),
    ...(readiness.unresolvedItemCount > 0 ? ['Käy avoimet workflow-rivit läpi ennen editorivientiä.'] : []),
  ];

  return {
    state,
    summary:
      state === 'ready'
        ? 'Luonnospaketti näyttää valmiilta editorivientiin nykyisen datan perusteella.'
        : state === 'blocked'
          ? checks.find((check) => check.state === 'blocked')?.detail ?? 'Editorivienti on vielä estetty.'
          : 'Editorivienti on mahdollinen, mutta alla olevat kohdat kannattaa tarkistaa ennen importia.',
    checks,
    nextActions: [...new Set(nextActions)],
    canExportToEditor: !checks.some((check) => check.state === 'blocked'),
  };
}
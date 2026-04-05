import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';

import { getTenderIntelligenceRepository } from '../services/tender-intelligence-repository';
import type {
  TenderDraftPackageImportRun,
  TenderDraftPackageImportState,
  TenderEditorImportPreview,
  TenderEditorImportResult,
  TenderEditorReconciliationPreview,
  TenderEditorImportValidationResult,
} from '../types/tender-editor-import';
import type {
  TenderDraftPackage,
  CreateTenderReferenceProfileInput,
  CreateTenderPackageInput,
  TenderAnalysisJob,
  TenderDocument,
  TenderDocumentExtraction,
  TenderPackage,
  TenderPackageDetails,
  TenderReferenceProfile,
  UpdateTenderDraftPackageItemInput,
  UpdateTenderReferenceProfileInput,
  UpdateTenderWorkflowInput,
} from '../types/tender-intelligence';

export interface TenderDocumentsUploadFailure {
  fileName: string;
  message: string;
}

export interface TenderDocumentsUploadResult {
  uploaded: TenderDocument[];
  failed: TenderDocumentsUploadFailure[];
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Tarjousälyn dataa ei voitu ladata.';
}

export function useTenderIntelligence() {
  const { user, users } = useAuth();
  const repository = useMemo(() => getTenderIntelligenceRepository(), []);
  const [packages, setPackages] = useState<TenderPackage[]>([]);
  const [draftPackages, setDraftPackages] = useState<TenderDraftPackage[]>([]);
  const [referenceProfiles, setReferenceProfiles] = useState<TenderReferenceProfile[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedDraftPackageId, setSelectedDraftPackageId] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<TenderPackageDetails | null>(null);
  const [editorImportPreview, setEditorImportPreview] = useState<TenderEditorImportPreview | null>(null);
  const [editorImportValidation, setEditorImportValidation] = useState<TenderEditorImportValidationResult | null>(null);
  const [draftPackageImportState, setDraftPackageImportState] = useState<TenderDraftPackageImportState | null>(null);
  const [draftPackageReimportPreview, setDraftPackageReimportPreview] = useState<TenderEditorReconciliationPreview | null>(null);
  const [draftPackageImportRuns, setDraftPackageImportRuns] = useState<TenderDraftPackageImportRun[]>([]);
  const [selectedPackageMissing, setSelectedPackageMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingDraftPackagePackageId, setCreatingDraftPackagePackageId] = useState<string | null>(null);
  const [previewingEditorImportDraftPackageId, setPreviewingEditorImportDraftPackageId] = useState<string | null>(null);
  const [importingDraftPackageId, setImportingDraftPackageId] = useState<string | null>(null);
  const [updatingDraftPackageItemIds, setUpdatingDraftPackageItemIds] = useState<string[]>([]);
  const [reviewingDraftPackageId, setReviewingDraftPackageId] = useState<string | null>(null);
  const [exportingDraftPackageId, setExportingDraftPackageId] = useState<string | null>(null);
  const [referenceProfileSubmittingId, setReferenceProfileSubmittingId] = useState<string | 'new' | null>(null);
  const [deletingReferenceProfileIds, setDeletingReferenceProfileIds] = useState<string[]>([]);
  const [startingAnalysisPackageId, setStartingAnalysisPackageId] = useState<string | null>(null);
  const [extractingPackageId, setExtractingPackageId] = useState<string | null>(null);
  const [extractingDocumentIds, setExtractingDocumentIds] = useState<string[]>([]);
  const [deletingDocumentIds, setDeletingDocumentIds] = useState<string[]>([]);
  const [workflowUpdatingTargetIds, setWorkflowUpdatingTargetIds] = useState<string[]>([]);
  const [recomputingReferenceSuggestionPackageId, setRecomputingReferenceSuggestionPackageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasOrganizationContext = Boolean(user?.organizationId);
  const actorNameById = useMemo(() => {
    const entries = new Map<string, string>();

    users.forEach((nextUser) => {
      entries.set(nextUser.id, nextUser.displayName);
    });

    if (user) {
      entries.set(user.id, user.displayName);
    }

    return Object.fromEntries(entries);
  }, [user, users]);

  const loadPackages = useCallback(async () => {
    const nextPackages = await repository.listTenderPackages();
    setPackages(nextPackages);
    setSelectedPackageId((currentId) => {
      if (currentId && nextPackages.some((item) => item.id === currentId)) {
        return currentId;
      }

      return nextPackages[0]?.id ?? null;
    });
    return nextPackages;
  }, [repository]);

  const loadReferenceProfiles = useCallback(async () => {
    const nextReferenceProfiles = await repository.listReferenceProfiles();
    setReferenceProfiles(nextReferenceProfiles);
    return nextReferenceProfiles;
  }, [repository]);

  const loadDraftPackages = useCallback(async (packageId: string | null) => {
    if (!hasOrganizationContext || !packageId) {
      setDraftPackages([]);
      setSelectedDraftPackageId(null);
      return [];
    }

    const nextDraftPackages = await repository.listDraftPackagesForTenderPackage(packageId);
    setDraftPackages(nextDraftPackages);
    setSelectedDraftPackageId((currentId) => {
      if (currentId && nextDraftPackages.some((item) => item.id === currentId)) {
        return currentId;
      }

      return nextDraftPackages[0]?.id ?? null;
    });
    return nextDraftPackages;
  }, [hasOrganizationContext, repository]);

  const loadSelectedPackage = useCallback(
    async (packageId: string | null) => {
      if (!hasOrganizationContext) {
        setSelectedPackage(null);
        setSelectedPackageMissing(false);
        return null;
      }

      if (!packageId) {
        setSelectedPackage(null);
        setSelectedPackageMissing(false);
        return null;
      }

      const nextPackage = await repository.getTenderPackageById(packageId);
      setSelectedPackage(nextPackage);
      setSelectedPackageMissing(!nextPackage);
      return nextPackage;
    },
    [hasOrganizationContext, repository]
  );

  useEffect(() => {
    let active = true;

    if (!hasOrganizationContext) {
      setPackages([]);
      setDraftPackages([]);
      setReferenceProfiles([]);
      setSelectedPackage(null);
      setSelectedPackageId(null);
      setSelectedDraftPackageId(null);
      setSelectedPackageMissing(false);
      setError('Tarjousäly vaatii organisaatioon liitetyn käyttäjätilin.');
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const hydrate = async (background = false) => {
      try {
        if (active && !background) {
          setLoading(true);
        }

        const [nextPackages] = await Promise.all([loadPackages(), loadReferenceProfiles()]);

        if (active) {
          const nextSelectedPackageId = selectedPackageId && nextPackages.some((item) => item.id === selectedPackageId)
            ? selectedPackageId
            : nextPackages[0]?.id ?? null;
          await Promise.all([loadSelectedPackage(nextSelectedPackageId), loadDraftPackages(nextSelectedPackageId)]);
        }

        if (active) {
          setError(null);
        }
      } catch (nextError) {
        if (active) {
          setError(getErrorMessage(nextError));
        }
      } finally {
        if (active && !background) {
          setLoading(false);
        }
      }
    };

    const unsubscribe = repository.subscribe(() => {
      void hydrate(true);
    });

    void hydrate(false);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [hasOrganizationContext, loadDraftPackages, loadPackages, loadReferenceProfiles, loadSelectedPackage, repository, selectedPackageId]);

  useEffect(() => {
    let active = true;

    const hydrateSelectedPackage = async () => {
      try {
        await Promise.all([loadSelectedPackage(selectedPackageId), loadDraftPackages(selectedPackageId)]);
      } catch (nextError) {
        if (active) {
          setError(getErrorMessage(nextError));
        }
      }
    };

    void hydrateSelectedPackage();

    return () => {
      active = false;
    };
  }, [loadDraftPackages, loadSelectedPackage, selectedPackageId]);

  useEffect(() => {
    let active = true;

    if (!selectedDraftPackageId) {
      setEditorImportPreview(null);
      setEditorImportValidation(null);
      setDraftPackageImportState(null);
      setDraftPackageReimportPreview(null);
      setDraftPackageImportRuns([]);
      setPreviewingEditorImportDraftPackageId(null);
      return () => {
        active = false;
      };
    }

    const hydrateEditorImportPreview = async () => {
      try {
        setPreviewingEditorImportDraftPackageId(selectedDraftPackageId);
        const [preview, validation, importState, reimportPreview, importRuns] = await Promise.all([
          repository.previewEditorImportForDraftPackage(selectedDraftPackageId),
          repository.validateEditorImportForDraftPackage(selectedDraftPackageId),
          repository.getDraftPackageImportStatus(selectedDraftPackageId),
          repository.previewDraftPackageReimport(selectedDraftPackageId),
          repository.listDraftPackageImportRuns(selectedDraftPackageId),
        ]);

        if (active) {
          setEditorImportPreview(preview);
          setEditorImportValidation(validation);
          setDraftPackageImportState(importState);
          setDraftPackageReimportPreview(reimportPreview);
          setDraftPackageImportRuns(importRuns);
          setError(null);
        }
      } catch (nextError) {
        if (active) {
          setEditorImportPreview(null);
          setEditorImportValidation(null);
          setDraftPackageImportState(null);
          setDraftPackageReimportPreview(null);
          setDraftPackageImportRuns([]);
          setError(getErrorMessage(nextError));
        }
      } finally {
        if (active) {
          setPreviewingEditorImportDraftPackageId((current) => (current === selectedDraftPackageId ? null : current));
        }
      }
    };

    void hydrateEditorImportPreview();

    return () => {
      active = false;
    };
  }, [repository, selectedDraftPackageId]);

  const createPackage = useCallback(
    async (input: CreateTenderPackageInput) => {
      if (!hasOrganizationContext) {
        const message = 'Tarjousäly vaatii organisaatioon liitetyn käyttäjätilin.';
        setError(message);
        throw new Error(message);
      }

      setCreating(true);

      try {
        const createdPackage = await repository.createTenderPackage(input);
        setSelectedPackageId(createdPackage.package.id);
        await loadPackages();
        await loadSelectedPackage(createdPackage.package.id);
        setError(null);
        return createdPackage;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setCreating(false);
      }
    },
    [hasOrganizationContext, loadPackages, loadSelectedPackage, repository]
  );

  const uploadDocuments = useCallback(
    async (packageId: string, files: File[]): Promise<TenderDocumentsUploadResult> => {
      if (!hasOrganizationContext) {
        const message = 'Tarjousäly vaatii organisaatioon liitetyn käyttäjätilin.';
        setError(message);
        throw new Error(message);
      }

      const nextFiles = files.filter(Boolean);
      if (nextFiles.length === 0) {
        return { uploaded: [], failed: [] };
      }

      setUploading(true);

      try {
        const result: TenderDocumentsUploadResult = {
          uploaded: [],
          failed: [],
        };

        for (const file of nextFiles) {
          try {
            const uploadedDocument = await repository.uploadTenderDocument(packageId, file);
            result.uploaded.push(uploadedDocument);
          } catch (nextError) {
            result.failed.push({
              fileName: file.name || 'Nimetön tiedosto',
              message: getErrorMessage(nextError),
            });
          }
        }

        await loadPackages();
        await loadSelectedPackage(packageId);

        if (result.failed.length > 0) {
          setError(result.failed[0].message);
        } else {
          setError(null);
        }

        return result;
      } finally {
        setUploading(false);
      }
    },
    [hasOrganizationContext, loadPackages, loadSelectedPackage, repository]
  );

  const deleteDocument = useCallback(
    async (documentId: string) => {
      setDeletingDocumentIds((current) => (current.includes(documentId) ? current : [...current, documentId]));

      try {
        await repository.deleteTenderDocument(documentId);
        await loadPackages();
        await loadSelectedPackage(selectedPackageId);
        setError(null);
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setDeletingDocumentIds((current) => current.filter((item) => item !== documentId));
      }
    },
    [loadPackages, loadSelectedPackage, repository, selectedPackageId]
  );

  const startAnalysis = useCallback(
    async (packageId: string): Promise<TenderAnalysisJob> => {
      if (!hasOrganizationContext) {
        const message = 'Tarjousäly vaatii organisaatioon liitetyn käyttäjätilin.';
        setError(message);
        throw new Error(message);
      }

      setStartingAnalysisPackageId(packageId);

      try {
        const completedJob = await repository.startPlaceholderAnalysis(packageId);
        await loadPackages();
        await loadSelectedPackage(packageId);
        setError(null);
        return completedJob;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setStartingAnalysisPackageId((current) => (current === packageId ? null : current));
      }
    },
    [hasOrganizationContext, loadPackages, loadSelectedPackage, repository]
  );

  const startDocumentExtraction = useCallback(
    async (packageId: string, documentId: string): Promise<TenderDocumentExtraction> => {
      if (!hasOrganizationContext) {
        const message = 'Tarjousäly vaatii organisaatioon liitetyn käyttäjätilin.';
        setError(message);
        throw new Error(message);
      }

      setExtractingDocumentIds((current) => (current.includes(documentId) ? current : [...current, documentId]));

      try {
        const extraction = await repository.startDocumentExtraction(packageId, documentId);
        await loadSelectedPackage(packageId);
        setError(null);
        return extraction;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setExtractingDocumentIds((current) => current.filter((item) => item !== documentId));
      }
    },
    [hasOrganizationContext, loadSelectedPackage, repository]
  );

  const startPackageExtraction = useCallback(
    async (packageId: string): Promise<TenderDocumentExtraction[]> => {
      if (!hasOrganizationContext) {
        const message = 'Tarjousäly vaatii organisaatioon liitetyn käyttäjätilin.';
        setError(message);
        throw new Error(message);
      }

      setExtractingPackageId(packageId);

      try {
        const packageDetails = selectedPackage?.package.id === packageId
          ? selectedPackage
          : await repository.getTenderPackageById(packageId);
        const candidateDocuments = (packageDetails?.documents ?? []).filter(
          (document) => document.uploadState === 'uploaded' && Boolean(document.storagePath)
        );

        if (candidateDocuments.length === 0) {
          return [];
        }

        const results: TenderDocumentExtraction[] = [];
        let firstFailure: string | null = null;

        for (const document of candidateDocuments) {
          setExtractingDocumentIds((current) => (current.includes(document.id) ? current : [...current, document.id]));

          try {
            const extraction = await repository.startDocumentExtraction(packageId, document.id);
            results.push(extraction);
          } catch (nextError) {
            firstFailure ??= getErrorMessage(nextError);
          } finally {
            setExtractingDocumentIds((current) => current.filter((item) => item !== document.id));
          }
        }

        await loadSelectedPackage(packageId);
        setError(firstFailure);
        return results;
      } finally {
        setExtractingPackageId((current) => (current === packageId ? null : current));
      }
    },
    [hasOrganizationContext, loadSelectedPackage, repository, selectedPackage]
  );

  const runWorkflowUpdate = useCallback(
    async <TResult extends { packageId: string }>(targetId: string, updater: () => Promise<TResult>) => {
      setWorkflowUpdatingTargetIds((current) => (current.includes(targetId) ? current : [...current, targetId]));

      try {
        const updated = await updater();
        await loadSelectedPackage(updated.packageId);
        setError(null);
        return updated;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setWorkflowUpdatingTargetIds((current) => current.filter((item) => item !== targetId));
      }
    },
    [loadSelectedPackage],
  );

  const refreshReferenceSuggestionsForPackage = useCallback(
    async (packageId: string) => {
      setRecomputingReferenceSuggestionPackageId(packageId);

      try {
        const suggestions = await repository.recomputeReferenceSuggestionsForPackage(packageId);
        await loadSelectedPackage(packageId);
        setError(null);
        return suggestions;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setRecomputingReferenceSuggestionPackageId((current) => (current === packageId ? null : current));
      }
    },
    [loadSelectedPackage, repository],
  );

  const refreshSelectedPackageReferenceSuggestions = useCallback(
    async () => {
      if (!selectedPackageId) {
        return [];
      }

      return refreshReferenceSuggestionsForPackage(selectedPackageId);
    },
    [refreshReferenceSuggestionsForPackage, selectedPackageId],
  );

  const updateRequirementWorkflow = useCallback(
    async (requirementId: string, input: UpdateTenderWorkflowInput) =>
      runWorkflowUpdate(`requirement:${requirementId}`, () => repository.updateRequirementWorkflow(requirementId, input)),
    [repository, runWorkflowUpdate],
  );

  const updateMissingItemWorkflow = useCallback(
    async (missingItemId: string, input: UpdateTenderWorkflowInput) =>
      runWorkflowUpdate(`missing_item:${missingItemId}`, () => repository.updateMissingItemWorkflow(missingItemId, input)),
    [repository, runWorkflowUpdate],
  );

  const updateRiskFlagWorkflow = useCallback(
    async (riskFlagId: string, input: UpdateTenderWorkflowInput) =>
      runWorkflowUpdate(`risk_flag:${riskFlagId}`, () => repository.updateRiskFlagWorkflow(riskFlagId, input)),
    [repository, runWorkflowUpdate],
  );

  const updateReferenceSuggestionWorkflow = useCallback(
    async (referenceSuggestionId: string, input: UpdateTenderWorkflowInput) =>
      runWorkflowUpdate(
        `reference_suggestion:${referenceSuggestionId}`,
        () => repository.updateReferenceSuggestionWorkflow(referenceSuggestionId, input),
      ),
    [repository, runWorkflowUpdate],
  );

  const updateReviewTaskWorkflow = useCallback(
    async (reviewTaskId: string, input: UpdateTenderWorkflowInput) =>
      runWorkflowUpdate(`review_task:${reviewTaskId}`, () => repository.updateReviewTaskWorkflow(reviewTaskId, input)),
    [repository, runWorkflowUpdate],
  );

  const createReferenceProfile = useCallback(
    async (input: CreateTenderReferenceProfileInput) => {
      setReferenceProfileSubmittingId('new');

      try {
        const created = await repository.createReferenceProfile(input);
        await loadReferenceProfiles();
        await refreshSelectedPackageReferenceSuggestions();
        setError(null);
        return created;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setReferenceProfileSubmittingId(null);
      }
    },
    [loadReferenceProfiles, refreshSelectedPackageReferenceSuggestions, repository],
  );

  const updateReferenceProfile = useCallback(
    async (profileId: string, input: UpdateTenderReferenceProfileInput) => {
      setReferenceProfileSubmittingId(profileId);

      try {
        const updated = await repository.updateReferenceProfile(profileId, input);
        await loadReferenceProfiles();
        await refreshSelectedPackageReferenceSuggestions();
        setError(null);
        return updated;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setReferenceProfileSubmittingId((current) => (current === profileId ? null : current));
      }
    },
    [loadReferenceProfiles, refreshSelectedPackageReferenceSuggestions, repository],
  );

  const deleteReferenceProfile = useCallback(
    async (profileId: string) => {
      setDeletingReferenceProfileIds((current) => (current.includes(profileId) ? current : [...current, profileId]));

      try {
        await repository.deleteReferenceProfile(profileId);
        await loadReferenceProfiles();
        await refreshSelectedPackageReferenceSuggestions();
        setError(null);
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setDeletingReferenceProfileIds((current) => current.filter((item) => item !== profileId));
      }
    },
    [loadReferenceProfiles, refreshSelectedPackageReferenceSuggestions, repository],
  );

  const createDraftPackage = useCallback(
    async (packageId: string) => {
      setCreatingDraftPackagePackageId(packageId);

      try {
        const created = await repository.createDraftPackageFromReviewedResults(packageId);
        setSelectedDraftPackageId(created.id);
        await loadDraftPackages(packageId);
        setError(null);
        return created;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setCreatingDraftPackagePackageId((current) => (current === packageId ? null : current));
      }
    },
    [loadDraftPackages, repository],
  );

  const updateDraftPackageItem = useCallback(
    async (itemId: string, input: UpdateTenderDraftPackageItemInput) => {
      setUpdatingDraftPackageItemIds((current) => (current.includes(itemId) ? current : [...current, itemId]));

      try {
        const updated = await repository.updateDraftPackageItem(itemId, input);
        setSelectedDraftPackageId(updated.id);
        await loadDraftPackages(updated.tenderPackageId);
        setError(null);
        return updated;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setUpdatingDraftPackageItemIds((current) => current.filter((candidate) => candidate !== itemId));
      }
    },
    [loadDraftPackages, repository],
  );

  const markDraftPackageReviewed = useCallback(
    async (draftPackageId: string) => {
      setReviewingDraftPackageId(draftPackageId);

      try {
        const updated = await repository.markDraftPackageReviewed(draftPackageId);
        setSelectedDraftPackageId(updated.id);
        await loadDraftPackages(updated.tenderPackageId);
        setError(null);
        return updated;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setReviewingDraftPackageId((current) => (current === draftPackageId ? null : current));
      }
    },
    [loadDraftPackages, repository],
  );

  const markDraftPackageExported = useCallback(
    async (draftPackageId: string) => {
      setExportingDraftPackageId(draftPackageId);

      try {
        const updated = await repository.markDraftPackageExported(draftPackageId);
        setSelectedDraftPackageId(updated.id);
        await loadDraftPackages(updated.tenderPackageId);
        setError(null);
        return updated;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setExportingDraftPackageId((current) => (current === draftPackageId ? null : current));
      }
    },
    [loadDraftPackages, repository],
  );

  const importDraftPackageToEditor = useCallback(
    async (draftPackageId: string): Promise<TenderEditorImportResult> => {
      setImportingDraftPackageId(draftPackageId);

      try {
        const result = await repository.importDraftPackageToEditor(draftPackageId);
        const packageId = selectedPackage?.package.id ?? selectedPackageId;

        if (packageId) {
          await Promise.all([loadDraftPackages(packageId), loadSelectedPackage(packageId)]);
        }

        setError(null);
        return result;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setImportingDraftPackageId((current) => (current === draftPackageId ? null : current));
      }
    },
    [loadDraftPackages, loadSelectedPackage, repository, selectedPackage, selectedPackageId],
  );

  const reimportDraftPackageToEditor = useCallback(
    async (draftPackageId: string): Promise<TenderEditorImportResult> => {
      setImportingDraftPackageId(draftPackageId);

      try {
        const result = await repository.reimportDraftPackageToEditor(draftPackageId);
        const packageId = selectedPackage?.package.id ?? selectedPackageId;

        if (packageId) {
          await Promise.all([loadDraftPackages(packageId), loadSelectedPackage(packageId)]);
        }

        setError(null);
        return result;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setImportingDraftPackageId((current) => (current === draftPackageId ? null : current));
      }
    },
    [loadDraftPackages, loadSelectedPackage, repository, selectedPackage, selectedPackageId],
  );

  const overview = useMemo(
    () => ({
      packages: packages.length,
      referenceProfiles: referenceProfiles.length,
      openReviewTasks: packages.reduce((sum, item) => sum + item.summary.reviewTaskCount, 0),
      openRisks: packages.reduce((sum, item) => sum + item.summary.riskCount, 0),
      documents: packages.reduce((sum, item) => sum + item.summary.documentCount, 0),
    }),
    [packages, referenceProfiles]
  );

  return {
    packages,
    draftPackages,
    editorImportPreview,
    editorImportValidation,
    draftPackageImportState,
    draftPackageReimportPreview,
    draftPackageImportRuns,
    referenceProfiles,
    selectedPackage,
    selectedPackageId,
    selectedDraftPackageId,
    selectedPackageMissing,
    loading,
    creating,
    uploading,
    creatingDraftPackagePackageId,
    previewingEditorImportDraftPackageId,
    importingDraftPackageId,
    updatingDraftPackageItemIds,
    reviewingDraftPackageId,
    exportingDraftPackageId,
    referenceProfileSubmittingId,
    deletingReferenceProfileIds,
    startingAnalysisPackageId,
    extractingPackageId,
    extractingDocumentIds,
    deletingDocumentIds,
    workflowUpdatingTargetIds,
    recomputingReferenceSuggestionPackageId,
    error,
    overview,
    canCreate: hasOrganizationContext,
    actorNameById,
    currentUserId: user?.id ?? null,
    hasPackages: packages.length > 0,
    selectPackage: setSelectedPackageId,
    selectDraftPackage: setSelectedDraftPackageId,
    createPackage,
    startAnalysis,
    startDocumentExtraction,
    startPackageExtraction,
    uploadDocuments,
    deleteDocument,
    createDraftPackage,
    importDraftPackageToEditor,
    reimportDraftPackageToEditor,
    updateDraftPackageItem,
    markDraftPackageReviewed,
    markDraftPackageExported,
    createReferenceProfile,
    updateReferenceProfile,
    deleteReferenceProfile,
    recomputeReferenceSuggestions: refreshReferenceSuggestionsForPackage,
    updateRequirementWorkflow,
    updateMissingItemWorkflow,
    updateRiskFlagWorkflow,
    updateReferenceSuggestionWorkflow,
    updateReviewTaskWorkflow,
  };
}
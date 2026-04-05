import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';

import { getTenderIntelligenceRepository } from '../services/tender-intelligence-repository';
import type {
  CreateTenderPackageInput,
  TenderAnalysisJob,
  TenderDocument,
  TenderDocumentExtraction,
  TenderPackage,
  TenderPackageDetails,
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
  const { user } = useAuth();
  const repository = useMemo(() => getTenderIntelligenceRepository(), []);
  const [packages, setPackages] = useState<TenderPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<TenderPackageDetails | null>(null);
  const [selectedPackageMissing, setSelectedPackageMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [startingAnalysisPackageId, setStartingAnalysisPackageId] = useState<string | null>(null);
  const [extractingPackageId, setExtractingPackageId] = useState<string | null>(null);
  const [extractingDocumentIds, setExtractingDocumentIds] = useState<string[]>([]);
  const [deletingDocumentIds, setDeletingDocumentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const hasOrganizationContext = Boolean(user?.organizationId);

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
      setSelectedPackage(null);
      setSelectedPackageId(null);
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

        const nextPackages = await loadPackages();

        if (active) {
          const nextSelectedPackageId = selectedPackageId && nextPackages.some((item) => item.id === selectedPackageId)
            ? selectedPackageId
            : nextPackages[0]?.id ?? null;
          await loadSelectedPackage(nextSelectedPackageId);
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
  }, [hasOrganizationContext, loadPackages, loadSelectedPackage, repository, selectedPackageId]);

  useEffect(() => {
    let active = true;

    const hydrateSelectedPackage = async () => {
      try {
        await loadSelectedPackage(selectedPackageId);
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
  }, [loadSelectedPackage, selectedPackageId]);

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

  const overview = useMemo(
    () => ({
      packages: packages.length,
      openReviewTasks: packages.reduce((sum, item) => sum + item.summary.reviewTaskCount, 0),
      openRisks: packages.reduce((sum, item) => sum + item.summary.riskCount, 0),
      documents: packages.reduce((sum, item) => sum + item.summary.documentCount, 0),
    }),
    [packages]
  );

  return {
    packages,
    selectedPackage,
    selectedPackageId,
    selectedPackageMissing,
    loading,
    creating,
    uploading,
    startingAnalysisPackageId,
    extractingPackageId,
    extractingDocumentIds,
    deletingDocumentIds,
    error,
    overview,
    canCreate: hasOrganizationContext,
    hasPackages: packages.length > 0,
    selectPackage: setSelectedPackageId,
    createPackage,
    startAnalysis,
    startDocumentExtraction,
    startPackageExtraction,
    uploadDocuments,
    deleteDocument,
  };
}
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';

import { getTenderIntelligenceRepository } from '../services/tender-intelligence-repository';
import type { CreateTenderPackageInput, TenderPackage, TenderPackageDetails } from '../types/tender-intelligence';

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

    const hydrate = async () => {
      try {
        if (active) {
          setLoading(true);
        }

        await loadPackages();

        if (active) {
          setError(null);
        }
      } catch (nextError) {
        if (active) {
          setError(getErrorMessage(nextError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const unsubscribe = repository.subscribe(() => {
      void hydrate();
    });

    void hydrate();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [hasOrganizationContext, loadPackages, repository]);

  useEffect(() => {
    let active = true;

    const hydrateSelectedPackage = async () => {
      if (!hasOrganizationContext) {
        setSelectedPackage(null);
        setSelectedPackageMissing(false);
        return;
      }

      if (!selectedPackageId) {
        setSelectedPackage(null);
        setSelectedPackageMissing(false);
        return;
      }

      try {
        const nextPackage = await repository.getTenderPackageById(selectedPackageId);

        if (active) {
          setSelectedPackage(nextPackage);
          setSelectedPackageMissing(!nextPackage);
        }
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
  }, [hasOrganizationContext, repository, selectedPackageId]);

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
        setSelectedPackage(createdPackage);
        setSelectedPackageMissing(false);
        await loadPackages();
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
    [hasOrganizationContext, loadPackages, repository]
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
    error,
    overview,
    canCreate: hasOrganizationContext,
    hasPackages: packages.length > 0,
    selectPackage: setSelectedPackageId,
    createPackage,
  };
}
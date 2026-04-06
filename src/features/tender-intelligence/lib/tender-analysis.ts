import {
  getTenderDocumentExtractionSupport,
  resolveTenderDocumentExtractionStatus,
} from './tender-document-extraction';
import type {
  TenderAnalysisJob,
  TenderAnalysisJobStatus,
  TenderAnalysisReadiness,
  TenderDocument,
  TenderDocumentExtraction,
  TenderExtractionCoverage,
} from '../types/tender-intelligence';

export interface TenderAnalysisStartState {
  canStart: boolean;
  reason: string | null;
}

export function buildTenderExtractionCoverage(input: {
  documents: TenderDocument[];
  documentExtractions: TenderDocumentExtraction[];
}): TenderExtractionCoverage {
  const extractionByDocumentId = new Map(input.documentExtractions.map((item) => [item.documentId, item]));
  const coverage: TenderExtractionCoverage = {
    totalDocuments: input.documents.length,
    uploadedDocuments: 0,
    supportedDocuments: 0,
    extractedDocuments: 0,
    extractedChunks: 0,
    pendingExtractions: 0,
    failedExtractions: 0,
    unsupportedDocuments: 0,
    documentsNeedingExtraction: 0,
  };

  input.documents.forEach((document) => {
    const extraction = extractionByDocumentId.get(document.id) ?? null;
    const isUploaded = document.uploadState === 'uploaded' && Boolean(document.storagePath);

    if (isUploaded) {
      coverage.uploadedDocuments += 1;
    }

    if (!isUploaded) {
      return;
    }

    const extractionStatus = resolveTenderDocumentExtractionStatus(extraction?.extractionStatus);
    const support = getTenderDocumentExtractionSupport(extraction?.sourceMimeType ?? document.mimeType);

    if (extractionStatus === 'unsupported' || !support.supported) {
      coverage.unsupportedDocuments += 1;
      return;
    }

    coverage.supportedDocuments += 1;

    if (extractionStatus === 'extracted') {
      coverage.extractedDocuments += 1;
      coverage.extractedChunks += Math.max(0, extraction?.chunkCount ?? 0);
      return;
    }

    if (extractionStatus === 'pending' || extractionStatus === 'extracting') {
      coverage.pendingExtractions += 1;
      return;
    }

    if (extractionStatus === 'failed') {
      coverage.failedExtractions += 1;
      return;
    }

    coverage.documentsNeedingExtraction += 1;
  });

  return coverage;
}

export function buildTenderAnalysisReadiness(input: {
  documents: TenderDocument[];
  documentExtractions: TenderDocumentExtraction[];
  latestAnalysisJob?: TenderAnalysisJob | null;
}): TenderAnalysisReadiness {
  const coverage = buildTenderExtractionCoverage({
    documents: input.documents,
    documentExtractions: input.documentExtractions,
  });

  if (coverage.totalDocuments < 1) {
    return {
      canStart: false,
      blockedReason: 'Lisää pakettiin vähintään yksi dokumentti ennen analyysin käynnistämistä.',
      coverage,
    };
  }

  if (input.latestAnalysisJob && isTenderAnalysisJobActive(input.latestAnalysisJob.status)) {
    return {
      canStart: false,
      blockedReason: 'Paketille on jo käynnissä analyysiajo. Odota nykyisen ajon valmistumista.',
      coverage,
    };
  }

  if (coverage.supportedDocuments < 1) {
    return {
      canStart: false,
      blockedReason: 'Analyysi tarvitsee vähintään yhden tuetun TXT-, Markdown-, CSV-, PDF-, DOCX- tai XLSX-dokumentin, jolle extraction voidaan suorittaa.',
      coverage,
    };
  }

  if (coverage.pendingExtractions > 0) {
    return {
      canStart: false,
      blockedReason: 'Odota käynnissä olevan extractionin valmistumista ennen analyysin käynnistämistä.',
      coverage,
    };
  }

  if (coverage.extractedDocuments < 1) {
    return {
      canStart: false,
      blockedReason:
        coverage.documentsNeedingExtraction > 0
          ? 'Käynnistä extraction vähintään yhdelle tuetulle dokumentille ennen analyysin käynnistämistä.'
          : 'Yhdestäkään tuetusta dokumentista ei ole vielä onnistunutta extractionia. Korjaa extraction-virheet tai pura dokumentti uudelleen.',
      coverage,
    };
  }

  if (coverage.extractedChunks < 1) {
    return {
      canStart: false,
      blockedReason: 'Puretuista dokumenteista ei löytynyt yhtään analyysiin kelpaavaa chunkia, joten evidence-rivejä ei voida muodostaa.',
      coverage,
    };
  }

  return {
    canStart: true,
    blockedReason: null,
    coverage,
  };
}

export function isTenderAnalysisJobActive(status: TenderAnalysisJobStatus) {
  return status === 'pending' || status === 'queued' || status === 'running';
}

export function getTenderAnalysisStartState(input: {
  documentCount?: number;
  documents?: TenderDocument[];
  documentExtractions?: TenderDocumentExtraction[];
  analysisReadiness?: TenderAnalysisReadiness | null;
  latestAnalysisJob?: TenderAnalysisJob | null;
}): TenderAnalysisStartState {
  if (input.analysisReadiness) {
    return {
      canStart: input.analysisReadiness.canStart,
      reason: input.analysisReadiness.blockedReason ?? null,
    };
  }

  if (input.documents && input.documentExtractions) {
    const readiness = buildTenderAnalysisReadiness({
      documents: input.documents,
      documentExtractions: input.documentExtractions,
      latestAnalysisJob: input.latestAnalysisJob,
    });

    return {
      canStart: readiness.canStart,
      reason: readiness.blockedReason ?? null,
    };
  }

  if ((input.documentCount ?? 0) < 1) {
    return {
      canStart: false,
      reason: 'Lisää pakettiin vähintään yksi dokumentti ennen analyysin käynnistämistä.',
    };
  }

  if (input.latestAnalysisJob && isTenderAnalysisJobActive(input.latestAnalysisJob.status)) {
    return {
      canStart: false,
      reason: 'Paketille on jo käynnissä analyysiajo. Odota nykyisen ajon valmistumista.',
    };
  }

  return {
    canStart: true,
    reason: null,
  };
}

export function getLatestSuccessfulTenderAnalysisJob(jobs: TenderAnalysisJob[]) {
  return [...jobs]
    .filter((job) => job.status === 'completed')
    .sort((left, right) => {
      const leftTimestamp = new Date(left.completedAt ?? left.requestedAt).getTime();
      const rightTimestamp = new Date(right.completedAt ?? right.requestedAt).getTime();
      return rightTimestamp - leftTimestamp;
    })[0] ?? null;
}
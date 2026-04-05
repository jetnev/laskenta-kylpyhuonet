export function shouldKeepPendingQuoteEditorOpen(options: {
  pendingCreatedQuoteId: string | null;
  selectedQuoteId: string | null;
  visibleQuoteIds: string[];
}) {
  if (!options.selectedQuoteId) {
    return false;
  }

  if (options.visibleQuoteIds.includes(options.selectedQuoteId)) {
    return true;
  }

  return options.pendingCreatedQuoteId === options.selectedQuoteId;
}
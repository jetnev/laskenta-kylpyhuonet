import type { Quote } from './types';

export type QuoteListSortField = 'updatedAt' | 'title' | 'status';
export type QuoteListSortDirection = 'asc' | 'desc';

export function isShortcutInputTarget(target: EventTarget | null) {
  if (!target || typeof target !== 'object') {
    return false;
  }

  if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
    if (target.isContentEditable || target.closest('[contenteditable="true"]')) {
      return true;
    }

    const tagName = target.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  }

  const candidate = target as { tagName?: string; isContentEditable?: boolean };
  if (candidate.isContentEditable) {
    return true;
  }

  const tagName = candidate.tagName?.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

export function sortQuotesForList(
  quotes: Quote[],
  field: QuoteListSortField,
  direction: QuoteListSortDirection
) {
  const statusOrder: Record<Quote['status'], number> = {
    draft: 0,
    sent: 1,
    accepted: 2,
    rejected: 3,
  };

  return [...quotes].sort((left, right) => {
    const directionFactor = direction === 'asc' ? 1 : -1;

    if (field === 'updatedAt') {
      return (new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()) * directionFactor;
    }

    if (field === 'title') {
      return left.title.localeCompare(right.title, 'fi') * directionFactor;
    }

    const statusDiff = (statusOrder[left.status] - statusOrder[right.status]) * directionFactor;
    if (statusDiff !== 0) {
      return statusDiff;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

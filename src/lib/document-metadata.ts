import { APP_NAME, buildCanonicalUrl } from './site-brand';

interface DocumentMetadataInput {
  title: string;
  description: string;
  pathname?: string;
  siteUrl?: string | null;
  canonicalUrl?: string;
  robots?: string;
  ogType?: 'website' | 'article';
}

function ensureMeta(attribute: 'name' | 'property', key: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.append(element);
  }

  return element;
}

function ensureLink(rel: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.append(element);
  }

  return element;
}

export function applyDocumentMetadata(input: DocumentMetadataInput) {
  if (typeof document === 'undefined') {
    return;
  }

  const canonicalUrl = input.canonicalUrl || buildCanonicalUrl(input.pathname || '/', { siteUrl: input.siteUrl });

  document.title = input.title;

  ensureMeta('name', 'description')?.setAttribute('content', input.description);
  ensureMeta('name', 'robots')?.setAttribute('content', input.robots || 'index,follow');
  ensureMeta('property', 'og:site_name')?.setAttribute('content', APP_NAME);
  ensureMeta('property', 'og:type')?.setAttribute('content', input.ogType || 'website');
  ensureMeta('property', 'og:url')?.setAttribute('content', canonicalUrl);
  ensureMeta('property', 'og:title')?.setAttribute('content', input.title);
  ensureMeta('property', 'og:description')?.setAttribute('content', input.description);
  ensureMeta('name', 'twitter:card')?.setAttribute('content', 'summary');
  ensureMeta('name', 'twitter:title')?.setAttribute('content', input.title);
  ensureMeta('name', 'twitter:description')?.setAttribute('content', input.description);
  ensureLink('canonical')?.setAttribute('href', canonicalUrl);
}
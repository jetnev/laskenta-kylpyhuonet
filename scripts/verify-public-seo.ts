import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PUBLIC_MARKETING_PAGES, PUBLIC_SITE_PATHS } from '../src/lib/public-site';
import { APP_CANONICAL_URL, buildCanonicalUrl } from '../src/lib/site-brand';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const distDirectory = path.resolve(currentDirectory, '../dist');

async function readDistFile(name: string) {
  const filePath = path.join(distDirectory, name);
  return readFile(filePath, 'utf8');
}

function assertContains(content: string, expected: string, context: string) {
  if (!content.includes(expected)) {
    throw new Error(`Missing expected content in ${context}: ${expected}`);
  }
}

async function verifySitemap() {
  const sitemapXml = await readDistFile('sitemap.xml');
  const expectedPaths = [PUBLIC_SITE_PATHS.home, ...PUBLIC_MARKETING_PAGES.map((page) => page.path)];

  assertContains(sitemapXml, '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', 'sitemap.xml');

  for (const routePath of expectedPaths) {
    const canonicalUrl = buildCanonicalUrl(routePath, { siteUrl: APP_CANONICAL_URL });
    assertContains(sitemapXml, `<loc>${canonicalUrl}</loc>`, 'sitemap.xml');
  }
}

async function verifyRobots() {
  const robotsTxt = await readDistFile('robots.txt');
  const expectedLines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /login',
    'Disallow: /auth/',
    'Disallow: /app/',
    'Disallow: /dashboard',
    `Sitemap: ${buildCanonicalUrl('/sitemap.xml', { siteUrl: APP_CANONICAL_URL })}`,
  ];

  for (const line of expectedLines) {
    assertContains(robotsTxt, line, 'robots.txt');
  }
}

async function main() {
  await verifySitemap();
  await verifyRobots();
  console.log('Public SEO assets verified: dist/sitemap.xml and dist/robots.txt');
}

void main();

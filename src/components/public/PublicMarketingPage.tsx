import { useEffect } from 'react';
import { ArrowRight, CheckCircle } from '@phosphor-icons/react';

import { applyDocumentMetadata } from '../../lib/document-metadata';
import { getPublicPageStructuredData, type PublicMarketingPageDefinition } from '../../lib/public-site';
import PublicStructuredData from './PublicStructuredData';
import { PublicSiteFooter, PublicSiteHeader } from './PublicSiteChrome';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface PublicMarketingPageProps {
  page: PublicMarketingPageDefinition;
}

export default function PublicMarketingPage({ page }: PublicMarketingPageProps) {
  useEffect(() => {
    applyDocumentMetadata({
      title: page.title,
      description: page.metaDescription,
      pathname: page.path,
      siteUrl: import.meta.env.VITE_SITE_URL?.trim(),
    });
  }, [page]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f2ed] text-slate-950">
      <PublicStructuredData items={getPublicPageStructuredData()} />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.08),transparent_34%),radial-gradient(circle_at_88%_6%,rgba(180,83,9,0.08),transparent_24%),linear-gradient(180deg,#f3f2ed_0%,#f8fafc_52%,#ffffff_100%)]" />
      <PublicSiteHeader currentPath={page.path} />

      <main>
        <section className="border-b border-slate-200/80">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
            <Badge className="rounded-full border border-slate-300 bg-white/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm hover:bg-white">
              {page.eyebrow}
            </Badge>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.05em] text-slate-950 sm:text-[3.25rem]">
              {page.h1}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{page.intro}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild className="h-12 gap-2 rounded-full px-7 text-sm shadow-[0_24px_40px_-22px_rgba(15,23,42,0.8)]">
                <a href={page.primaryCta.href}>
                  {page.primaryCta.label}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-slate-300 bg-white/70 px-7 text-sm text-slate-700 hover:bg-white">
                <a href={page.secondaryCta.href}>{page.secondaryCta.label}</a>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              {page.trustPoints.map((point) => (
                <span
                  key={point}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                >
                  <CheckCircle className="h-4 w-4 text-emerald-700" weight="fill" />
                  {point}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
            <div className="grid gap-6 lg:grid-cols-2">
              {page.sections.map((section) => (
                <article
                  key={section.id || section.title}
                  id={section.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_48px_-34px_rgba(15,23,42,0.25)]"
                >
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{section.title}</h2>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  {section.bullets ? (
                    <ul className="mt-5 space-y-3">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3 text-sm leading-7 text-slate-700">
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {section.links ? (
                    <div className="mt-5 flex flex-wrap gap-3">
                      {section.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          className="text-sm font-medium text-slate-950 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-950"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
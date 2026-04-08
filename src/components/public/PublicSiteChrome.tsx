import LegalDocumentLinks from '../legal/LegalDocumentLinks';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { APP_NAME } from '../../lib/site-brand';
import { PUBLIC_FOOTER_GROUPS, PUBLIC_PRIMARY_NAV_LINKS, PUBLIC_SITE_PATHS } from '../../lib/public-site';

interface PublicSiteHeaderProps {
  currentPath: string;
}

function isActivePath(currentPath: string, href: string) {
  if (href === PUBLIC_SITE_PATHS.home) {
    return currentPath === href;
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function PublicSiteHeader({ currentPath }: PublicSiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f3f2ed]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-6 px-6">
        <a className="min-w-0 text-left" href={PUBLIC_SITE_PATHS.home}>
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold tracking-tight text-slate-950">{APP_NAME}</div>
            <Badge variant="outline" className="hidden rounded-full border-slate-300 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 sm:inline-flex">
              Tarjouslaskentaohjelma rakennusalan yrityksille
            </Badge>
          </div>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
          {PUBLIC_PRIMARY_NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={isActivePath(currentPath, link.href) ? 'text-slate-950' : 'transition hover:text-slate-950'}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="outline" className="hidden border-slate-300 bg-white/70 text-slate-700 hover:bg-white sm:inline-flex">
            <a href={PUBLIC_SITE_PATHS.demo}>Pyydä demo</a>
          </Button>
          <Button asChild className="h-10 gap-2 rounded-full px-5 text-sm shadow-[0_18px_30px_-18px_rgba(15,23,42,0.8)]">
            <a href={PUBLIC_SITE_PATHS.login}>Kirjaudu sisään</a>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.4fr]">
          <div className="max-w-xl">
            <div className="text-lg font-semibold tracking-tight text-slate-950">{APP_NAME}</div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Projekta on tarjouslaskentaohjelma rakennusalan yrityksille. Se kokoaa tarjouseditorin, tarjouspyyntöjen katselmoinnin, kateohjauksen, projektiseurannan sekä PDF- ja Excel-viennit samaan hallittuun työtilaan.
            </p>
            <div className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tietosuoja ja ehdot</div>
            <LegalDocumentLinks className="mt-3" />
          </div>

          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {PUBLIC_FOOTER_GROUPS.map((group) => (
              <div key={group.title}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{group.title}</div>
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  {group.links.map((link) => (
                    <li key={`${group.title}-${link.href}`}>
                      <a className="transition hover:text-slate-950 hover:underline" href={link.href}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
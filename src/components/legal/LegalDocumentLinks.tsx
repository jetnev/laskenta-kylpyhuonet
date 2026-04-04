import { LEGAL_PUBLIC_LINKS } from '../../lib/legal';
import { cn } from '../../lib/utils';

interface LegalDocumentLinksProps {
  className?: string;
  linkClassName?: string;
  includeCookies?: boolean;
  openInNewTab?: boolean;
}

export default function LegalDocumentLinks({
  className,
  linkClassName,
  includeCookies = true,
  openInNewTab = false,
}: LegalDocumentLinksProps) {
  const links = includeCookies
    ? LEGAL_PUBLIC_LINKS
    : LEGAL_PUBLIC_LINKS.filter((link) => link.type !== 'cookies');

  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600', className)}>
      {links.map((link) => (
        <a
          key={link.type}
          href={link.href}
          className={cn('transition hover:text-slate-950 hover:underline', linkClassName)}
          rel={openInNewTab ? 'noreferrer' : undefined}
          target={openInNewTab ? '_blank' : undefined}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

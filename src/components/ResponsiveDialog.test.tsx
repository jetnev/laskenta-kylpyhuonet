import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const responsiveHooks = vi.hoisted(() => ({
  useIsMobile: vi.fn(),
}));

vi.mock('../hooks/use-mobile', () => ({
  useIsMobile: responsiveHooks.useIsMobile,
}));

vi.mock('./ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div data-dialog="root">{children}</div>,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-dialog="content" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-dialog="header" className={className}>
      {children}
    </div>
  ),
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-dialog="title" className={className}>
      {children}
    </div>
  ),
  DialogDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-dialog="description" className={className}>
      {children}
    </div>
  ),
  DialogFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-dialog="footer" className={className}>
      {children}
    </div>
  ),
}));

vi.mock('./ui/drawer', () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => <div data-drawer="root">{children}</div>,
  DrawerContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-drawer="content" className={className}>
      {children}
    </div>
  ),
  DrawerHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-drawer="header" className={className}>
      {children}
    </div>
  ),
  DrawerTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-drawer="title" className={className}>
      {children}
    </div>
  ),
  DrawerDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-drawer="description" className={className}>
      {children}
    </div>
  ),
  DrawerFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-drawer="footer" className={className}>
      {children}
    </div>
  ),
}));

vi.mock('./ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-scroll-area="root" className={className}>
      {children}
    </div>
  ),
}));

import { ResponsiveDialog } from './ResponsiveDialog';

function renderDialog(markupProps?: Partial<React.ComponentProps<typeof ResponsiveDialog>>) {
  return renderToStaticMarkup(
    <ResponsiveDialog
      open
      onOpenChange={() => undefined}
      title="Dokumentti"
      description="Pitkä sisältö pysyy luettavana myös pienemmällä viewport-korkeudella."
      footer={<button type="button">Sulje</button>}
      {...markupProps}
    >
      <div>Esikatselusisältö</div>
    </ResponsiveDialog>
  );
}

describe('ResponsiveDialog', () => {
  beforeEach(() => {
    responsiveHooks.useIsMobile.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses a dvh-bound desktop layout with fixed header/footer and internal scroll area', () => {
    const markup = renderDialog({ maxWidth: 'full' });

    expect(markup).toContain('data-dialog="content"');
    expect(markup).toContain('h-[calc(100dvh-2rem)]');
    expect(markup).toContain('max-h-[calc(100dvh-2rem)]');
    expect(markup).toContain('min-h-0 flex-1 px-6 py-5');
    expect(markup).toContain('Pitkä sisältö pysyy luettavana myös pienemmällä viewport-korkeudella.');
    expect(markup).toContain('data-dialog="footer"');
  });

  it('uses a dvh-bound drawer layout on mobile with an internal scroll region', () => {
    responsiveHooks.useIsMobile.mockReturnValue(true);

    const markup = renderDialog();

    expect(markup).toContain('data-drawer="content"');
    expect(markup).toContain('max-h-[calc(100dvh-1rem)]');
    expect(markup).toContain('min-h-0 flex-1');
    expect(markup).toContain('data-drawer="footer"');
  });
});
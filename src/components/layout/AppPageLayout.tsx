import { type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { cn } from '../../lib/utils';

export type AppPageType = 'dashboard' | 'registry' | 'workspace';

const PAGE_WIDTH_CLASSES: Record<AppPageType, string> = {
  dashboard: 'max-w-[1520px]',
  registry: 'max-w-[1600px]',
  workspace: 'max-w-[1728px]',
};

const CONTENT_GRID_CLASSES: Record<AppPageType, string> = {
  dashboard: 'grid gap-6 xl:grid-cols-12 2xl:gap-8',
  registry: 'grid gap-6 xl:grid-cols-12 2xl:gap-8',
  workspace: 'grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px] 2xl:gap-8',
};

interface AppPageLayoutProps extends ComponentPropsWithoutRef<'div'> {
  pageType?: AppPageType;
}

interface AppPageHeaderProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}

interface AppPageContentGridProps extends ComponentPropsWithoutRef<'div'> {
  pageType?: AppPageType;
}

export function AppPageLayout({ pageType = 'dashboard', className, ...props }: AppPageLayoutProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full min-w-0 space-y-6 px-4 py-4 sm:px-8 sm:py-8 xl:px-10 2xl:px-12',
        PAGE_WIDTH_CLASSES[pageType],
        className
      )}
      {...props}
    />
  );
}

export function AppPageHeader({ title, description, actions, eyebrow, className, ...props }: AppPageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between', className)} {...props}>
      <div className="space-y-2">
        {eyebrow ? <div className="flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{description}</p> : null}
        </div>
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AppPageContentGrid({ pageType = 'dashboard', className, ...props }: AppPageContentGridProps) {
  return <div className={cn(CONTENT_GRID_CLASSES[pageType], className)} {...props} />;
}
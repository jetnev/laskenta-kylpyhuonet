import { ArrowRight } from '@phosphor-icons/react';
import { type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface PageEmptyStateProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  icon?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  primaryActionLabel?: ReactNode;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: ReactNode;
  onSecondaryAction?: () => void;
  compact?: boolean;
}

export default function PageEmptyState({
  icon,
  title,
  description,
  action,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
  className,
  ...props
}: PageEmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-dashed border-border/80 bg-muted/20 text-center',
        compact ? 'px-5 py-8 sm:px-6' : 'px-6 py-10 sm:px-8',
        className
      )}
      {...props}
    >
      {icon ? (
        <div
          className={cn(
            'mx-auto flex items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-sm',
            compact ? 'h-12 w-12' : 'h-14 w-14'
          )}
        >
          {icon}
        </div>
      ) : null}

      <h3 className={cn('font-semibold tracking-[-0.02em] text-foreground', icon ? 'mt-4' : undefined, compact ? 'text-base' : 'text-lg')}>
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">{description}</p>
      {action ? <p className="mt-2 text-sm font-medium text-muted-foreground">{action}</p> : null}

      {(primaryActionLabel && onPrimaryAction) || (secondaryActionLabel && onSecondaryAction) ? (
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {primaryActionLabel && onPrimaryAction ? (
            <Button onClick={onPrimaryAction} className="justify-between sm:min-w-48">
              {primaryActionLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <Button variant="outline" onClick={onSecondaryAction} className="justify-between sm:min-w-48">
              {secondaryActionLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
import { type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { cn } from '../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface DashboardCardProps extends Omit<ComponentPropsWithoutRef<typeof Card>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  headerClassName?: string;
  contentClassName?: string;
}

export default function DashboardCard({
  title,
  description,
  actions,
  headerClassName,
  contentClassName,
  children,
  className,
  ...props
}: DashboardCardProps) {
  return (
    <Card
      className={cn(
        'border-border/70 bg-card shadow-[0_20px_48px_-38px_rgba(15,23,42,0.24)]',
        className,
      )}
      {...props}
    >
      {title || description || actions ? (
        <CardHeader className={cn('gap-4 border-b border-border/60 pb-5 lg:flex-row lg:items-start lg:justify-between', headerClassName)}>
          <div className="space-y-1.5">
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn(title || description || actions ? 'pt-6' : 'p-6', contentClassName)}>{children}</CardContent>
    </Card>
  );
}
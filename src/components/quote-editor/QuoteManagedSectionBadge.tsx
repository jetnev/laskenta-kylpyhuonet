import { Badge } from '../ui/badge';
import type { QuoteTenderManagedSectionState } from '../../features/tender-intelligence/lib/quote-managed-surface-inspector';
import { cn } from '../../lib/utils';

interface QuoteManagedSectionBadgeProps {
  sectionState: QuoteTenderManagedSectionState | null;
}

export default function QuoteManagedSectionBadge({ sectionState }: QuoteManagedSectionBadgeProps) {
  if (!sectionState) {
    return null;
  }

  if (sectionState.health_status === 'clean') {
    return <Badge variant="outline">{sectionState.label}</Badge>;
  }

  return (
    <Badge
      variant={sectionState.health_status === 'inconsistent' ? 'destructive' : 'outline'}
      className={cn(
        sectionState.health_status === 'needs_attention' && 'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-50',
      )}
    >
      {sectionState.label}
    </Badge>
  );
}
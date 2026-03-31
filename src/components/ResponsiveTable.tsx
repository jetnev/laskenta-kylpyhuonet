import { ReactNode } from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import { Card } from './ui/card';

interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  mobileHide?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function ResponsiveTable<T>({ 
  data, 
  columns, 
  keyExtractor, 
  emptyMessage = 'Ei tietoja',
  onRowClick 
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-2">
        {data.map((item) => {
          const visibleColumns = columns.filter(col => !col.mobileHide);
          return (
            <Card 
              key={keyExtractor(item)}
              className={`p-3 ${onRowClick ? 'cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              <div className="space-y-2">
                {visibleColumns.map((col, idx) => (
                  <div key={col.key} className={idx === 0 ? '' : 'text-sm'}>
                    <span className="text-muted-foreground text-xs block mb-0.5">{col.label}</span>
                    <div className={idx === 0 ? 'font-medium' : ''}>{col.render(item)}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full min-w-full">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th 
                key={col.key}
                className="text-left p-3 text-sm font-medium text-muted-foreground"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr 
              key={keyExtractor(item)}
              className={`border-b border-border last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={col.key} className="p-3 text-sm">
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

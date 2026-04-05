import { ReactNode } from 'react';

import { cn } from '../lib/utils';
import { useIsMobile } from '../hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from './ui/drawer';
import { ScrollArea } from './ui/scroll-area';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const maxWidthClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  full: 'sm:max-w-[calc(100vw-2rem)]',
};

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidth = 'lg',
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();
  const isFullscreenDesktop = maxWidth === 'full' && !isMobile;
  const viewportHeightClass = 'max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)]';

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex max-h-[calc(100vh-1rem)] max-h-[calc(100dvh-1rem)] flex-col overflow-hidden">
          <DrawerHeader className="shrink-0 border-b pb-4">
            <DrawerTitle className="text-lg">{title}</DrawerTitle>
            {description ? <DrawerDescription className="text-sm leading-6">{description}</DrawerDescription> : null}
          </DrawerHeader>
          <ScrollArea className="min-h-0 flex-1">
            <div className="px-4 py-4">{children}</div>
          </ScrollArea>
          {footer && (
            <DrawerFooter className="shrink-0 border-t pt-4 pb-safe flex-row gap-2">
              {footer}
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          maxWidthClasses[maxWidth],
          viewportHeightClass,
          'flex w-full flex-col gap-0 overflow-hidden p-0',
          isFullscreenDesktop && 'h-[calc(100vh-2rem)] h-[calc(100dvh-2rem)]'
        )}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-14 text-left">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {description ? <DialogDescription className="max-w-3xl text-sm leading-6">{description}</DialogDescription> : null}
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1 px-6 py-5">
          <div>{children}</div>
        </ScrollArea>
        {footer && (
          <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-4">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

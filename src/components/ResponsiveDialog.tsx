import { ReactNode } from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from './ui/drawer';
import { ScrollArea } from './ui/scroll-area';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
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
  children,
  footer,
  maxWidth = 'lg',
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();
  const isFullscreenDesktop = maxWidth === 'full' && !isMobile;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b">
            <DrawerTitle className="text-lg">{title}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="px-4 py-4">{children}</div>
          </ScrollArea>
          {footer && (
            <DrawerFooter className="border-t pt-4 pb-safe flex-row gap-2">
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
        className={
          isFullscreenDesktop
            ? `${maxWidthClasses[maxWidth]} h-[calc(100vh-1.5rem)] max-h-[calc(100vh-1.5rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0`
            : maxWidthClasses[maxWidth]
        }
      >
        <DialogHeader className={isFullscreenDesktop ? 'border-b px-6 py-5 pr-14' : undefined}>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className={isFullscreenDesktop ? 'min-h-0 overflow-y-auto px-6 py-5' : 'max-h-[60vh] overflow-y-auto pr-4'}>
          <div>{children}</div>
        </ScrollArea>
        {footer && (
          <DialogFooter className={isFullscreenDesktop ? 'gap-2 border-t bg-background px-6 py-4' : 'gap-2'}>
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

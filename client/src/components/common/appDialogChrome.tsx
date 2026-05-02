'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import {
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Outer shell for app dialogs — matches Create New Asset card chrome */
export const appDialogShellContentClass =
  '!flex !flex-col !gap-0 !p-0 sm:!p-0 sm:!gap-0 min-h-0 min-w-0 !overflow-hidden rounded-2xl border-none shadow-2xl bg-white max-h-[min(100dvh-1rem,100svh-1rem)] w-full';

export const AppDialogFrame = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent> & {
    showCloseButton?: boolean;
  }
>(({ className, showCloseButton = false, ...props }, ref) => (
  <DialogContent
    ref={ref}
    showCloseButton={showCloseButton}
    className={cn(appDialogShellContentClass, className)}
    {...props}
  />
));
AppDialogFrame.displayName = 'AppDialogFrame';

export function AppDialogGradientHeader({
  title,
  description,
  skipDescriptionFallback,
  showCloseButton = true,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** When true, omit the header subtitle and the sr-only fallback (use a DialogDescription elsewhere). */
  skipDescriptionFallback?: boolean;
  showCloseButton?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'shrink-0 bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10',
        className
      )}
    >
      <div className="flex justify-between items-start gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 text-left pr-2">
          <DialogTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-white border-0 shadow-none break-words">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-red-100 mt-2 text-sm sm:text-base text-left break-words text-pretty max-w-full">
              {description}
            </DialogDescription>
          ) : skipDescriptionFallback ? null : (
            <DialogDescription className="sr-only">Dialog</DialogDescription>
          )}
        </div>
        {showCloseButton ? (
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full shrink-0 h-10 w-10"
              aria-label="Close dialog"
            >
              <X className="h-6 w-6" />
            </Button>
          </DialogClose>
        ) : null}
      </div>
    </div>
  );
}

export function AppDialogBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-4 text-left sm:px-6 sm:py-6',
        className
      )}
      {...props}
    />
  );
}

/** Footer bar — matches Create New Asset bottom action bar */
export function AppDialogChromeFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <DialogFooter
      className={cn(
        'mt-auto shrink-0 flex flex-col flex-wrap gap-2 sm:flex-row sm:gap-3 px-4 py-4 sm:px-6 sm:py-5 bg-gray-50 border-t border-gray-200 sm:justify-end pb-[max(1rem,env(safe-area-inset-bottom,0px))] [&>button]:w-full sm:[&>button]:w-auto sm:[&>button]:shrink-0',
        className
      )}
      {...props}
    />
  );
}

export const appAlertDialogShellClass =
  '!flex !flex-col !gap-0 !p-0 sm:!p-0 sm:!gap-0 min-h-0 min-w-0 !overflow-hidden rounded-2xl border-none shadow-2xl bg-white max-h-[min(100dvh-1rem,100svh-1rem)] w-full';

export const AppAlertDialogFrame = React.forwardRef<
  React.ElementRef<typeof AlertDialogContent>,
  React.ComponentPropsWithoutRef<typeof AlertDialogContent>
>(({ className, ...props }, ref) => (
  <AlertDialogContent
    ref={ref}
    className={cn(appAlertDialogShellClass, className)}
    {...props}
  />
));
AppAlertDialogFrame.displayName = 'AppAlertDialogFrame';

export function AppAlertDialogGradientHeader({
  title,
}: {
  title: React.ReactNode;
}) {
  return (
    <div className="shrink-0 bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 pt-6 pb-6 sm:px-6 sm:pt-8 sm:pb-8">
      <AlertDialogTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-left border-0 shadow-none break-words">
        {title}
      </AlertDialogTitle>
    </div>
  );
}

export function AppAlertDialogMessage({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pt-4 pb-2 text-left sm:px-6',
        className
      )}
      {...props}
    />
  );
}

export function AppAlertDialogChromeFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <AlertDialogFooter
      className={cn(
        'mt-auto shrink-0 flex flex-col-reverse flex-wrap gap-2 sm:flex-row sm:gap-3 px-4 py-4 sm:px-6 sm:py-5 bg-gray-50 border-t border-gray-200 sm:justify-end sm:space-x-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))]',
        className
      )}
      {...props}
    />
  );
}

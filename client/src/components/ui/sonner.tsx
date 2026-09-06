'use client';

import { useTheme } from '@/hooks/use-theme';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const SonnerToaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="top-right"
      className="toaster group"
      toastOptions={{
        duration: 5000,
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success:
            'group-[.toaster]:bg-green-50 group-[.toaster]:border-green-200 group-[.toaster]:text-green-800 dark:group-[.toaster]:bg-[#132a1e] dark:group-[.toaster]:border-[#1e3d2b] dark:group-[.toaster]:text-[#86efac]',
          error:
            'group-[.toaster]:bg-red-50 group-[.toaster]:border-red-200 group-[.toaster]:text-red-800 dark:group-[.toaster]:bg-[#2a1c1e] dark:group-[.toaster]:border-[#3e2628] dark:group-[.toaster]:text-[#fca5a5]',
          warning:
            'group-[.toaster]:bg-yellow-50 group-[.toaster]:border-yellow-200 group-[.toaster]:text-yellow-800 dark:group-[.toaster]:bg-[#2b2517] dark:group-[.toaster]:border-[#3d331f] dark:group-[.toaster]:text-[#fcd34d]',
          info:
            'group-[.toaster]:bg-blue-50 group-[.toaster]:border-blue-200 group-[.toaster]:text-blue-800 dark:group-[.toaster]:bg-[#1c2535] dark:group-[.toaster]:border-[#263449] dark:group-[.toaster]:text-[#93c5fd]',
        },
      }}
      richColors
      {...props}
    />
  );
};

export { SonnerToaster };

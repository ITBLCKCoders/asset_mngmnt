import type { ReactNode } from 'react';

/** Renders a label with a trailing red asterisk to indicate a required field. */
export function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      {children}
      <span className="text-red-500">*</span>
    </span>
  );
}

/** Inline Google logo SVG (no font dependency, fixed at 20×20). */
export function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 6.75c1.65 0 3.12.65 4.28 1.67l3.18-3.18C17.46 2.76 14.97 1.5 12 1.5 7.7 1.5 3.99 3.97 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/** Inline Microsoft logo SVG (no font dependency, fixed at 20×20). */
export function MicrosoftIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#F25022" d="M3 3h9v9H3z" />
      <path fill="#7FBA00" d="M12 3h9v9h-9z" />
      <path fill="#00A4EF" d="M3 12h9v9H3z" />
      <path fill="#FFB900" d="M12 12h9v9h-9z" />
    </svg>
  );
}

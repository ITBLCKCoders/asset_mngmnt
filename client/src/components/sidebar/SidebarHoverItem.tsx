import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const transition = 'transition-[transform,opacity] duration-150 ease-out';

/**
 * Wraps a sidebar item in a div that translates/scales on hover via CSS.
 * The `active` flag suppresses the translate so the active item stays anchored.
 */
export const SidebarHoverItem = memo(function SidebarHoverItem({
  children,
  active = false,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        transition,
        active
          ? 'hover:scale-[1.01]'
          : 'hover:translate-x-1 hover:scale-[1.02]'
      )}
    >
      {children}
    </div>
  );
});

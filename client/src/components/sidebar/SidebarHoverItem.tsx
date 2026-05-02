import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export const SIDEBAR_HOVER_TRANSITION = {
  type: 'spring',
  stiffness: 320,
  damping: 24,
  mass: 0.7,
} as const;

/**
 * Wraps a sidebar item in a motion div that scales/translates on hover. The
 * `active` flag suppresses the translate so the active item stays anchored.
 */
export function SidebarHoverItem({
  children,
  active = false,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <motion.div
      initial={false}
      whileHover={active ? { scale: 1.01 } : { x: 4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={SIDEBAR_HOVER_TRANSITION}
    >
      {children}
    </motion.div>
  );
}

import * as React from 'react';
import { motion } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        warning:
          'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends
    Omit<
      React.HTMLAttributes<HTMLDivElement>,
      | 'onDrag'
      | 'onDragStart'
      | 'onDragEnd'
      | 'onAnimationStart'
      | 'onAnimationEnd'
      | 'onTransitionEnd'
    >,
    VariantProps<typeof badgeVariants> {
  hoverEffect?: boolean;
}

const Badge = React.memo(function Badge({
  className,
  variant,
  hoverEffect,
  ...props
}: BadgeProps) {
  const shouldAnimateHover =
    hoverEffect ??
    /(?:^|\s)(?:hover:|cursor-pointer|group-hover:)/.test(className ?? '');

  return (
    <motion.div
      className={cn(badgeVariants({ variant }), className)}
      whileHover={shouldAnimateHover ? { y: -1, scale: 1.02 } : undefined}
      transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.55 }}
      {...props}
    />
  );
});

export { Badge, badgeVariants };

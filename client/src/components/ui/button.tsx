import * as React from 'react';
import { motion } from 'framer-motion';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends
    Omit<
      React.ButtonHTMLAttributes<HTMLButtonElement>,
      | 'onDrag'
      | 'onDragStart'
      | 'onDragEnd'
      | 'onAnimationStart'
      | 'onAnimationEnd'
      | 'onTransitionEnd'
    >,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  hoverEffect?: boolean;
}

const BUTTON_HOVER_TRANSITION = {
  type: 'spring',
  stiffness: 380,
  damping: 26,
  mass: 0.6,
} as const;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, hoverEffect = true, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const hoverAnimation =
      hoverEffect && !props.disabled
        ? variant === 'link'
          ? { y: -1 }
          : { y: -1, scale: 1.01 }
        : undefined;

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        />
      );
    }

    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        whileHover={hoverAnimation}
        whileTap={hoverEffect && !props.disabled ? { scale: 0.98 } : undefined}
        transition={BUTTON_HOVER_TRANSITION}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

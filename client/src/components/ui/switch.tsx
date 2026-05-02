import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

interface SwitchProps extends React.ComponentPropsWithoutRef<
  typeof SwitchPrimitives.Root
> {
  indeterminate?: boolean;
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, indeterminate, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-red-500 data-[state=unchecked]:bg-gray-300 data-[state=checked]:shadow-lg data-[state=checked]:shadow-red-500/30 relative',
      indeterminate && 'bg-orange-400',
      className
    )}
    {...props}
    ref={ref}
  >
    <span
      className={cn(
        'absolute left-1 text-[8px] font-medium text-white transition-opacity duration-300',
        !indeterminate && 'data-[state=unchecked]:opacity-0',
        indeterminate && 'opacity-0'
      )}
    >
      ON
    </span>
    <span
      className={cn(
        'absolute right-1 text-[8px] font-medium text-black transition-opacity duration-300',
        !indeterminate && 'data-[state=checked]:opacity-0',
        indeterminate && 'opacity-0'
      )}
    >
      OFF
    </span>
    <span
      className={cn(
        'absolute left-1/2 transform -translate-x-1/2 text-[8px] font-medium text-white transition-opacity duration-300',
        indeterminate ? 'opacity-100' : 'opacity-0'
      )}
    >
      ?
    </span>
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-all duration-300 ease-out',
        indeterminate
          ? 'translate-x-3 bg-white'
          : 'data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-0 data-[state=checked]:bg-white data-[state=unchecked]:bg-white'
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };

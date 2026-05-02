import { cn } from '@/lib/utils';
import { CheckIcon } from 'lucide-react';

interface AnimatedSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon: React.ElementType;
  disabled?: boolean;
}

export default function AnimatedSwitch({
  checked,
  onCheckedChange,
  icon: Icon,
  disabled = false,
}: AnimatedSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onCheckedChange(!checked)}
      onKeyDown={e =>
        !disabled &&
        (e.key === 'Enter' || e.key === ' ') &&
        onCheckedChange(!checked)
      }
      tabIndex={disabled ? -1 : 0}
      className={cn(
        'relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
        checked ? 'bg-red-600' : 'bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300',
          checked ? 'translate-x-6' : 'translate-x-0.5'
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4 text-red-600 transition-all duration-300',
            checked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          )}
          strokeWidth={2.5}
        />

        <CheckIcon
          className={cn(
            'absolute h-3 w-3 text-gray-500 transition-all duration-200',
            checked ? 'scale-0 opacity-0' : 'scale-100 opacity-70'
          )}
        />
      </span>
    </button>
  );
}

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export const Shimmer = ({ className }: { className?: string }) => (
  <motion.div
    className={cn('rounded bg-gray-200/80', className)}
    style={{
      backgroundImage:
        'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
      backgroundSize: '300% 100%',
    }}
    animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
  />
);

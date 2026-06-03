import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn('rounded-md bg-primary/10', className)}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export { Skeleton };

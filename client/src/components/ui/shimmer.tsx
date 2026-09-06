import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export const Shimmer = ({ className }: { className?: string }) => (
  <motion.div
    data-slot="shimmer"
    className={cn(
      'rounded bg-gray-200/80 dark:bg-[rgb(46_51_62_/_0.85)]',
      className
    )}
    animate={{ opacity: [0.55, 1, 0.55] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
  />
);

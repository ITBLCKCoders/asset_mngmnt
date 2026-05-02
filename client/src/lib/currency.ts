export const formatCurrency = (value: number | undefined | null): string => {
  if (value == null || isNaN(value) || value === 0) return '₱0.00';

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

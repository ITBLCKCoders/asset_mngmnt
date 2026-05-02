import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ZipCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFilledZip: string;
}

export function ZipCodeInput({
  value,
  onChange,
  autoFilledZip,
}: ZipCodeInputProps) {
  const displayValue = value || autoFilledZip || '';
  const isAutoFilled = autoFilledZip !== '' && displayValue === autoFilledZip;

  return (
    <div className="space-y-2">
      <Label>ZIP Code</Label>
      <Input
        value={displayValue}
        onChange={e => onChange(e.target.value)}
        placeholder=""
        readOnly={isAutoFilled}
        className={cn(
          'font-medium text-lg transition-all',
          isAutoFilled && 'text-green-700 bg-green-50 border-green-300',
          !displayValue && 'text-muted-foreground'
        )}
      />
    </div>
  );
}

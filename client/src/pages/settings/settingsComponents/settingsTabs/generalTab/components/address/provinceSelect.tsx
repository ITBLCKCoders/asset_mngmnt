import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ProvinceSelectProps {
  regionCode: string;
  value: string;
  onChange: (code: string) => void;
  hasProvinces: boolean;
  updateForm?: (updates: Record<string, string>) => void;
  loading?: boolean;
  selectedName?: string;
  isEdit?: boolean;
}

export function ProvinceSelect({
  regionCode,
  value,
  onChange,
  hasProvinces,
  updateForm,
  loading,
  selectedName,
  isEdit = false,
}: ProvinceSelectProps) {
  const [provinces, setProvinces] = useState<{ code: string; name: string }[]>(
    []
  );
  const [internalLoading, setInternalLoading] = useState(false);
  const [search, setSearch] = useState('');

  const isLoading = loading ?? internalLoading;

  useEffect(() => {
    if (!regionCode || !hasProvinces) {
      setProvinces([]);
      return;
    }
    setInternalLoading(true);
    fetch(`https://psgc.gitlab.io/api/regions/${regionCode}/provinces.json`)
      .then(r => r.json())
      .then(setProvinces)
      .finally(() => setInternalLoading(false));
  }, [regionCode, hasProvinces]);

  useEffect(() => {
    if (selectedName && provinces.length > 0 && !value) {
      const province = provinces.find(p => p.name === selectedName);
      if (province) {
        onChange(province.code);
        updateForm?.({
          province_code: province.code,
          province_name: province.name,
        });
      }
    }
  }, [selectedName, provinces, value, onChange, updateForm]);

  if (!hasProvinces) {
    return (
      <div className="space-y-2">
        <Label>Province</Label>
        <Input
          value="N/A"
          readOnly
          className="bg-gray-100 text-gray-500 font-medium"
        />
      </div>
    );
  }

  const selected = provinces.find(p => p.code === value);

  const handleSelect = (code: string) => {
    const province = provinces.find(p => p.code === code);
    onChange(code);
    updateForm?.({
      province_code: code,
      province_name: province?.name || '',
    });
  };

  return (
    <div className="space-y-2">
      <Label>Province</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={!regionCode || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              selected?.name ||
              (isEdit && !selectedName ? 'N/A' : 'Select province')
            )}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-white" align="start">
          <Command>
            <CommandInput
              placeholder="Search province..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No province found.</CommandEmpty>
              <CommandGroup>
                {provinces
                  .filter(p =>
                    p.name.toLowerCase().includes(search.toLowerCase())
                  )
                  .map(p => (
                    <CommandItem
                      key={p.code}
                      onSelect={() => handleSelect(p.code)}
                      className="hover:bg-gray-200 cursor-pointer"
                    >
                      {p.name}
                      {value === p.code && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

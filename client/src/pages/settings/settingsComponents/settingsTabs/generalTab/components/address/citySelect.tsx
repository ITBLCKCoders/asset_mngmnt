import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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

interface CitySelectProps {
  regionCode: string;
  provinceCode: string | null;
  value: string;
  onChange: (code: string) => void;
  updateForm?: (updates: Record<string, string>) => void;
  loading?: boolean;
  selectedName?: string;
}

export function CitySelect({
  regionCode,
  provinceCode,
  value,
  onChange,
  updateForm,
  loading,
  selectedName,
}: CitySelectProps) {
  const [cities, setCities] = useState<{ code: string; name: string }[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [search, setSearch] = useState('');

  const isLoading = loading ?? internalLoading;
  const shouldLoad = regionCode && (provinceCode || provinceCode === null);

  useEffect(() => {
    if (!shouldLoad) {
      setCities([]);
      return;
    }

    setInternalLoading(true);
    const url = provinceCode
      ? `https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities.json`
      : `https://psgc.gitlab.io/api/regions/${regionCode}/cities-municipalities.json`;

    fetch(url)
      .then(r => r.json())
      .then(setCities)
      .catch(() => setCities([]))
      .finally(() => setInternalLoading(false));
  }, [regionCode, provinceCode, shouldLoad]);

  useEffect(() => {
    if (selectedName && cities.length > 0 && !value) {
      const city = cities.find(c => c.name === selectedName);
      if (city) {
        onChange(city.code);
        updateForm?.({
          city_code: city.code,
          city_name: city.name,
        });
      }
    }
  }, [selectedName, cities, value, onChange, updateForm]);

  const selected = cities.find(c => c.code === value);

  const handleSelect = (code: string) => {
    const city = cities.find(c => c.code === code);
    onChange(code);
    updateForm?.({
      city_code: code,
      city_name: city?.name || '',
    });
  };

  return (
    <div className="space-y-2">
      <Label>City / Municipality</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={!shouldLoad || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              selected?.name || 'Select city'
            )}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-white" align="start">
          <Command>
            <CommandInput
              placeholder="Search city..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No city found.</CommandEmpty>
              <CommandGroup>
                {cities
                  .filter(c =>
                    c.name.toLowerCase().includes(search.toLowerCase())
                  )
                  .map(c => (
                    <CommandItem
                      key={c.code}
                      onSelect={() => handleSelect(c.code)}
                      className="hover:bg-gray-200 cursor-pointer"
                    >
                      {c.name}
                      {value === c.code && (
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

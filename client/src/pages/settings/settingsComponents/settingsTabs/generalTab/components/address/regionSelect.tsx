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
import { toast } from 'sonner';

interface RegionSelectProps {
  value: string;
  onChange: (code: string) => void;
  onHasProvincesChange: (has: boolean) => void;
  updateForm?: (updates: Record<string, string>) => void;
  disabled?: boolean;
  selectedName?: string;
}

export function RegionSelect({
  value,
  onChange,
  onHasProvincesChange,
  updateForm,
  disabled,
  selectedName,
}: RegionSelectProps) {
  const [regions, setRegions] = useState<
    { code: string; regionName: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('https://psgc.gitlab.io/api/regions.json')
      .then(r => r.json())
      .then(data => setRegions(data))
      .catch(() => toast.error('Failed to load regions'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedName && regions.length > 0 && !value) {
      const region = regions.find(r => r.regionName === selectedName);
      if (region) {
        onChange(region.code);
        updateForm?.({
          region_code: region.code,
          region_name: region.regionName,
        });
        fetch(
          `https://psgc.gitlab.io/api/regions/${region.code}/provinces.json`
        )
          .then(r => (r.ok ? r.json() : []))
          .then(provs =>
            onHasProvincesChange(Array.isArray(provs) && provs.length > 0)
          );
      }
    }
  }, [
    selectedName,
    regions,
    value,
    onChange,
    updateForm,
    onHasProvincesChange,
  ]);

  const handleSelect = (code: string) => {
    const region = regions.find(r => r.code === code);
    onChange(code);

    updateForm?.({
      region_code: code,
      region_name: region?.regionName || '',
    });

    fetch(`https://psgc.gitlab.io/api/regions/${code}/provinces.json`)
      .then(r => (r.ok ? r.json() : []))
      .then(provs =>
        onHasProvincesChange(Array.isArray(provs) && provs.length > 0)
      );
  };

  const selected = regions.find(r => r.code === value);

  return (
    <div className="space-y-2">
      <Label>Region</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={disabled || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              selected?.regionName || 'Select region'
            )}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-white" align="start">
          <Command>
            <CommandInput
              placeholder="Search region..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No region found.</CommandEmpty>
              <CommandGroup>
                {regions
                  .filter(r =>
                    r.regionName.toLowerCase().includes(search.toLowerCase())
                  )
                  .map(r => (
                    <CommandItem
                      key={r.code}
                      onSelect={() => handleSelect(r.code)}
                      className="hover:bg-gray-200 cursor-pointer"
                    >
                      {r.regionName}
                      {value === r.code && (
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

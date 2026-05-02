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
import { ChevronDown, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';

const CITY_ZIP_FALLBACK: Record<string, string> = {
  '133900000': '1634',
  '133901000': '1630',
  '137401000': '1000',
  '137402000': '1200',
  '137403000': '1550',
  '137404000': '1800',
  '137405000': '1600',
  '137406000': '1100',
  '137501000': '1500',
  '137601000': '1700',
  '137602000': '1740',
  '137603000': '1780',
  '137604000': '1300',
  '137605000': '1400',
  '137606000': '1470',
  '137607000': '1411',
  '137608000': '1440',
  '124706000': '6000',
  '124707000': '6015',
  '124708000': '6014',
  '126302000': '8000',
  '129804000': '5000',
  '129805000': '6100',
  '061901000': '7000',
  '099701000': '2600',
  '097332000': '4500',
  '126503000': '9000',
  '128001000': '9500',
};

interface BarangaySelectProps {
  cityCode: string;
  value: string;
  onChange: (code: string) => void;
  onZipCodeLoaded: (zip: string) => void;
  updateForm?: (updates: Record<string, string>) => void;
  selectedName?: string;
}

export function BarangaySelect({
  cityCode,
  value,
  onChange,
  onZipCodeLoaded,
  updateForm,
  selectedName,
}: BarangaySelectProps) {
  const [barangays, setBarangays] = useState<{ code: string; name: string }[]>(
    []
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityCode) {
      setBarangays([]);
      return;
    }
    setLoading(true);
    fetch(
      `https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays.json`
    )
      .then(r => r.json())
      .then(data => setBarangays(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [cityCode]);

  // Map selectedName to code when editing
  useEffect(() => {
    if (selectedName && barangays.length > 0 && !value) {
      const barangay = barangays.find(b => b.name === selectedName);
      if (barangay) {
        onChange(barangay.code);
        updateForm?.({
          barangay_code: barangay.code,
          barangay_name: barangay.name,
        });

        // Load zip code
        (async () => {
          let zip = '';
          try {
            const res = await fetch(
              `https://psgc.gitlab.io/api/barangays/${barangay.code}.json`
            );
            const data = await res.json();
            if (data?.zipCode && data.zipCode !== '0000')
              zip = data.zipCode.trim();
          } catch {}
          if (!zip) {
            try {
              const res = await fetch(
                `https://psgc.gitlab.io/api/cities-municipalities/${cityCode}.json`
              );
              const data = await res.json();
              if (data?.zipCode && data.zipCode !== '0000')
                zip = data.zipCode.trim();
            } catch {}
          }
          if (!zip && CITY_ZIP_FALLBACK[cityCode])
            zip = CITY_ZIP_FALLBACK[cityCode];
          onZipCodeLoaded(zip || 'N/A');
        })();
      }
    }
  }, [
    selectedName,
    barangays,
    value,
    onChange,
    updateForm,
    onZipCodeLoaded,
    cityCode,
  ]);

  const handleSelect = async (code: string) => {
    onChange(code);

    const barangay = barangays.find(b => b.code === code);
    updateForm?.({
      barangay_code: code,
      barangay_name: barangay?.name || '',
    });

    let zip = '';

    try {
      const res = await fetch(
        `https://psgc.gitlab.io/api/barangays/${code}.json`
      );
      const data = await res.json();
      if (data?.zipCode && data.zipCode !== '0000') zip = data.zipCode.trim();
    } catch {}

    if (!zip) {
      try {
        const res = await fetch(
          `https://psgc.gitlab.io/api/cities-municipalities/${cityCode}.json`
        );
        const data = await res.json();
        if (data?.zipCode && data.zipCode !== '0000') zip = data.zipCode.trim();
      } catch {}
    }

    if (!zip && CITY_ZIP_FALLBACK[cityCode]) zip = CITY_ZIP_FALLBACK[cityCode];

    onZipCodeLoaded(zip || 'N/A');
  };

  const selected = barangays.find(b => b.code === value);

  return (
    <div className="space-y-2">
      <Label>Barangay</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={!cityCode || loading}
          >
            {loading ? (
              <span className="inline-block h-4 w-28 animate-pulse rounded bg-gray-200" />
            ) : (
              selected?.name || 'Select barangay'
            )}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-white" align="start">
          <Command>
            <CommandInput placeholder="Search barangay..." />
            <CommandList>
              <CommandEmpty>No barangay found.</CommandEmpty>
              <CommandGroup>
                {barangays.map(b => (
                  <CommandItem
                    key={b.code}
                    onSelect={() => handleSelect(b.code)}
                    className="cursor-pointer hover:bg-gray-200"
                  >
                    {b.name}
                    {value === b.code && <Check className="ml-auto h-4 w-4" />}
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

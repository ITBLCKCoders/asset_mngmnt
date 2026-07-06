// src/pages/settings/settingsComponents/settingsTabs/generalTab/CompanyModal.tsx
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
  AppAlertDialogFrame,
  AppAlertDialogGradientHeader,
  AppAlertDialogMessage,
  AppAlertDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { UploadCloud, Check, ChevronsUpDown } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// MODULAR ADDRESS COMPONENTS
import { RegionSelect } from './address/regionSelect';
import { ProvinceSelect } from './address/provinceSelect';
import { CitySelect } from './address/citySelect';
import { BarangaySelect } from './address/barangaySelect';
import { ZipCodeInput } from './address/zipCodeInput';

// SHADCN DROPDOWNS
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Company {
  id?: string;
  name: string;
  email: string;
  code: string;
  prefix?: string;
  taxId?: string;
  phone?: string;
  website?: string;
  logo_url?: string | null;
  industry?: string;
  size?: string;
  unit_no?: string;
  building_street?: string;
  region_code?: string;
  region_name?: string;
  province_code?: string;
  province_name?: string;
  city_code?: string;
  city_name?: string;
  barangay_code?: string;
  barangay_name?: string;
  zipcode?: string;
}

interface CompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company | null;
  onSave: (formData: FormData) => Promise<void>;
  saving?: boolean;
}

const INDUSTRIES = [
  'Technology',
  'Software Development',
  'Information Technology Services',
  'Internet',
  'E-commerce',
  'Financial Services',
  'Banking',
  'Insurance',
  'Fintech',
  'Healthcare',
  'Hospitals',
  'Pharmaceuticals',
  'Biotechnology',
  'Medical Devices',
  'Manufacturing',
  'Automotive',
  'Aerospace',
  'Chemicals',
  'Electronics',
  'Retail',
  'Consumer Goods',
  'Fashion & Apparel',
  'Food & Beverage',
  'Restaurants',
  'Real Estate',
  'Construction',
  'Architecture',
  'Engineering',
  'Energy',
  'Oil & Gas',
  'Renewable Energy',
  'Utilities',
  'Telecommunications',
  'Media & Entertainment',
  'Film & Video',
  'Music',
  'Gaming',
  'Education',
  'Higher Education',
  'K-12 Education',
  'E-Learning',
  'Transportation',
  'Logistics & Supply Chain',
  'Airlines',
  'Shipping',
  'Hospitality',
  'Hotels',
  'Travel & Tourism',
  'Legal Services',
  'Law Practice',
  'Accounting',
  'Consulting',
  'Marketing & Advertising',
  'Public Relations',
  'Human Resources',
  'Recruiting',
  'Nonprofit Organization',
  'Government Administration',
  'Military',
  'Agriculture',
  'Mining & Metals',
  'Environmental Services',
  'Sports',
  'Fitness & Wellness',
  'Beauty & Cosmetics',
  'Art & Design',
  'Photography',
  'Events Services',
  'Wedding Planning',
  'Security & Investigations',
  'Facilities Services',
  'Wholesale',
  'Import & Export',
  'Venture Capital & Private Equity',
  'Investment Banking',
  'Research',
  'Think Tanks',
  'Translation & Localization',
  'Writing & Editing',
  'Publishing',
  'Broadcast Media',
  'Newspapers',
  'Museums & Institutions',
  'Performing Arts',
  'Luxury Goods & Jewelry',
  'Wine & Spirits',
  'Tobacco',
  'Other',
] as const;

const COMPANY_SIZES = [
  '1–10 employees',
  '11–50 employees',
  '51–200 employees',
  '201–500 employees',
  '501–1,000 employees',
  '1,001–5,000 employees',
  '5,001–10,000 employees',
  '10,001+ employees',
] as const;

export function CompanyModal({
  open,
  onOpenChange,
  company,
  onSave,
  saving = false,
}: CompanyModalProps) {
  const isEdit = !!company?.id;

  const [formData, setFormData] = useState<Partial<Company>>({
    name: '',
    email: '',
    code: '',
    prefix: '',
    phone: '',
    taxId: '',
    website: '',
    unit_no: '',
    building_street: '',
    region_code: '',
    region_name: '',
    province_code: '',
    province_name: '',
    city_code: '',
    city_name: '',
    barangay_code: '',
    barangay_name: '',
    zipcode: '',
    industry: '',
    size: '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [regionHasProvinces, setRegionHasProvinces] = useState<boolean>(true);
  const [autoZipCode, setAutoZipCode] = useState<string>('');
  const [industryOpen, setIndustryOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [initialData, setInitialData] = useState<Partial<Company>>({});
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [showSaveAlert, setShowSaveAlert] = useState(false);
  const phoneInputMounted = useRef(false);

  const updateForm = (updates: Record<string, string | null>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: '',
        email: '',
        code: '',
        prefix: '',
        phone: '',
        taxId: '',
        website: '',
        unit_no: '',
        building_street: '',
        region_code: '',
        region_name: '',
        province_code: '',
        province_name: '',
        city_code: '',
        city_name: '',
        barangay_code: '',
        barangay_name: '',
        zipcode: '',
        industry: '',
        size: '',
      });
      setLogoFile(null);
      setLogoPreview(null);
      setAutoZipCode('');
      setRegionHasProvinces(true);
      setInitialData({});
      setShowCancelAlert(false);
      setShowSaveAlert(false);
      phoneInputMounted.current = false;
    }
  }, [open]);

  // Populate form when editing or adding
  useEffect(() => {
    if (open) {
      if (company) {
        const normalized = Object.fromEntries(
          Object.entries(company).map(([k, v]) => [
            k,
            k === 'logo_url' ? v : (v ?? ''),
          ])
        ) as Partial<Company>;
        setFormData(normalized);
        setLogoPreview(normalized.logo_url || null);
        setInitialData(normalized);
      } else {
        const empty = {
          name: '',
          email: '',
          code: '',
          prefix: '',
          phone: '',
          taxId: '',
          website: '',
          unit_no: '',
          building_street: '',
          region_code: '',
          region_name: '',
          province_code: '',
          province_name: '',
          city_code: '',
          city_name: '',
          barangay_code: '',
          barangay_name: '',
          zipcode: '',
          industry: '',
          size: '',
          logo_url: null,
        };
        setFormData(empty);
        setInitialData(empty);
      }
    }
  }, [open, company]);

  const hasChanges = () => {
    const addressFields = [
      'region_code',
      'region_name',
      'province_code',
      'province_name',
      'city_code',
      'city_name',
      'barangay_code',
      'barangay_name',
      'zipcode',
    ];
    const keys = Object.keys(formData) as (keyof Company)[];
    for (const key of keys) {
      if (!addressFields.includes(key) && formData[key] !== initialData[key])
        return true;
    }
    if (logoFile) return true;
    return false;
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/'))
      return toast.error('Please select an image');
    if (file.size > 5 * 1024 * 1024)
      return toast.error('Image must be under 5MB');
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async () => {
    if (
      !formData.name?.trim() ||
      !formData.email?.trim() ||
      !formData.code?.trim()
    ) {
      return toast.error('Company Name, Email, and Code are required');
    }
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value != null && value !== '') data.append(key, value as string);
    });
    if (logoFile) data.append('logo', logoFile);
    await onSave(data);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <AppDialogFrame className="max-w-5xl max-h-[90dvh] overflow-hidden !flex !flex-col">
          <AppDialogGradientHeader
            title={isEdit ? 'Edit Company' : 'Add New Company'}
            description="Update company profile, logo, contact details, and address."
          />

          <AppDialogBody className="flex-1 space-y-8 overflow-y-auto px-4 sm:px-8 py-6">
            {/* Logo Upload */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Company Logo</Label>
              <div
                className={`relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all ${
                  isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-300 hover:border-primary/50'
                }`}
                onDrop={handleDrop}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPreview ? (
                  <div className="space-y-6">
                    <img
                      src={proxyCloudinaryUrl(logoPreview)}
                      alt="Logo"
                      className="mx-auto rounded-lg border shadow-md bg-white"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="flex justify-center gap-3">
                      <Button variant="secondary" size="sm">
                        Change
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={e => {
                          e.stopPropagation();
                          setLogoFile(null);
                          setLogoPreview(null);
                          updateForm({ logo_url: null });
                          if (fileInputRef.current)
                            fileInputRef.current.value = '';
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <UploadCloud className="mx-auto h-14 w-14 text-gray-400" />
                    <p className="text-lg font-medium">Drop your logo here</p>
                    <p className="text-sm text-gray-500">
                      or click to browse (Max 5MB)
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e =>
                    e.target.files?.[0] && handleFileSelect(e.target.files[0])
                  }
                />
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>
                  Company Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name || ''}
                  onChange={e => updateForm({ name: e.target.value })}
                  placeholder="Enter Company Name"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={e => updateForm({ email: e.target.value })}
                  placeholder="Enter Company Email"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Company Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  className="font-mono"
                  value={formData.code || ''}
                  onChange={e =>
                    updateForm({ code: e.target.value.toUpperCase() })
                  }
                  placeholder="Enter Company Code"
                />
              </div>
              <div className="space-y-2">
                <Label>Prefix</Label>
                <Input
                  value={formData.prefix || ''}
                  onChange={e => updateForm({ prefix: e.target.value })}
                  placeholder="Enter Company Prefix"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <PhoneInput
                  international
                  value={formData.phone || ''}
                  onChange={v => updateForm({ phone: v || '' })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Tax ID (TIN)</Label>
                <Input
                  value={formData.taxId || ''}
                  onChange={e => updateForm({ taxId: e.target.value })}
                  placeholder="Company Tax ID"
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={formData.website || ''}
                  onChange={e => updateForm({ website: e.target.value })}
                  placeholder="Your Company Website"
                />
              </div>
            </div>

            {/* Address */}
            <div className="border-t pt-6 space-y-6">
              <h3 className="text-lg font-semibold">Company Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit / Floor / Building</Label>
                  <Input
                    value={formData.unit_no || ''}
                    onChange={e => updateForm({ unit_no: e.target.value })}
                    placeholder="Unit 123, 15F"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Street / Subdivision</Label>
                  <Input
                    value={formData.building_street || ''}
                    onChange={e =>
                      updateForm({ building_street: e.target.value })
                    }
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value="Philippines" readOnly className="bg-gray-50" />
                </div>

                <RegionSelect
                  value={formData.region_code || ''}
                  selectedName={company?.region_name}
                  onChange={code => {
                    updateForm({
                      region_code: code,
                      province_code: '',
                      province_name: '',
                      city_code: '',
                      city_name: '',
                      barangay_code: '',
                      barangay_name: '',
                      zipcode: '',
                    });
                    setAutoZipCode('');
                  }}
                  onHasProvincesChange={setRegionHasProvinces}
                  updateForm={updateForm}
                />
                <ProvinceSelect
                  regionCode={formData.region_code || ''}
                  value={formData.province_code || ''}
                  selectedName={company?.province_name}
                  onChange={code => {
                    updateForm({
                      province_code: code,
                      city_code: '',
                      city_name: '',
                      barangay_code: '',
                      barangay_name: '',
                      zipcode: '',
                    });
                    setAutoZipCode('');
                  }}
                  hasProvinces={regionHasProvinces}
                  updateForm={updateForm}
                  isEdit={isEdit}
                />
                <CitySelect
                  regionCode={formData.region_code || ''}
                  provinceCode={
                    regionHasProvinces ? formData.province_code || null : null
                  }
                  value={formData.city_code || ''}
                  selectedName={company?.city_name}
                  onChange={code => {
                    updateForm({
                      city_code: code,
                      barangay_code: '',
                      barangay_name: '',
                      zipcode: '',
                    });
                    setAutoZipCode('');
                  }}
                  updateForm={updateForm}
                />
                <BarangaySelect
                  cityCode={formData.city_code || ''}
                  value={formData.barangay_code || ''}
                  selectedName={company?.barangay_name}
                  onChange={code =>
                    updateForm({ barangay_code: code, barangay_name: '' })
                  }
                  onZipCodeLoaded={zip => {
                    setAutoZipCode(zip);
                    // Only auto-fill zipcode if not already set (for editing)
                    if (!formData.zipcode || formData.zipcode === '') {
                      updateForm({ zipcode: zip });
                    }
                  }}
                  updateForm={updateForm}
                />
                <ZipCodeInput
                  value={formData.zipcode || ''}
                  onChange={zip => updateForm({ zipcode: zip })}
                  autoFilledZip={autoZipCode}
                />
              </div>
            </div>

            {/* Company Details - Industry & Size */}
            <div className="border-t pt-6 space-y-6">
              <h3 className="text-lg font-semibold">Company Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Industry Dropdown */}
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Popover open={industryOpen} onOpenChange={setIndustryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {formData.industry || 'Select industry...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-white border border-gray-200 shadow-lg">
                      <Command>
                        <CommandInput
                          placeholder="Search industry..."
                          className="border-none focus:ring-0"
                        />
                        <CommandList>
                          <CommandEmpty>No industry found.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {INDUSTRIES.map(industry => (
                              <CommandItem
                                key={industry}
                                value={industry}
                                className="hover:bg-gray-200 cursor-pointer data-[selected=true]:bg-gray-100"
                                onSelect={() => {
                                  updateForm({
                                    industry:
                                      formData.industry === industry
                                        ? ''
                                        : industry,
                                  });
                                  setIndustryOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    formData.industry === industry
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                {industry}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Company Size Dropdown */}
                <div className="space-y-2">
                  <Label>Company Size</Label>
                  <Popover open={sizeOpen} onOpenChange={setSizeOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {formData.size || 'Select company size...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-white border border-gray-200 shadow-lg">
                      <Command>
                        <CommandInput
                          placeholder="Search size..."
                          className="border-none focus:ring-0"
                        />
                        <CommandList>
                          <CommandEmpty>No size found.</CommandEmpty>
                          <CommandGroup>
                            {COMPANY_SIZES.map(size => (
                              <CommandItem
                                key={size}
                                value={size}
                                className="hover:bg-gray-200 cursor-pointer data-[selected=true]:bg-gray-100"
                                onSelect={() => {
                                  updateForm({
                                    size: formData.size === size ? '' : size,
                                  });
                                  setSizeOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    formData.size === size
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                {size}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </AppDialogBody>

          <AppDialogChromeFooter className="justify-end px-4 sm:px-8 py-4 sm:py-5">
            <Button
              variant="outline"
              onClick={() => {
                if (hasChanges()) {
                  setShowCancelAlert(true);
                } else {
                  onOpenChange(false);
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowSaveAlert(true)}
              disabled={saving || !hasChanges()}
            >
              {saving
                ? 'Saving...'
                : isEdit
                  ? 'Update Company'
                  : 'Create Company'}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AppAlertDialogFrame>
          <AppAlertDialogGradientHeader title="Cancel Edit?" />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600">
              All changes will be discarded.
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter>
            <AlertDialogCancel onClick={e => e.stopPropagation()}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.stopPropagation();
                setShowCancelAlert(false);
                onOpenChange(false);
                toast.info('Changes discarded');
              }}
            >
              Discard Changes
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>

      <AlertDialog open={showSaveAlert} onOpenChange={setShowSaveAlert}>
        <AppAlertDialogFrame>
          <AppAlertDialogGradientHeader title="Save Changes?" />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600">
              All changes will be saved.
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowSaveAlert(false);
                handleSubmit();
              }}
            >
              Save Changes
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>
    </>
  );
}

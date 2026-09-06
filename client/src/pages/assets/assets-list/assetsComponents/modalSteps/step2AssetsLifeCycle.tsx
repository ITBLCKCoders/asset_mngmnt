import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AssetFormData, UpdateFormHandler } from '../assetTypes/assetFormTypes';
import { AssetStatus } from '../assetTypes/assetOptions';
import { formatCurrency } from '@/lib/currency';

type DepreciationMethod =
  | 'straight-line'
  | 'declining-balance'
  | 'double-declining'
  | 'units-of-production';
type AssetCondition =
  | 'New'
  | 'Excellent'
  | 'Good'
  | 'Bad'
  | 'Needs Repair'
  | 'Obsolete'
  | 'Damaged';
type MaintenanceFrequency =
  | 'Monthly'
  | 'Quarterly'
  | 'Semi-Annual'
  | 'Annually'
  | 'As Needed'
  | 'None';

/** Placeholder purchase date when "Old unit" is enabled (unknown actual date). */
const OLD_UNIT_DEFAULT_PURCHASE_DATE_ISO = new Date(2000, 0, 1).toISOString();

function isOldUnitPlaceholderPurchaseDate(iso: string | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === 2000 && d.getMonth() === 0 && d.getDate() === 1
  );
}

/** Full calendar days elapsed between the given ISO date and today (minimum 0). */
function daysElapsedSince(iso: string | undefined): number {
  if (!iso) return 0;
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return 0;
  const ms = Date.now() - start.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/**
 * Auto-calculated Accumulated Depreciation (daily proration):
 * Depreciation per Month × (days elapsed ÷ 30) since the Depreciation Start Date
 * (falls back to Purchase Date), capped at Asset Value − Salvage so Book Value
 * never drops below salvage. Returns undefined when it cannot be computed.
 */
function computeAccumulatedDepreciation(formData: AssetFormData): number | undefined {
  if (formData.isOldUnit) return undefined;
  // Use the per-month value when present; otherwise derive it from the annual
  // depreciation so the calculation does not depend on effect ordering.
  const monthly =
    formData.monthlyDepreciation ??
    (formData.annualDepreciation != null
      ? Math.round((formData.annualDepreciation / 12) * 100) / 100
      : 0);
  if (monthly <= 0) return undefined;
  const startIso = formData.depreciationStartDate || formData.purchaseDate;
  if (!startIso) return undefined;
  const days = daysElapsedSince(startIso);
  if (days <= 0) return 0;
  let next = Math.round(monthly * (days / 30) * 100) / 100;
  const cost = formData.assetValue;
  const salvage = formData.salvageValue;
  if (cost != null && salvage != null) {
    next = Math.min(next, Math.max(0, cost - salvage));
  }
  return Math.max(0, next);
}

interface Step2LifecycleProps {
  formData: AssetFormData;
  updateForm: UpdateFormHandler;
  /**
   * Add flow: when the user turns off "Old unit", clear purchase date so they enter a real one.
   * Edit flow: leave false so disabling old unit does not erase an existing date.
   */
  clearPurchaseDateWhenDisablingOldUnit?: boolean;
}

export function Step2Lifecycle({
  formData,
  updateForm,
  clearPurchaseDateWhenDisablingOldUnit = false,
}: Step2LifecycleProps) {
  const [purchaseDateOpen, setPurchaseDateOpen] = useState(false);
  const [depreciationDateOpen, setDepreciationDateOpen] = useState(false);
  const prevIsOldUnitRef = useRef<boolean | undefined>(undefined);

  const annualDepreciation = useMemo(() => {
    const cost = formData.assetValue ?? 0;
    const salvage = formData.salvageValue ?? 0;
    const life = formData.usefulLifeYears ?? 0;
    const method = formData.depreciationMethod ?? 'straight-line';

    if (!life || life <= 0 || cost <= salvage) return 0;

    let depreciation = 0;
    switch (method) {
      case 'straight-line':
        depreciation = (cost - salvage) / life;
        break;
      case 'declining-balance':
        depreciation = cost / life;
        break;
      case 'double-declining':
        depreciation = (cost / life) * 2;
        break;
      case 'units-of-production':
        // Would need units produced, but for now show 0 or N/A
        depreciation = 0;
        break;
      default:
        depreciation = (cost - salvage) / life;
    }
    return Math.round(depreciation * 100) / 100;
  }, [
    formData.assetValue,
    formData.salvageValue,
    formData.usefulLifeYears,
    formData.depreciationMethod,
  ]);

  const depreciationFormula = useMemo(() => {
    const method = formData.depreciationMethod ?? 'straight-line';
    switch (method) {
      case 'straight-line':
        return '(Asset Value − Salvage) ÷ Useful Life';
      case 'declining-balance':
        return 'Asset Value ÷ Useful Life';
      case 'double-declining':
        return '(Asset Value ÷ Useful Life) × 2';
      case 'units-of-production':
        return 'Based on units produced';
      default:
        return '(Asset Value − Salvage) ÷ Useful Life';
    }
  }, [formData.depreciationMethod]);

  useEffect(() => {
    if (manualOverrideRef.current.annualDepreciation) return;
    if (formData.annualDepreciation !== annualDepreciation) {
      updateForm('annualDepreciation', annualDepreciation);
    }
  }, [annualDepreciation, formData.annualDepreciation, updateForm]);

  // Tracks whether the user manually overrode the auto-calculated fields.
  // Starts false so stored values (including legacy/garbage ones from earlier
  // builds) are recomputed on mount; typing in a field marks it overridden,
  // and clearing it back to empty lets auto-calculation resume.
  const manualOverrideRef = useRef<{
    annualDepreciation: boolean;
    bookValue: boolean;
    accumulatedDepreciation: boolean;
    monthlyDepreciation: boolean;
  }>({
    annualDepreciation: false,
    bookValue: false,
    accumulatedDepreciation: false,
    monthlyDepreciation: false,
  });

  // Auto-calc Book Value = Asset Value − Accumulated Depreciation (unless overridden)
  useEffect(() => {
    if (formData.isOldUnit) return;
    if (manualOverrideRef.current.bookValue) return;
    const cost = formData.assetValue ?? 0;
    const acc = formData.accumulatedDepreciation ?? 0;
    if (cost === 0 && acc === 0) return;
    const next = Math.round((cost - acc) * 100) / 100;
    if (formData.bookValue !== next) {
      updateForm('bookValue', next);
    }
  }, [
    formData.assetValue,
    formData.accumulatedDepreciation,
    formData.isOldUnit,
    formData.bookValue,
    updateForm,
  ]);

  // Auto-calc Accumulated Depreciation = Monthly Depreciation × months elapsed
  // (unless overridden). Capped at Asset Value − Salvage via the helper.
  useEffect(() => {
    if (formData.isOldUnit) return;
    if (manualOverrideRef.current.accumulatedDepreciation) return;
    const computed = computeAccumulatedDepreciation(formData);
    if (computed === undefined) return;
    if (formData.accumulatedDepreciation !== computed) {
      updateForm('accumulatedDepreciation', computed);
    }
  }, [
    formData.monthlyDepreciation,
    formData.annualDepreciation,
    formData.depreciationStartDate,
    formData.purchaseDate,
    formData.assetValue,
    formData.salvageValue,
    formData.isOldUnit,
    formData.accumulatedDepreciation,
    updateForm,
  ]);

  // Auto-calc Depreciation per Month = Annual Depreciation ÷ 12 (unless overridden)
  useEffect(() => {
    if (formData.isOldUnit) return;
    if (manualOverrideRef.current.monthlyDepreciation) return;
    if (formData.annualDepreciation == null) return;
    const next = Math.round((formData.annualDepreciation / 12) * 100) / 100;
    if (formData.monthlyDepreciation !== next) {
      updateForm('monthlyDepreciation', next);
    }
  }, [
    formData.annualDepreciation,
    formData.isOldUnit,
    formData.monthlyDepreciation,
    updateForm,
  ]);

  useEffect(() => {
    const isOld = !!formData.isOldUnit;
    const wasOld = prevIsOldUnitRef.current;
    prevIsOldUnitRef.current = isOld;

    if (isOld) {
      // Legacy units: unknown purchase date — store a fixed placeholder (Jan 1, 2000)
      if (!isOldUnitPlaceholderPurchaseDate(formData.purchaseDate)) {
        updateForm('purchaseDate', OLD_UNIT_DEFAULT_PURCHASE_DATE_ISO);
      }
      if (formData.depreciationMethod !== undefined) {
        updateForm('depreciationMethod', undefined);
      }
      if (formData.depreciationStartDate) {
        updateForm('depreciationStartDate', undefined);
      }
      if (formData.assetValue !== null && formData.assetValue !== undefined) {
        updateForm('assetValue', undefined);
      }
      if (
        formData.salvageValue !== null &&
        formData.salvageValue !== undefined
      ) {
        updateForm('salvageValue', undefined);
      }
      if (
        formData.usefulLifeYears !== null &&
        formData.usefulLifeYears !== undefined
      ) {
        updateForm('usefulLifeYears', undefined);
      }
      if (
        formData.warrantyMonths !== null &&
        formData.warrantyMonths !== undefined
      ) {
        updateForm('warrantyMonths', undefined);
      }
      if (
        formData.bookValue !== null &&
        formData.bookValue !== undefined
      ) {
        updateForm('bookValue', undefined);
      }
      if (
        formData.accumulatedDepreciation !== null &&
        formData.accumulatedDepreciation !== undefined
      ) {
        updateForm('accumulatedDepreciation', undefined);
      }
      if (
        formData.monthlyDepreciation !== null &&
        formData.monthlyDepreciation !== undefined
      ) {
        updateForm('monthlyDepreciation', undefined);
      }
    } else {
      if (wasOld === true && clearPurchaseDateWhenDisablingOldUnit) {
        updateForm('purchaseDate', undefined);
      }
      // For new units, ensure default values are set
      if (!formData.depreciationMethod) {
        updateForm('depreciationMethod', 'straight-line');
      }
    }
  }, [
    formData.isOldUnit,
    updateForm,
    clearPurchaseDateWhenDisablingOldUnit,
  ]);

  // Handle asset code update when switching between Old Unit and regular asset
  useEffect(() => {
    if (formData.isOldUnit) {
      // For old units, asset code should contain "OU"
      // This is handled by the server-side logic, so we don't need to update here
      // The server will handle the asset code format based on the isOldUnit flag
    } else if (formData.purchaseDate) {
      // For regular assets with purchase date, asset code should contain month/year
      // This is also handled by the server-side logic
      // The server will generate the proper format based on purchase date
    }
  }, [formData.isOldUnit, formData.purchaseDate]);

  const handlePurchaseDateSelect = (date: Date | undefined) => {
    const iso = date ? date.toISOString() : '';
    updateForm('purchaseDate', iso);
    if (!formData.depreciationStartDate) {
      updateForm('depreciationStartDate', iso);
    }
    setPurchaseDateOpen(false);
  };

  const handleNumberChange = (field: keyof AssetFormData, value: string) => {
    updateForm(field, value === '' ? null : Number(value));
  };

  const pesoIcon = (
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-bold pointer-events-none">
      ₱
    </span>
  );

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between mb-4 p-4 border border-amber-200 bg-amber-50 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <Label className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Old unit unknown purchase date and asset value
          </Label>
        </div>
        <Switch
          checked={formData.isOldUnit || false}
          onCheckedChange={checked => updateForm('isOldUnit', checked)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
        <div className="space-y-2">
          <Label className="text-base font-semibold flex items-center gap-1">
            Purchase Date <span className="text-red-500">*</span>
          </Label>
          <Popover open={purchaseDateOpen} onOpenChange={setPurchaseDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={formData.isOldUnit}
                className={cn(
                  'w-full h-12 justify-start text-left font-normal',
                  !formData.purchaseDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                {formData.purchaseDate ? (
                  format(new Date(formData.purchaseDate), 'PPP')
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 bg-white z-[9999]"
              align="start"
            >
              <Calendar
                mode="single"
                captionLayout="dropdown"
                fixedWeeks
                fromYear={1950}
                toYear={new Date().getFullYear()}
                selected={
                  formData.purchaseDate
                    ? new Date(formData.purchaseDate)
                    : undefined
                }
                onSelect={handlePurchaseDateSelect}
                initialFocus
                className="[&_[data-selected]]:bg-red-500 [&_[data-selected]]:text-white [&_[data-radix-calendar-day]]:hover:bg-gray-200"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold flex items-center gap-1">
            Asset Value <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            {pesoIcon}
            <Input
              type="number"
              placeholder="500,000"
              value={formData.assetValue ?? ''}
              onChange={e => handleNumberChange('assetValue', e.target.value)}
              className="h-12 pl-10 text-lg font-medium"
              disabled={formData.isOldUnit || false}
            />
          </div>
          {formData.assetValue != null && formData.assetValue > 0 && (
            <p className="text-sm font-semibold text-primary">
              {formatCurrency(formData.assetValue)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">
            Salvage / Residual Value
          </Label>
          <div className="relative">
            {pesoIcon}
            <Input
              type="number"
              placeholder="50,000"
              value={formData.salvageValue ?? ''}
              onChange={e => handleNumberChange('salvageValue', e.target.value)}
              className="h-12 pl-10 text-lg font-medium"
              disabled={formData.isOldUnit || false}
            />
          </div>
          {formData.salvageValue != null && formData.salvageValue > 0 && (
            <p className="text-sm font-semibold text-emerald-600">
              {formatCurrency(formData.salvageValue)}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-base font-semibold flex items-center gap-1">
            Useful Life (years) <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            min="1"
            placeholder="5"
            value={formData.usefulLifeYears ?? ''}
            onChange={e =>
              handleNumberChange('usefulLifeYears', e.target.value)
            }
            className="h-12 text-lg font-medium"
            disabled={formData.isOldUnit || false}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">Depreciation Method</Label>
          <Select
            value={formData.depreciationMethod || ''}
            onValueChange={v =>
              updateForm('depreciationMethod', v as DepreciationMethod)
            }
            disabled={formData.isOldUnit || false}
          >
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="straight-line" className="hover:bg-gray-200">
                Straight-Line (Default)
              </SelectItem>
              <SelectItem
                value="declining-balance"
                className="hover:bg-gray-200"
              >
                Declining Balance
              </SelectItem>
              <SelectItem
                value="double-declining"
                className="hover:bg-gray-200"
              >
                Double Declining Balance
              </SelectItem>
              <SelectItem
                value="units-of-production"
                disabled
                className="hover:bg-gray-200"
              >
                Units of Production
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">Annual Depreciation</Label>
          <div className="relative">
            {pesoIcon}
            <Input
              type="number"
              placeholder="0"
              value={formData.annualDepreciation ?? ''}
              onChange={e => {
                manualOverrideRef.current.annualDepreciation =
                  e.target.value !== '';
                handleNumberChange('annualDepreciation', e.target.value);
              }}
              className="h-12 pl-10 text-lg font-medium"
              disabled={formData.isOldUnit || false}
            />
          </div>
          <p className="text-xs text-muted-foreground italic">
            {depreciationFormula} (auto-calculated)
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">Book Value</Label>
          <div className="relative">
            {pesoIcon}
            <Input
              type="number"
              placeholder="0"
              value={formData.bookValue ?? ''}
              onChange={e => {
                manualOverrideRef.current.bookValue = e.target.value !== '';
                handleNumberChange('bookValue', e.target.value);
              }}
              className="h-12 pl-10 text-lg font-medium"
              disabled={formData.isOldUnit || false}
            />
          </div>
          <p className="text-xs text-muted-foreground italic">
            Asset Value − Accumulated Depreciation (auto-calculated)
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">
            Accumulated Depreciation
          </Label>
          <div className="relative">
            {pesoIcon}
            <Input
              type="number"
              placeholder="0"
              value={formData.accumulatedDepreciation ?? ''}
              onChange={e => {
                manualOverrideRef.current.accumulatedDepreciation =
                  e.target.value !== '';
                handleNumberChange('accumulatedDepreciation', e.target.value);
              }}
              className="h-12 pl-10 text-lg font-medium"
              disabled={formData.isOldUnit || false}
            />
          </div>
          <p className="text-xs text-muted-foreground italic">
            Monthly Depreciation × days since start date ÷ 30 (auto-calculated)
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">
            Depreciation per Month
          </Label>
          <div className="relative">
            {pesoIcon}
            <Input
              type="number"
              placeholder="0"
              value={formData.monthlyDepreciation ?? ''}
              onChange={e => {
                manualOverrideRef.current.monthlyDepreciation =
                  e.target.value !== '';
                handleNumberChange('monthlyDepreciation', e.target.value);
              }}
              className="h-12 pl-10 text-lg font-medium"
              disabled={formData.isOldUnit || false}
            />
          </div>
          <p className="text-xs text-muted-foreground italic">
            Annual Depreciation ÷ 12 (auto-calculated)
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">
            Depreciation Start Date
          </Label>
          <Popover
            open={depreciationDateOpen}
            onOpenChange={setDepreciationDateOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={formData.isOldUnit || false}
                className={cn(
                  'w-full h-12 justify-start text-left font-normal',
                  !formData.depreciationStartDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                {formData.depreciationStartDate ? (
                  format(new Date(formData.depreciationStartDate), 'PPP')
                ) : (
                  <span>Same as purchase date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white z-[9999]">
              <Calendar
                mode="single"
                captionLayout="dropdown"
                fixedWeeks
                fromYear={1950}
                toYear={new Date().getFullYear()}
                selected={
                  formData.depreciationStartDate
                    ? new Date(formData.depreciationStartDate)
                    : undefined
                }
                onSelect={d => {
                  updateForm('depreciationStartDate', d?.toISOString() || '');
                  setDepreciationDateOpen(false);
                }}
                initialFocus
                className="[&_[data-selected]]:bg-red-500 [&_[data-selected]]:text-white [&_[data-radix-calendar-day]]:hover:bg-gray-200"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">
            Warranty Period (months)
          </Label>
          <Input
            type="number"
            min="0"
            placeholder="24"
            value={formData.warrantyMonths ?? ''}
            onChange={e => handleNumberChange('warrantyMonths', e.target.value)}
            className="h-12"
            disabled={formData.isOldUnit || false}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-base font-semibold flex items-center gap-1">
            Current Condition <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.condition || ''}
            onValueChange={v => updateForm('condition', v as AssetCondition)}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="New" className="hover:bg-gray-200">
                New
              </SelectItem>
              <SelectItem value="Excellent" className="hover:bg-gray-200">
                Excellent
              </SelectItem>
              <SelectItem value="Good" className="hover:bg-gray-200">
                Good
              </SelectItem>
              <SelectItem value="Bad" className="hover:bg-gray-200">
                Bad
              </SelectItem>
              <SelectItem value="Needs Repair" className="hover:bg-gray-200">
                Needs Repair
              </SelectItem>
              <SelectItem value="Obsolete" className="hover:bg-gray-200">
                Obsolete
              </SelectItem>
              <SelectItem value="Damaged" className="hover:bg-gray-200">
                Damaged
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-base font-semibold flex items-center gap-1">
            Status <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.status || 'Available'}
            onValueChange={v => updateForm('status', v as AssetStatus)}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="Available" className="hover:bg-gray-200">
                Available
              </SelectItem>
              <SelectItem value="Assigned" className="hover:bg-gray-200">
                Assigned
              </SelectItem>
              <SelectItem
                value="For Investigation"
                className="hover:bg-gray-200"
              >
                For Investigation
              </SelectItem>
              <SelectItem value="For Disposal" className="hover:bg-gray-200">
                For Disposal
              </SelectItem>
              <SelectItem value="Borrowed" className="hover:bg-gray-200">
                Borrowed
              </SelectItem>
              <SelectItem value="Service Unit" className="hover:bg-gray-200">
                Service Unit
              </SelectItem>
              <SelectItem value="For Isolation" className="hover:bg-gray-200">
                For Isolation
              </SelectItem>
              <SelectItem value="Repairing" className="hover:bg-gray-200">
                Repairing
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-base font-semibold">
            Maintenance Schedule <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.maintenanceSchedule || ''}
            onValueChange={v =>
              updateForm('maintenanceSchedule', v as MaintenanceFrequency)
            }
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="Monthly" className="hover:bg-gray-200">
                Monthly
              </SelectItem>
              <SelectItem value="Quarterly" className="hover:bg-gray-200">
                Quarterly
              </SelectItem>
              <SelectItem value="Semi-Annual" className="hover:bg-gray-200">
                Semi-Annual
              </SelectItem>
              <SelectItem value="Annually" className="hover:bg-gray-200">
                Annually
              </SelectItem>
              <SelectItem value="As Needed" className="hover:bg-gray-200">
                As Needed
              </SelectItem>
              <SelectItem value="None" className="hover:bg-gray-200">
                No Maintenance
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

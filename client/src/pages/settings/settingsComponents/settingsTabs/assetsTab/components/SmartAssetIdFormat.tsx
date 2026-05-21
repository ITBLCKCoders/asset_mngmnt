import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Package, QrCode } from 'lucide-react';
import { ActiveCompany, SmartIdFormat } from '../types';

interface SmartAssetIdFormatProps {
  activeCompany: ActiveCompany | null;
  smartIdFormat: SmartIdFormat;
  setSmartIdFormat: (format: SmartIdFormat) => void;
  settingsLoading: boolean;
  hasUnsavedChanges: boolean;
  save: () => Promise<void>;
  cancel: () => void;
}

export function SmartAssetIdFormat({
  activeCompany,
  smartIdFormat,
  setSmartIdFormat,
  settingsLoading,
  hasUnsavedChanges,
  save,
  cancel,
}: SmartAssetIdFormatProps) {

  return (
    <Card className="relative overflow-hidden border-2 border-red-500/30 bg-gradient-to-br from-red-50 to-white shadow-xl rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Smart Asset ID Format
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-6">
          Configure how asset IDs are automatically generated. Choose which
          components to include in the format.
        </p>
        <div className="bg-muted/20 rounded-xl p-4 mb-6">
          <h4 className="font-medium mb-3 text-sm">Format Components:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary/20 rounded flex items-center justify-center">
                <span className="text-primary text-xs font-bold">C</span>
              </div>
              <span>
                <strong>Company:</strong> Organization identifier
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-500/20 rounded flex items-center justify-center">
                <span className="text-emerald-600 text-xs font-bold">Cat</span>
              </div>
              <span>
                <strong>Category:</strong> Asset classification
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500/20 rounded flex items-center justify-center">
                <span className="text-purple-600 text-xs font-bold">T</span>
              </div>
              <span>
                <strong>Type:</strong> Specific asset type
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-indigo-500/20 rounded flex items-center justify-center">
                <span className="text-indigo-600 text-xs font-bold">D</span>
              </div>
              <span>
                <strong>Department:</strong> When issued to user
              </span>
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <div className="w-4 h-4 bg-orange-500/20 rounded flex items-center justify-center">
                <span className="text-orange-600 text-xs font-bold">Dt</span>
              </div>
              <span>
                <strong>Date:</strong> Purchase date (MMYY) or "OU" if none
              </span>
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <div className="w-4 h-4 bg-blue-500/20 rounded flex items-center justify-center">
                <span className="text-blue-600 text-xs font-bold">#</span>
              </div>
              <span>
                <strong>Sequential:</strong> Auto-incrementing number
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-primary font-bold text-sm">C</span>
              </div>
              <div>
                <Label className="font-medium">Company</Label>
                <p className="text-xs text-muted-foreground">Organization ID</p>
              </div>
            </div>
            <Select
              value={smartIdFormat.company}
              onValueChange={(value: 'code' | 'prefix' | 'none') =>
                setSmartIdFormat({ ...smartIdFormat, company: value })
              }
              disabled={settingsLoading}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="code" className="hover:bg-gray-200">
                  Code
                </SelectItem>
                <SelectItem value="prefix" className="hover:bg-gray-200">
                  Prefix
                </SelectItem>
                <SelectItem value="none" className="hover:bg-gray-200">
                  None
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <span className="text-emerald-600 font-bold text-sm">Cat</span>
              </div>
              <div>
                <Label className="font-medium">Category</Label>
                <p className="text-xs text-muted-foreground">Asset class</p>
              </div>
            </div>
            <Select
              value={smartIdFormat.category}
              onValueChange={(value: 'prefix' | 'code' | 'none') =>
                setSmartIdFormat({ ...smartIdFormat, category: value })
              }
              disabled={settingsLoading}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="prefix" className="hover:bg-gray-200">
                  Prefix
                </SelectItem>
                <SelectItem value="code" className="hover:bg-gray-200">
                  Code
                </SelectItem>
                <SelectItem value="none" className="hover:bg-gray-200">
                  None
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-bold text-sm">T</span>
              </div>
              <div>
                <Label className="font-medium">Type</Label>
                <p className="text-xs text-muted-foreground">Asset type</p>
              </div>
            </div>
            <Select
              value={smartIdFormat.type}
              onValueChange={(value: 'prefix' | 'none') =>
                setSmartIdFormat({ ...smartIdFormat, type: value })
              }
              disabled={settingsLoading}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="prefix" className="hover:bg-gray-200">
                  Prefix
                </SelectItem>
                <SelectItem value="none" className="hover:bg-gray-200">
                  None
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <span className="text-indigo-600 font-bold text-sm">D</span>
              </div>
              <div>
                <Label className="font-medium">Department</Label>
                <p className="text-xs text-muted-foreground">When issued</p>
              </div>
            </div>
            <Select
              value={smartIdFormat.department}
              onValueChange={(value: 'code' | 'prefix' | 'none') =>
                setSmartIdFormat({ ...smartIdFormat, department: value })
              }
              disabled={settingsLoading}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="code" className="hover:bg-gray-200">
                  Code
                </SelectItem>
                <SelectItem value="prefix" className="hover:bg-gray-200">
                  Prefix
                </SelectItem>
                <SelectItem value="none" className="hover:bg-gray-200">
                  None
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 font-bold text-sm">Dt</span>
              </div>
              <div>
                <Label className="font-medium">Include Date</Label>
                <p className="text-xs text-muted-foreground">
                  Purchase date (MMYY) or "OU" if none
                </p>
              </div>
            </div>
            <Switch
              checked={smartIdFormat.includeDate}
              onCheckedChange={checked =>
                setSmartIdFormat({ ...smartIdFormat, includeDate: checked })
              }
              disabled={settingsLoading}
            />
          </div>
        </div>
        <div className="p-8 bg-card border rounded-2xl font-mono text-xl tracking-wider text-center shadow-inner">
          {(() => {
            const parts = [];
            if (smartIdFormat.company !== 'none')
              parts.push(
                <span key="company" className="text-primary">
                  {smartIdFormat.company === 'code'
                    ? activeCompany?.code || 'COM'
                    : activeCompany?.prefix || 'COMP'}
                </span>
              );
            if (smartIdFormat.category !== 'none')
              parts.push(
                <span key="category" className="text-emerald-600">
                  {smartIdFormat.category === 'prefix' ? 'VEH' : '2003'}
                </span>
              );
            if (smartIdFormat.type !== 'none')
              parts.push(
                <span key="type" className="text-purple-600">
                  {smartIdFormat.type === 'prefix' ? 'LAP' : '001'}
                </span>
              );
            if (smartIdFormat.department !== 'none')
              parts.push(
                <span key="department" className="text-indigo-600">
                  {smartIdFormat.department === 'prefix' ? 'IT' : '100'}
                </span>
              );
            if (smartIdFormat.includeDate)
              parts.push(
                <span key="date" className="text-orange-600">
                  1124
                </span>
              );
            parts.push(
              <span key="sequential" className="text-blue-600">
                00001
              </span>
            );
            return parts.map((part, index) => (
              <span key={part.key}>
                {part}
                {index < parts.length - 1 ? '-' : ''}
              </span>
            ));
          })()}
        </div>
      </CardContent>
      {hasUnsavedChanges && (
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={cancel} disabled={settingsLoading}>
            Cancel
          </Button>
          <Button onClick={save} disabled={settingsLoading}>
            {settingsLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

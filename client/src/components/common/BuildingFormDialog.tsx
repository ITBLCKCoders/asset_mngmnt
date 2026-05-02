import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface BuildingFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  companyId?: string;
  onSuccess?: () => void;
}

export function BuildingFormDialog({
  isOpen,
  setIsOpen,
  companyId,
  onSuccess,
}: BuildingFormDialogProps) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.post('/buildings', {
        ...form,
        company_id: companyId,
      });
      toast.success(response.message || 'Building created successfully');
      setForm({ name: '', description: '' });
      setIsOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to save building:', error);
      toast.error(error.message || 'Failed to save building');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm({ name: '', description: '' });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <AppDialogFrame className="sm:max-w-md max-h-[80vh] overflow-hidden !flex !flex-col">
        <AppDialogGradientHeader
          title="Create New Building"
          description="Add a new building for your locations."
        />
        <AppDialogBody className="grid max-h-[60vh] gap-6 overflow-y-auto px-8 py-6 pr-2">
          <div className="space-y-2">
            <Label className="text-base font-medium">Building Name</Label>
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Main Building, Annex A"
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">
              Description (Optional)
            </Label>
            <Textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Additional details about this building"
              className="text-base min-h-[60px]"
            />
          </div>
        </AppDialogBody>
        <AppDialogChromeFooter className="justify-end gap-3 px-8 py-5">
          <Button
            variant="outline"
            onClick={handleClose}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.name}
            className="rounded-xl px-6 shadow-md"
          >
            {saving ? 'Saving...' : 'Create Building'}
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}

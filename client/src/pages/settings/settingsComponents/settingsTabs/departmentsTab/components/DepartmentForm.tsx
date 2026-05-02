import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Department } from '@/types/assets';
import { toast } from 'sonner';

interface DepartmentFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editing: Department | null;
  onSave: (form: {
    name: string;
    code: string;
    prefix: string;
    description: string;
  }) => Promise<boolean>;
  saving: boolean;
  trigger: React.ReactNode;
}

export function DepartmentForm({
  isOpen,
  setIsOpen,
  editing,
  onSave,
  saving,
  trigger,
}: DepartmentFormProps) {
  const [form, setForm] = useState({
    name: '',
    code: '',
    prefix: '',
    description: '',
  });
  const [initialForm, setInitialForm] = useState({
    name: '',
    code: '',
    prefix: '',
    description: '',
  });
  const [showCancelAlert, setShowCancelAlert] = useState(false);

  const hasChanges = () => {
    return (
      form.name !== initialForm.name ||
      form.code !== initialForm.code ||
      form.prefix !== initialForm.prefix ||
      form.description !== initialForm.description
    );
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && hasChanges()) {
      setShowCancelAlert(true);
    } else {
      setIsOpen(open);
    }
  };

  const handleSave = async () => {
    const success = await onSave(form);
    if (success) {
      setIsOpen(false);
      setForm({ name: '', code: '', prefix: '', description: '' });
      setShowCancelAlert(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges()) {
      setShowCancelAlert(true);
    } else {
      setIsOpen(false);
    }
  };

  // Initialize form when editing changes
  useEffect(() => {
    if (editing) {
      const formData = {
        name: editing.name,
        code: editing.code,
        prefix: editing.prefix || '',
        description: editing.description || '',
      };
      setForm(formData);
      setInitialForm(formData);
    } else {
      const emptyForm = { name: '', code: '', prefix: '', description: '' };
      setForm(emptyForm);
      setInitialForm(emptyForm);
    }
  }, [editing]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <AppDialogFrame className="sm:max-w-md">
          <AppDialogGradientHeader
            title={editing ? 'Edit Department' : 'Create New Department'}
            description={
              editing
                ? 'Update department name, code, and details.'
                : 'Add a department with a unique code and optional prefix.'
            }
          />
          <AppDialogBody className="grid gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">Department Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Information Technology, Human Resources"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Department Code</Label>
              <Input
                value={form.code}
                onChange={e =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                maxLength={10}
                placeholder="IT, HR, FIN"
                className="font-mono text-base tracking-wider"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Prefix (Optional)</Label>
              <Input
                value={form.prefix}
                onChange={e =>
                  setForm({ ...form, prefix: e.target.value.toUpperCase() })
                }
                maxLength={10}
                placeholder="e.g., DEPT, DIV"
                className="font-mono text-base tracking-wider"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Description (Optional)
              </Label>
              <Textarea
                value={form.description}
                onChange={e =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Brief description of the department's role"
                className="text-base min-h-[60px]"
              />
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className="rounded-xl px-6 shadow-md"
            >
              {saving
                ? 'Saving...'
                : editing
                  ? 'Update Department'
                  : 'Create Department'}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      {/* Cancel Alert Dialog */}
      <Dialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AppDialogFrame className="sm:max-w-md">
          <AppDialogGradientHeader
            title="Cancel Edit?"
            description="All changes will be discarded."
          />
          <AppDialogChromeFooter>
            <Button variant="outline" onClick={() => setShowCancelAlert(false)}>
              Keep Editing
            </Button>
            <Button
              onClick={() => {
                setShowCancelAlert(false);
                setIsOpen(false);
                toast.info('Changes discarded');
              }}
            >
              Discard Changes
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>
    </>
  );
}

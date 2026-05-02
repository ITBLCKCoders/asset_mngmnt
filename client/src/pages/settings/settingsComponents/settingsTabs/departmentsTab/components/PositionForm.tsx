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
import { Position, Department } from '@/types/assets';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PositionFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editing: Position | null;
  onSave: (form: {
    name: string;
    description: string;
    department_id: string;
  }) => Promise<boolean>;
  saving: boolean;
  trigger: React.ReactNode;
  departments: Department[];
}

export function PositionForm({
  isOpen,
  setIsOpen,
  editing,
  onSave,
  saving,
  trigger,
  departments,
}: PositionFormProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    department_id: '',
  });
  const [initialForm, setInitialForm] = useState({
    name: '',
    description: '',
    department_id: '',
  });
  const [showCancelAlert, setShowCancelAlert] = useState(false);

  const hasChanges = () => {
    return (
      form.name !== initialForm.name ||
      form.description !== initialForm.description ||
      form.department_id !== initialForm.department_id
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
      setForm({ name: '', description: '', department_id: '' });
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
        description: editing.description || '',
        department_id: editing.department_id,
      };
      setForm(formData);
      setInitialForm(formData);
    } else {
      const emptyForm = { name: '', description: '', department_id: '' };
      setForm(emptyForm);
      setInitialForm(emptyForm);
    }
  }, [editing, departments]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <AppDialogFrame className="sm:max-w-md">
          <AppDialogGradientHeader
            title={editing ? 'Edit Position' : 'Create New Position'}
            description={
              editing
                ? 'Update this position and its department.'
                : 'Create a position and assign it to a department.'
            }
          />
          <AppDialogBody className="grid gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">Position Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Software Engineer, HR Manager"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Department</Label>
              <Select
                value={form.department_id}
                onValueChange={value =>
                  setForm({ ...form, department_id: value })
                }
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {departments.map(dept => (
                    <SelectItem
                      key={dept.departmentID}
                      value={dept.departmentID}
                      className="hover:bg-gray-200"
                    >
                      {dept.name} ({dept.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                placeholder="Brief description of the position's role"
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
                  ? 'Update Position'
                  : 'Create Position'}
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

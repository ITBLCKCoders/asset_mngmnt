import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Plus, Trash2, Users } from 'lucide-react';
import { Department } from '@/types/assets';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface LocationFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  companyId?: string;
  departmentId?: string;
  onSuccess?: () => void;
}

export function LocationFormDialog({
  isOpen,
  setIsOpen,
  companyId,
  departmentId,
  onSuccess,
}: LocationFormDialogProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState({
    name: '',
    floor_unit: '',
    building: '',
    room_areas: [] as { room_name: string }[],
    department_id: departmentId || '',
    description: '',
    departmentSearch: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (departmentId) {
      setForm(prev => ({ ...prev, department_id: departmentId }));
    }
  }, [departmentId]);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.post('/locations', {
        ...form,
        company_id: companyId,
        room_areas: form.room_areas.filter(r => r.room_name),
      });
      toast.success(response.message || 'Location created successfully');
      setForm({
        name: '',
        floor_unit: '',
        building: '',
        room_areas: [],
        department_id: departmentId || '',
        description: '',
        departmentSearch: '',
      });
      setIsOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to save location:', error);
      toast.error(error.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm({
      name: '',
      floor_unit: '',
      building: '',
      room_areas: [],
      department_id: departmentId || '',
      description: '',
      departmentSearch: '',
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <AppDialogFrame className="sm:max-w-md max-h-[80vh]">
        <AppDialogGradientHeader
          title="Create New Location"
          description="Add a new location and optionally assign it to a department."
        />
        <AppDialogBody className="grid gap-6 pr-2 overflow-y-auto max-h-[60vh]">
          <div className="space-y-2">
            <Label className="text-base font-medium">Location Name</Label>
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Main Office, Warehouse A"
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">Floor/Unit</Label>
            <Input
              value={form.floor_unit}
              onChange={e => setForm({ ...form, floor_unit: e.target.value })}
              placeholder="e.g., Floor 5, Unit 101"
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">Building</Label>
            <Input
              value={form.building}
              onChange={e => setForm({ ...form, building: e.target.value })}
              placeholder="e.g., Main Building, Annex A"
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">Rooms/Areas</Label>
            <div className="space-y-2">
              {form.room_areas.map((room, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={room.room_name}
                    onChange={e => {
                      const newRooms = [...form.room_areas];
                      newRooms[index] = { ...room, room_name: e.target.value };
                      setForm({ ...form, room_areas: newRooms });
                    }}
                    placeholder="e.g., Conference Room 101"
                    className="text-base"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newRooms = form.room_areas.filter((_, i) => i !== index);
                      setForm({ ...form, room_areas: newRooms });
                    }}
                    className="px-3"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm({
                    ...form,
                    room_areas: [...form.room_areas, { room_name: '' }],
                  })
                }
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Room/Area
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Department (Optional)
            </Label>
            <Select
              value={form.department_id || 'none'}
              onValueChange={v =>
                setForm({ ...form, department_id: v === 'none' ? '' : v })
              }
            >
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-60">
                <div className="px-3 py-2 border-b">
                  <div className="relative">
                    <svg
                      className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search departments..."
                      value={form.departmentSearch || ''}
                      onChange={e =>
                        setForm({ ...form, departmentSearch: e.target.value })
                      }
                      onKeyDown={e => e.stopPropagation()}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <SelectItem value="none" className="hover:bg-gray-200">
                    No department
                  </SelectItem>
                  {departments
                    .filter(
                      dept =>
                        dept.name
                          .toLowerCase()
                          .includes((form.departmentSearch || '').toLowerCase()) ||
                        dept.code
                          .toLowerCase()
                          .includes((form.departmentSearch || '').toLowerCase())
                    )
                    .map(dept => (
                      <SelectItem
                        key={dept.departmentID}
                        value={dept.departmentID}
                        className="hover:bg-gray-200"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{dept.name}</span>
                          <span className="text-sm text-gray-500">
                            ({dept.code})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </div>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">
              Description (Optional)
            </Label>
            <Textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Additional details about this location"
              className="text-base min-h-[60px]"
            />
          </div>
        </AppDialogBody>
        <AppDialogChromeFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.name || !form.building}
            className="rounded-xl px-6 shadow-md"
          >
            {saving ? 'Saving...' : 'Create Location'}
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}

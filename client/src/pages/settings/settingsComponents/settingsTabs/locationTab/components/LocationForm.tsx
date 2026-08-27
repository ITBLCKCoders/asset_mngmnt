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
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Plus, Trash2, Users } from 'lucide-react';
import { Location, Department } from '@/types/assets';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface LocationFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editing: Location | null;
  setEditing: (location: Location | null) => void;
  form: {
    name: string;
    floor_unit: string;
    building: string;
    room_areas: { roomID?: string; room_name: string }[];
    department_id: string;
    description: string;
    departmentSearch?: string;
  };
  setForm: (form: {
    name: string;
    floor_unit: string;
    building: string;
    room_areas: { roomID?: string; room_name: string }[];
    department_id: string;
    description: string;
    departmentSearch?: string;
  }) => void;
  initialForm: {
    name: string;
    floor_unit: string;
    building: string;
    room_areas: { roomID?: string; room_name: string }[];
    department_id: string;
    description: string;
    departmentSearch?: string;
  };
  setInitialForm: (form: {
    name: string;
    floor_unit: string;
    building: string;
    room_areas: { roomID?: string; room_name: string }[];
    department_id: string;
    description: string;
    departmentSearch?: string;
  }) => void;
  hasChanges: () => boolean;
  handleSave: () => void;
  saving: boolean;
  showCancelAlert: boolean;
  setShowCancelAlert: (show: boolean) => void;
  canCreate: boolean;
}

const LocationForm = ({
  isOpen,
  setIsOpen,
  editing,
  setEditing,
  form,
  setForm,
  initialForm,
  setInitialForm,
  hasChanges,
  handleSave,
  saving,
  showCancelAlert,
  setShowCancelAlert,
  canCreate,
}: LocationFormProps) => {
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!canCreate}
          onClick={() => {
            setEditing(null);
            setForm({
              name: '',
              floor_unit: '',
              building: '',
              room_areas: [],
              department_id: '',
              description: '',
              departmentSearch: '',
            });
            setInitialForm({
              name: '',
              floor_unit: '',
              building: '',
              room_areas: [],
              department_id: '',
              description: '',
              departmentSearch: '',
            });
          }}
        >
          <Plus className="mr-2 h-5 w-5" />
          Add New Location
        </Button>
      </DialogTrigger>

      <AppDialogFrame className="sm:max-w-md max-h-[80vh]">
        <AppDialogGradientHeader
          title={editing ? 'Edit Location' : 'Create New Location'}
          description={
            editing
              ? 'Update location details and department assignment.'
              : 'Add a new location and optionally assign it to a department.'
          }
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
                      const newRooms = form.room_areas.filter(
                        (_, i) => i !== index
                      );
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
                {/* Search input */}
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

                {/* Department list */}
                <div className="max-h-48 overflow-y-auto">
                  <SelectItem value="none" className="hover:bg-gray-200">
                    No department
                  </SelectItem>
                  {departments
                    .filter(
                      dept =>
                        dept.name
                          .toLowerCase()
                          .includes(
                            (form.departmentSearch || '').toLowerCase()
                          ) ||
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
                  {departments.filter(
                    dept =>
                      dept.name
                        .toLowerCase()
                        .includes(
                          (form.departmentSearch || '').toLowerCase()
                        ) ||
                      dept.code
                        .toLowerCase()
                        .includes((form.departmentSearch || '').toLowerCase())
                  ).length === 0 && (
                    <div className="px-2 py-2 text-sm text-gray-500 text-center">
                      No departments found
                    </div>
                  )}
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
            onClick={() => {
              if (hasChanges()) {
                setShowCancelAlert(true);
              } else {
                setIsOpen(false);
              }
            }}
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
                ? 'Update Location'
                : 'Create Location'}
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
};

export default LocationForm;

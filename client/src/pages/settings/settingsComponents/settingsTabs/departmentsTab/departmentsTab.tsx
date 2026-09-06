import { useState, useEffect } from 'react';
import { SettingsDepartmentsTabSkeleton } from '@/components/common/pageSkeletons';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  segmentTabsListClassName,
  segmentTabsTriggerClassName,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Building, Sparkles } from 'lucide-react';
import { Department, Position } from '@/types/assets';
import { useDepartments } from '@/hooks/useDepartments';
import { usePositions } from '@/hooks/usePositions';
import { DepartmentForm } from './components/DepartmentForm';
import { DepartmentTable } from './components/DepartmentTable';
import { PositionForm } from './components/PositionForm';
import { PositionTable } from './components/PositionTable';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export function DepartmentsTab({
  isActive,
  action,
}: {
  isActive?: boolean;
  action?: string;
}) {
  const { hasPermission } = useUserPermissions();

  // Departments state
  const {
    departments,
    loading: departmentsLoading,
    saving: departmentsSaving,
    isTabLoading,
    activeCompany,
    copyingSettings,
    handleSave: handleDepartmentSave,
    handleDelete: handleDepartmentDelete,
    copyMainCompanySettings,
  } = useDepartments(isActive || false, action);

  // Positions state
  const {
    positions,
    loading: positionsLoading,
    saving: positionsSaving,
    deleting: positionsDeleting,
    fetchPositions,
    handleSave: handlePositionSave,
    handleDelete: handlePositionDelete,
  } = usePositions(isActive || false);

  // Departments form state
  const [departmentsOpen, setDepartmentsOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [deletingDepartment, setDeletingDepartment] =
    useState<Department | null>(null);

  // Positions form state
  const [positionsOpen, setPositionsOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [deletingPosition, setDeletingPosition] = useState<Position | null>(
    null
  );

  useEffect(() => {
    if (isActive && action === 'add' && !departmentsOpen) {
      setDepartmentsOpen(true);
    }
    // Initial fetch when tab becomes active
    if (isActive) {
      fetchPositions();
    }
  }, [isActive, action, departmentsOpen]);

  // Departments handlers
  const handleDepartmentEdit = (department: Department) => {
    setEditingDepartment(department);
    setDepartmentsOpen(true);
  };

  const handleDepartmentAddNew = () => {
    setEditingDepartment(null);
    setDepartmentsOpen(true);
  };

  const onDepartmentSave = async (form: {
    name: string;
    code: string;
    prefix: string;
    description: string;
  }) => {
    const success = await handleDepartmentSave(form, editingDepartment);
    if (success) {
      setDepartmentsOpen(false);
      setEditingDepartment(null);
    }
    return success;
  };

  const onDepartmentDelete = async (department: Department) => {
    const success = await handleDepartmentDelete(department);
    if (success) {
      setDeletingDepartment(null);
    }
    return success;
  };

  // Positions handlers
  const handlePositionEdit = (position: Position) => {
    setEditingPosition(position);
    setPositionsOpen(true);
  };

  const handlePositionAddNew = () => {
    setEditingPosition(null);
    setPositionsOpen(true);
  };

  const onPositionSave = async (form: {
    name: string;
    description: string;
    department_id: string;
  }) => {
    const success = await handlePositionSave(form, editingPosition);
    if (success) {
      setPositionsOpen(false);
      setEditingPosition(null);
    }
    return success;
  };

  const onPositionDelete = async (position: Position) => {
    const success = await handlePositionDelete(position);
    if (success) {
      setDeletingPosition(null);
    }
    return success;
  };

  // Create department name mapping for positions table
  const departmentMap = departments.reduce(
    (acc, dept) => {
      acc[dept.departmentID] = `${dept.name} (${dept.code})`;
      return acc;
    },
    {} as Record<string, string>
  );

  // Skeleton stays until the minimum display time passes AND the real
  // departments/positions queries resolve — avoids the flash where the
  // skeleton vanishes while tables are still loading their own states.
  const showSkeleton = isTabLoading || departmentsLoading || positionsLoading;

  if (showSkeleton) {
    return <SettingsDepartmentsTabSkeleton />;
  }

  return (
    <TabsContent value="departments" className="mt-0">
      {/* Copy from Main Company Button - Only show for non-main companies that have no existing data */}
      {activeCompany && !activeCompany.is_main && departments.length === 0 && (
        <div className="mb-6">
          <Button
            onClick={copyMainCompanySettings}
            disabled={copyingSettings}
            variant="outline"
            className="w-full sm:w-auto bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100 text-green-700 hover:text-green-800 font-medium rounded-xl shadow-sm"
          >
            {copyingSettings ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                Copying Settings...
              </>
            ) : (
              <>
                <Building className="mr-2 h-4 w-4" />
                Use the same settings for the departments as the main company
              </>
            )}
          </Button>
        </div>
      )}

      {/* Nested sub-tabs — Departments / Positions (same pattern as FormsTab) */}
      <Tabs defaultValue="departments-list" className="space-y-6">
        <TabsList
          className={segmentTabsListClassName + ' flex w-full overflow-x-auto scrollbar-hide'}
        >
          <TabsTrigger
            value="departments-list"
            className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
          >
            Departments
          </TabsTrigger>
          <TabsTrigger
            value="positions"
            className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
          >
            Positions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments-list" className="mt-0">
          <section className="mb-10">
            <div className="bg-red-600 rounded-t-2xl p-6 mb-0">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    Departments
                  </h2>
                  <p className="text-white/80 mt-2">
                    Organize your organization structure and assign assets to
                    departments
                  </p>
                </div>

                <DepartmentForm
                  isOpen={departmentsOpen}
                  setIsOpen={setDepartmentsOpen}
                  editing={editingDepartment}
                  onSave={onDepartmentSave}
                  saving={departmentsSaving}
                  trigger={
                    <Button
                      size="lg"
                      className="shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!hasPermission('Departments', 'create')}
                      onClick={handleDepartmentAddNew}
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      Add New Department
                    </Button>
                  }
                />
              </div>
            </div>

            <div className="p-5 border border-t-0 border-gray-200 rounded-b-2xl bg-card">
              <DepartmentTable
                departments={departments}
                loading={departmentsLoading}
                onEdit={handleDepartmentEdit}
                onDelete={onDepartmentDelete}
                deleting={deletingDepartment}
                setDeleting={setDeletingDepartment}
                onAddNew={handleDepartmentAddNew}
              />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="positions" className="mt-0">
          <section className="mb-10">
            <div className="bg-red-600 rounded-t-2xl p-6 mb-0">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    Positions
                  </h2>
                  <p className="text-white/80 mt-2">
                    Manage job positions within your departments
                  </p>
                </div>

                <PositionForm
                  isOpen={positionsOpen}
                  setIsOpen={setPositionsOpen}
                  editing={editingPosition}
                  onSave={onPositionSave}
                  saving={positionsSaving}
                  trigger={
                    <Button
                      size="lg"
                      className="shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={
                        !hasPermission('Positions', 'create') ||
                        departments.length === 0
                      }
                      onClick={handlePositionAddNew}
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      Add New Position
                    </Button>
                  }
                  departments={departments}
                />
              </div>
            </div>

            <div className="p-5 border border-t-0 border-gray-200 rounded-b-2xl bg-card">
              <PositionTable
                positions={positions}
                loading={positionsLoading}
                onEdit={handlePositionEdit}
                onDelete={onPositionDelete}
                deleting={deletingPosition}
                setDeleting={setDeletingPosition}
                onAddNew={handlePositionAddNew}
                departments={departmentMap}
              />
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </TabsContent>
  );
}

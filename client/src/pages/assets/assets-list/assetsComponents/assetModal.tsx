'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Package,
  Wrench,
  MapPin,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Users } from 'lucide-react';

import { Step1AssetInfo } from './modalSteps/step1AssetsInfo';
import { Step2Lifecycle } from './modalSteps/step2AssetsLifeCycle';
import { Step3Location } from './modalSteps/step3Location';
import { Step4Review } from './modalSteps/step4AssetsReview';

import {
  AssetFormData,
  UpdateFormHandler,
  initialAssetFormData,
} from '../assetsComponents/assetTypes/assetFormTypes';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AssetFormData) => Promise<void>;
}

const steps = [
  { title: 'Asset Info', icon: Package },
  { title: 'Lifecycle', icon: Wrench },
  { title: 'Location', icon: MapPin },
  { title: 'Review', icon: CheckCircle2 },
] as const;

const stepTitles = [
  'Asset Information',
  'Financial & Lifecycle Information',
  'Location & Assignment',
  '',
] as const;

const isStepValid = (step: number, data: AssetFormData) => {
  if (step === 0) {
    return !!(
      data.name &&
      data.categoryId &&
      data.supplier &&
      data.typeId &&
      data.brand &&
      data.model &&
      data.serial
    );
  }
  if (step === 1) {
    if (data.isOldUnit) {
      return !!(data.condition && data.status && data.maintenanceSchedule);
    } else {
      return !!(
        data.purchaseDate &&
        data.assetValue &&
        data.usefulLifeYears &&
        data.condition &&
        data.status
      );
    }
  }
  if (step === 2) {
    return !!(
      data.company &&
      data.locationBuilding &&
      data.department &&
      data.locationSite &&
      data.locationRoom
    );
  }
  return true;
};

const STORAGE_KEY = 'assetFormDraft';

export function AddAssetModal({
  isOpen,
  onClose,
  onSubmit,
}: AddAssetModalProps) {
  const { user } = useCurrentUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<AssetFormData>(initialAssetFormData);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add dialogs state
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [isAddBrandOpen, setIsAddBrandOpen] = useState(false);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);

  // Form states for add dialogs
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    prefix: '',
    gl_code: '',
    departmentId: '',
  });
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    categoryId: '',
    contact: '',
    email: '',
  });
  const [typeForm, setTypeForm] = useState({
    name: '',
    categoryId: '',
    prefix: '',
  });
  const [brandForm, setBrandForm] = useState({
    name: '',
    typeId: '',
    prefix: '',
  });
  const [locationForm, setLocationForm] = useState({
    name: '',
    floor_unit: '',
    building: '',
    room_areas: [{ room_name: '' }],
    department_id: '',
    description: '',
  });

  // Data states for dropdowns
  const [categories, setCategories] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [activeCompany, setActiveCompany] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [hasSmartIdFormat, setHasSmartIdFormat] = useState<boolean>(true);

  // Saving states
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  const { roleCustodian } = useUserPermissions();

  const categoriesForStep1 = useMemo(() => {
    if (!roleCustodian || categories.length === 0) return categories;
    const deptName = (c: any) =>
      (typeof c.department === 'object' && c.department?.name
        ? c.department.name
        : ''
      )
        .toString()
        .toLowerCase();
    const isIT = (n: string) =>
      n.includes('it') || n.includes('information technology');
    const isAdmin = (n: string) =>
      n.includes('admin') || n.includes('administration');
    const scope =
      roleCustodian.managerRole === 'overallManager'
        ? null
        : roleCustodian.managerRole === 'itManager' ||
            roleCustodian.assetType === 'it'
          ? 'it'
          : roleCustodian.managerRole === 'adminManager' ||
              roleCustodian.assetType === 'admin'
            ? 'admin'
            : null;
    let filtered = categories;
    if (scope === 'it') filtered = categories.filter(c => isIT(deptName(c)));
    else if (scope === 'admin')
      filtered = categories.filter(c => isAdmin(deptName(c)));
    return [...filtered].sort((a, b) => {
      const aIT = isIT(deptName(a));
      const bIT = isIT(deptName(b));
      if (aIT && !bIT) return -1;
      if (!aIT && bIT) return 1;
      const aAdmin = isAdmin(deptName(a));
      const bAdmin = isAdmin(deptName(b));
      if (aAdmin && !bAdmin) return 1;
      if (!aAdmin && bAdmin) return -1;
      return 0;
    });
  }, [categories, roleCustodian]);

  const canAddLocation = useMemo(() => {
    if (user?.role?.name === 'Super Admin' || user?.role?.name === 'Admin')
      return true;
    if (
      roleCustodian &&
      (roleCustodian.assetType === 'it' ||
        roleCustodian.assetType === 'admin' ||
        ['itManager', 'adminManager', 'overallManager'].includes(
          roleCustodian.managerRole
        ))
    )
      return true;
    return false;
  }, [user?.role?.name, roleCustodian]);

  const updateForm: UpdateFormHandler = (key, value) => {
    setFormData(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      return { ...prev, [key]: newValue };
    });
  };

  const saveDraft = (data: AssetFormData) => {
    const draft = { ...data };
    delete draft.imageFile;
    delete draft.documents;
    delete draft.imageUrl;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  };

  const loadDraft = (): AssetFormData | null => {
    const draft = localStorage.getItem(STORAGE_KEY);
    if (draft) {
      try {
        return { ...initialAssetFormData, ...JSON.parse(draft) };
      } catch {
        return null;
      }
    }
    return null;
  };

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasMeaningfulDraft = (draft: AssetFormData | null): boolean => {
    if (!draft) return false;
    // Check if any key fields have been filled
    return !!(
      draft.name ||
      draft.categoryId ||
      draft.supplier ||
      draft.typeId ||
      draft.brand ||
      draft.model ||
      draft.serial ||
      draft.description ||
      draft.purchaseDate ||
      draft.assetValue ||
      draft.locationSite ||
      draft.department
    );
  };

  const fetchActiveCompany = async () => {
    try {
      const data = await api.get('/companies/active');
      setActiveCompany(data?.data?.[0] || null);
    } catch (error) {
      console.error('Failed to fetch active company:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };

  const fetchCategories = async () => {
    if (!activeCompany) return;
    try {
      const data = await api.get(`/categories?company_id=${activeCompany.id}`);
      setCategories(
        data.map((cat: any) => ({ ...cat, id: cat.categoryID || cat.id }))
      );
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchTypes = async () => {
    if (!activeCompany) return;
    try {
      const data = await api.get(`/types?company_id=${activeCompany.id}`);
      setTypes(
        data.map((type: any) => ({ ...type, id: type.typeID || type.id }))
      );
    } catch (error) {
      console.error('Failed to fetch types:', error);
    }
  };

  const fetchSuppliers = async () => {
    if (!activeCompany) return;
    try {
      const data = await api.get(`/suppliers?company_id=${activeCompany.id}`);
      setSuppliers(
        data.map((supplier: any) => ({
          ...supplier,
          id: supplier.supplierID || supplier.id,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchBrands = async () => {
    if (!activeCompany) return;
    try {
      const data = await api.get(`/brands?company_id=${activeCompany.id}`);
      setBrands(
        data.map((brand: any) => ({ ...brand, id: brand.brandID || brand.id }))
      );
    } catch (error) {
      console.error('Failed to fetch brands:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations');
      setLocations(response.locations || []);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocations([]);
    }
  };

  const checkSmartIdFormat = async () => {
    if (!activeCompany) return;
    try {
      const response = await api.get('/settings/asset-id-format');
      const settings = response.settings || [];
      const hasFormat = settings.some(
        (s: any) => s.company_id === activeCompany.id
      );
      setHasSmartIdFormat(hasFormat);
    } catch (error) {
      console.error('Failed to check Smart Asset ID Format:', error);
      setHasSmartIdFormat(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const draft = loadDraft();
      if (hasMeaningfulDraft(draft)) {
        setShowContinueDialog(true);
      } else {
        // Clear empty or meaningless drafts and start fresh
        clearDraft();
        setFormData(initialAssetFormData);
      }
      fetchActiveCompany();
      fetchDepartments();
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeCompany) {
      fetchCategories();
      fetchTypes();
      fetchSuppliers();
      fetchBrands();
      fetchLocations();
      checkSmartIdFormat();
    }
  }, [activeCompany]);

  useEffect(() => {
    if (user && isOpen) {
      setFormData(prev => {
        const newCompany =
          user.company || prev.company || activeCompany?.name || '';
        return {
          ...prev,
          company: newCompany,
        };
      });
    }
  }, [user, isOpen, departments]);

  const handleContinueYes = () => {
    const draft = loadDraft();
    if (draft) {
      setFormData(draft);
    }
    setShowContinueDialog(false);
  };

  const handleContinueNo = () => {
    clearDraft();
    setFormData(initialAssetFormData);
    setShowContinueDialog(false);
  };

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      setIsSubmitting(true);
      try {
        await onSubmit(formData);
        clearDraft();
        setCurrentStep(0);
        setFormData(initialAssetFormData);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleClose = () => {
    saveDraft(formData);
    setCurrentStep(0);
    setFormData(initialAssetFormData);
    onClose();
  };

  // Save functions for add dialogs
  const handleSaveCategory = async () => {
    try {
      setSavingCategory(true);
      const response = await api.post('/categories', categoryForm);
      const newCategory = {
        ...categoryForm,
        id: response.id || response.categoryID || `temp-${Date.now()}`,
      };
      setCategories(prev => [...prev, newCategory]); // Optimistic update
      updateForm('categoryId', newCategory.id.toString()); // Pre-select the new category
      updateForm('category', newCategory.name); // Set category name
      toast.success('Category created successfully');
      setIsAddCategoryOpen(false);
      setCategoryForm({ name: '', prefix: '', gl_code: '', departmentId: '' });
      fetchCategories(); // Refetch to get correct data
    } catch (error: any) {
      console.error('Failed to save category:', error);
      toast.error(error.message || 'Failed to save category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSaveSupplier = async () => {
    try {
      setSavingSupplier(true);
      const response = await api.post('/suppliers', supplierForm);
      const newSupplier = {
        ...supplierForm,
        id: response.id || response.supplierID || `temp-${Date.now()}`,
      };
      setSuppliers(prev => [...prev, newSupplier]); // Optimistic update
      updateForm('supplier', newSupplier.name); // Pre-select the new supplier
      toast.success('Supplier created successfully');
      setIsAddSupplierOpen(false);
      setSupplierForm({ name: '', categoryId: '', contact: '', email: '' });
      fetchSuppliers(); // Refetch to get correct data
    } catch (error: any) {
      console.error('Failed to save supplier:', error);
      toast.error(error.message || 'Failed to save supplier');
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleSaveType = async () => {
    try {
      setSavingType(true);
      const response = await api.post('/types', typeForm);
      const newType = {
        ...typeForm,
        id: response.id || response.typeID || `temp-${Date.now()}`,
      };
      setTypes(prev => [...prev, newType]); // Optimistic update
      updateForm('typeId', newType.id.toString()); // Pre-select the new type
      updateForm('type', newType.name); // Set type name
      toast.success('Type created successfully');
      setIsAddTypeOpen(false);
      setTypeForm({ name: '', categoryId: '', prefix: '' });
      fetchTypes(); // Refetch to get correct data
      // Also try to open the brand dialog if it was open
      if (isAddBrandOpen) {
        setBrandForm({ ...brandForm, typeId: newType.id.toString() });
      }
    } catch (error: any) {
      console.error('Failed to save type:', error);
      toast.error(error.message || 'Failed to save type');
    } finally {
      setSavingType(false);
    }
  };

  const handleSaveBrand = async () => {
    try {
      setSavingBrand(true);
      const response = await api.post('/brands', brandForm);
      const newBrand = {
        ...brandForm,
        id: response.id || response.brandID || `temp-${Date.now()}`,
      };
      setBrands(prev => [...prev, newBrand]); // Optimistic update
      updateForm('brandId', newBrand.id.toString()); // Pre-select the new brand
      updateForm('brand', newBrand.name); // Set brand name
      toast.success('Brand created successfully');
      setIsAddBrandOpen(false);
      setBrandForm({ name: '', typeId: '', prefix: '' });
      fetchBrands(); // Refetch to get correct data
    } catch (error: any) {
      console.error('Failed to save brand:', error);
      toast.error(error.message || 'Failed to save brand');
    } finally {
      setSavingBrand(false);
    }
  };

  // Save functions for add dialogs
  const handleSaveLocation = async () => {
    try {
      setSavingLocation(true);
      const response = await api.post('/locations', {
        name: locationForm.name,
        floor_unit: locationForm.floor_unit,
        building: locationForm.building,
        room_areas: locationForm.room_areas.filter(r => r.room_name.trim()),
        department_id: locationForm.department_id,
        description: locationForm.description,
      });
      const newLocation = {
        ...locationForm,
        locationID: response.locationID || response.id || `temp-${Date.now()}`,
      };
      // Update locations list
      setLocations(prev => [...prev, newLocation]);
      // Pre-select the new location
      updateForm('locationSite', newLocation.locationID.toString());
      updateForm('locationSiteName', newLocation.name);
      updateForm('locationBuilding', newLocation.building);
      toast.success('Location created successfully');
      setIsAddLocationOpen(false);
      setLocationForm({
        name: '',
        floor_unit: '',
        building: '',
        room_areas: [{ room_name: '' }],
        department_id: '',
        description: '',
      });
      // Refetch locations to get correct data
      const locationResponse = await api.get('/locations');
      setLocations(locationResponse.locations || []);
    } catch (error: any) {
      console.error('Failed to save location:', error);
      toast.error(error.message || 'Failed to save location');
    } finally {
      setSavingLocation(false);
    }
  };

  // Dialog openers with pre-filled data
  const openAddSupplierDialog = () => {
    setSupplierForm({ ...supplierForm, categoryId: formData.categoryId || '' });
    setIsAddSupplierOpen(true);
  };

  const openAddTypeDialog = () => {
    setTypeForm({ ...typeForm, categoryId: formData.categoryId || '' });
    setIsAddTypeOpen(true);
  };

  const openAddBrandDialog = () => {
    if (types.length === 0) {
      toast.error('Please create an asset type first before creating a brand.');
      return;
    }
    setBrandForm({ ...brandForm, typeId: formData.typeId || '' });
    setIsAddBrandOpen(true);
  };

  const openAddLocationDialog = () => {
    setIsAddLocationOpen(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <AlertDialog
        open={showContinueDialog}
        onOpenChange={setShowContinueDialog}
      >
        <AppAlertDialogFrame>
          <AppAlertDialogGradientHeader title="Continue Previous Edit?" />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600">
              We found an unfinished asset entry. Would you like to continue
              where you left off?
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter>
            <AlertDialogCancel onClick={handleContinueNo}>
              No, start fresh
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleContinueYes}>
              Yes, continue
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={handleClose} />

        <Card className="relative z-10 w-full max-w-4xl bg-white rounded-2xl overflow-hidden flex flex-col h-[88dvh] max-h-[840px] min-h-[520px] sm:min-h-[660px] mx-2 sm:mx-4 border-none shadow-2xl ">
          <CardHeader className="bg-gradient-to-r from-red-600 to-rose-600 text-white pb-8 sm:pb-12 pt-6 sm:pt-8 px-4 sm:px-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl sm:text-3xl font-bold">
                  Create New Asset
                </h2>
                <p className="text-red-100 mt-2 text-sm sm:text-base">
                  Step {currentStep + 1} of {steps.length}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </CardHeader>

          <div className="relative -mt-4 sm:-mt-6 md:-mt-8 px-2 md:px-4 flex-shrink-0">
            <div className="flex justify-center overflow-x-auto scrollbar-hide">
              <div className="flex items-center bg-white rounded-full shadow-xl px-2 py-2 sm:px-3 md:px-5 sm:py-3 md:py-4 border-2 md:border-4 border-red-100">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;

                  return (
                    <div key={index} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-6 h-6 sm:w-8 sm:h-8 md:w-11 md:h-11 rounded-full flex items-center justify-center border-2 md:border-4 transition-all ${
                            isCompleted
                              ? 'bg-green-500 text-white border-green-300'
                              : isActive
                                ? 'bg-red-600 text-white border-red-300 ring-2 md:ring-4 ring-red-100'
                                : 'bg-gray-100 text-gray-400 border-gray-300'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 md:h-6 md:w-6" />
                          ) : (
                            <Icon className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                          )}
                        </div>
                        <p
                          className={`mt-1 md:mt-2 text-[10px] sm:text-xs font-medium whitespace-nowrap ${isActive || isCompleted ? 'text-red-700' : 'text-gray-500'}`}
                        >
                          {step.title}
                        </p>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`w-3 sm:w-6 md:w-12 lg:w-16 h-1 mx-1 md:mx-3 ${index < currentStep ? 'bg-green-500' : 'bg-gray-300'}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <CardContent className="flex-1 overflow-y-auto px-4 sm:px-6 pt-5 sm:pt-6 pb-4 min-h-0">
            <h3 className="text-xl sm:text-2xl font-bold text-red-700 mb-6 sm:mb-8 text-center sm:text-left">
              {stepTitles[currentStep]}
            </h3>

            {!hasSmartIdFormat && (
              <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-amber-700 font-bold text-sm">!</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-amber-900 font-semibold text-sm mb-1">
                      Smart Asset ID Format Not Configured
                    </p>
                    <p className="text-amber-800 text-xs">
                      Please configure the Smart Asset ID Format in Settings &gt; Assets &gt; Smart Asset ID Format before adding assets.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 0 && (
              <Step1AssetInfo
                formData={formData}
                updateForm={updateForm}
                categories={categoriesForStep1}
                types={types}
                suppliers={suppliers}
                brands={brands}
                onOpenAddCategory={() => setIsAddCategoryOpen(true)}
                onOpenAddSupplier={openAddSupplierDialog}
                onOpenAddType={openAddTypeDialog}
                onOpenAddBrand={openAddBrandDialog}
              />
            )}
            {currentStep === 1 && (
              <Step2Lifecycle
                formData={formData}
                updateForm={updateForm}
                clearPurchaseDateWhenDisablingOldUnit
              />
            )}
            {currentStep === 2 && (
              <Step3Location
                formData={formData}
                updateForm={updateForm}
                canAddLocation={canAddLocation}
              />
            )}
            {currentStep === 3 && (
              <Step4Review formData={formData} users={users} />
            )}
          </CardContent>

          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 bg-gray-50 border-t">
            <Button
              variant="outline"
              size="lg"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              <ChevronLeft className="mr-2 h-5 w-5" /> Back
            </Button>

            <Button
              size="lg"
              onClick={handleNext}
              disabled={
                isSubmitting ||
                !hasSmartIdFormat ||
                ((currentStep === 0 ||
                  currentStep === 1 ||
                  currentStep === 2) &&
                  !isStepValid(currentStep, formData))
              }
              className={`w-full sm:w-auto font-semibold order-1 sm:order-2 ${
                currentStep === steps.length - 1
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } text-white shadow-lg`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Adding Asset...
                </>
              ) : currentStep === steps.length - 1 ? (
                <>
                  Complete & Add Asset <CheckCircle2 className="ml-2 h-5 w-5" />
                </>
              ) : (
                <>
                  Next <ChevronRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <AppDialogFrame className="sm:max-w-md z-[70]">
          <AppDialogGradientHeader
            title="Create New Category"
            description="Add a new asset category to organize your assets."
          />
          <AppDialogBody className="grid gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={categoryForm.name}
                onChange={e =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                placeholder="e.g., Vehicles, Machinery"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Asset Prefix <span className="text-red-500">*</span>
              </Label>
              <Input
                value={categoryForm.prefix}
                onChange={e =>
                  setCategoryForm({
                    ...categoryForm,
                    prefix: e.target.value.toUpperCase(),
                  })
                }
                maxLength={8}
                placeholder="VEH"
                className="font-mono text-base tracking-wider"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Code <span className="text-red-500">*</span>
              </Label>
              <Input
                value={categoryForm.gl_code}
                onChange={e =>
                  setCategoryForm({ ...categoryForm, gl_code: e.target.value })
                }
                className="font-mono text-base"
                placeholder="2003"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Department <span className="text-red-500">*</span>
              </Label>
              <Select
                value={categoryForm.departmentId || ''}
                onValueChange={value =>
                  setCategoryForm({ ...categoryForm, departmentId: value })
                }
                required
              >
                <SelectTrigger className="w-full bg-white border-gray-300 hover:border-gray-400 focus:border-primary">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 max-h-60 z-[9999]">
                  {departments.map(dept => (
                    <SelectItem
                      key={dept.departmentID}
                      value={dept.departmentID}
                      className="hover:bg-gray-200 cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{dept.name}</span>
                        <span className="text-sm text-gray-500">
                          ({dept.code})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddCategoryOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={
                savingCategory ||
                !categoryForm.name ||
                !categoryForm.prefix ||
                !categoryForm.gl_code ||
                !categoryForm.departmentId
              }
              className="rounded-xl px-6 shadow-md"
            >
              {savingCategory ? 'Saving...' : 'Create Category'}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      {/* Add Supplier Dialog */}
      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <AppDialogFrame className="sm:max-w-md z-[70]">
          <AppDialogGradientHeader
            title="Create New Supplier"
            description="Add a new supplier for your assets."
          />
          <AppDialogBody className="grid gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">Supplier Name</Label>
              <Input
                value={supplierForm.name}
                onChange={e =>
                  setSupplierForm({ ...supplierForm, name: e.target.value })
                }
                placeholder="e.g., ABC Supplies"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Asset Category</Label>
              <Select
                value={supplierForm.categoryId}
                onValueChange={value =>
                  setSupplierForm({ ...supplierForm, categoryId: value })
                }
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select an asset category" />
                </SelectTrigger>
                <SelectContent className="bg-white z-[9999]">
                  {categories.length === 0 ? (
                    <div className="p-4 text-center space-y-2">
                      <div className="text-sm text-muted-foreground">
                        No categories available
                      </div>
                    </div>
                  ) : (
                    categories.map(cat => (
                      <SelectItem
                        key={cat.id}
                        value={cat.id.toString()}
                        className="hover:bg-gray-200"
                      >
                        {cat.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Contact Number</Label>
              <Input
                value={supplierForm.contact}
                onChange={e =>
                  setSupplierForm({ ...supplierForm, contact: e.target.value })
                }
                placeholder="e.g., +1-234-567-8900"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Email Address</Label>
              <Input
                value={supplierForm.email}
                onChange={e =>
                  setSupplierForm({ ...supplierForm, email: e.target.value })
                }
                type="email"
                placeholder="e.g., contact@abc.com"
                className="text-base"
              />
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddSupplierOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSupplier}
              disabled={savingSupplier || !supplierForm.name}
              className="rounded-xl px-6 shadow-md"
            >
              {savingSupplier ? 'Saving...' : 'Create Supplier'}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      {/* Add Type Dialog */}
      <Dialog open={isAddTypeOpen} onOpenChange={setIsAddTypeOpen}>
        <AppDialogFrame className="sm:max-w-md z-[70]">
          <AppDialogGradientHeader
            title="Create New Type"
            description="Add a new asset type within the selected category."
          />
          <AppDialogBody className="grid gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">Type Name</Label>
              <Input
                value={typeForm.name}
                onChange={e =>
                  setTypeForm({ ...typeForm, name: e.target.value })
                }
                placeholder="e.g., Laptop, Desktop"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Category</Label>
              <Select
                value={typeForm.categoryId}
                onValueChange={value =>
                  setTypeForm({ ...typeForm, categoryId: value })
                }
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-white z-[9999]">
                  {categories.length === 0 ? (
                    <div className="p-4 text-center space-y-2">
                      <div className="text-sm text-muted-foreground">
                        No categories available
                      </div>
                    </div>
                  ) : (
                    categories.map(cat => (
                      <SelectItem
                        key={cat.id}
                        value={cat.id.toString()}
                        className="hover:bg-gray-200"
                      >
                        {cat.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Type Prefix</Label>
              <Input
                value={typeForm.prefix}
                onChange={e =>
                  setTypeForm({
                    ...typeForm,
                    prefix: e.target.value.toUpperCase(),
                  })
                }
                maxLength={10}
                placeholder="LAP"
                className="font-mono text-base tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                Used in smart asset ID generation when Type format is set to
                'Prefix'
              </p>
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddTypeOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveType}
              disabled={savingType || !typeForm.name}
              className="rounded-xl px-6 shadow-md"
            >
              {savingType ? 'Saving...' : 'Create Type'}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      {/* Add Brand Dialog */}
      <Dialog open={isAddBrandOpen} onOpenChange={setIsAddBrandOpen}>
        <AppDialogFrame className="sm:max-w-md z-[70]">
          <AppDialogGradientHeader
            title="Create New Brand"
            description="Add a new brand for the selected asset type."
          />
          <AppDialogBody className="grid gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">Brand Name</Label>
              <Input
                value={brandForm.name}
                onChange={e =>
                  setBrandForm({ ...brandForm, name: e.target.value })
                }
                placeholder="e.g., Dell, HP"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Asset Type</Label>
              <Select
                value={brandForm.typeId}
                onValueChange={value =>
                  setBrandForm({ ...brandForm, typeId: value })
                }
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select an asset type" />
                </SelectTrigger>
                <SelectContent className="bg-white z-[9999]">
                  {types.length === 0 ? (
                    <div className="p-4 text-center space-y-2">
                      <div className="text-sm text-muted-foreground">
                        No asset types available
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Please create a type first
                      </div>
                    </div>
                  ) : (
                    types.map(type => (
                      <SelectItem
                        key={type.id}
                        value={type.id.toString()}
                        className="hover:bg-gray-200"
                      >
                        {type.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Brand Prefix</Label>
              <Input
                value={brandForm.prefix}
                onChange={e =>
                  setBrandForm({
                    ...brandForm,
                    prefix: e.target.value.toUpperCase(),
                  })
                }
                maxLength={8}
                placeholder="DEL"
                className="font-mono text-base tracking-wider"
              />
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddBrandOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveBrand}
              disabled={savingBrand || !brandForm.name}
              className="rounded-xl px-6 shadow-md"
            >
              {savingBrand ? 'Saving...' : 'Create Brand'}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      {/* Add Location Dialog */}
      <Dialog open={isAddLocationOpen} onOpenChange={setIsAddLocationOpen}>
        <AppDialogFrame className="sm:max-w-md max-h-[80vh] z-[70]">
          <AppDialogGradientHeader
            title="Create New Location"
            description="Add a new location for your assets."
          />
          <AppDialogBody className="grid gap-6 pr-2 overflow-y-auto max-h-[60vh]">
            <div className="space-y-2">
              <Label className="text-base font-medium">Location Name</Label>
              <Input
                value={locationForm.name}
                onChange={e =>
                  setLocationForm({ ...locationForm, name: e.target.value })
                }
                placeholder="e.g., Main Office, Warehouse A"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Floor/Unit</Label>
              <Input
                value={locationForm.floor_unit}
                onChange={e =>
                  setLocationForm({
                    ...locationForm,
                    floor_unit: e.target.value,
                  })
                }
                placeholder="e.g., Floor 5, Unit 101"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Building</Label>
              <Input
                value={locationForm.building}
                onChange={e =>
                  setLocationForm({ ...locationForm, building: e.target.value })
                }
                placeholder="e.g., Main Building, Annex A"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Rooms/Areas</Label>
              <div className="space-y-2">
                {locationForm.room_areas.map((room, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={room.room_name}
                      onChange={e => {
                        const newRooms = [...locationForm.room_areas];
                        newRooms[index] = {
                          ...room,
                          room_name: e.target.value,
                        };
                        setLocationForm({
                          ...locationForm,
                          room_areas: newRooms,
                        });
                      }}
                      placeholder="e.g., Conference Room 101"
                      className="text-base"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newRooms = locationForm.room_areas.filter(
                          (_, i) => i !== index
                        );
                        setLocationForm({
                          ...locationForm,
                          room_areas: newRooms,
                        });
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
                    setLocationForm({
                      ...locationForm,
                      room_areas: [
                        ...locationForm.room_areas,
                        { room_name: '' },
                      ],
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
                value={locationForm.department_id || 'none'}
                onValueChange={v =>
                  setLocationForm({
                    ...locationForm,
                    department_id: v === 'none' ? '' : v,
                  })
                }
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="none" className="hover:bg-gray-200">
                    No department
                  </SelectItem>
                  {departments.map(dept => (
                    <SelectItem
                      key={dept.departmentID}
                      value={dept.departmentID}
                      className="hover:bg-gray-200"
                    >
                      {dept.name}
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
                value={locationForm.description}
                onChange={e =>
                  setLocationForm({
                    ...locationForm,
                    description: e.target.value,
                  })
                }
                placeholder="Additional details about this location"
                className="text-base min-h-[60px]"
              />
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddLocationOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLocation}
              disabled={savingLocation || !locationForm.name}
              className="rounded-xl px-6 shadow-md"
            >
              {savingLocation ? 'Saving...' : 'Create Location'}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>
    </>
  );
}

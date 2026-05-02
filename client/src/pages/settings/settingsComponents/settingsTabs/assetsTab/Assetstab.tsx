import { useState, useEffect, useMemo } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { ActiveCompany } from './types';
import { useCategories } from './hooks/useCategories';
import { useDepartments } from './hooks/useDepartments';
import { useSuppliers } from './hooks/useSuppliers';
import { useAssetTypes } from './hooks/useAssetTypes';
import { useAssetBrands } from './hooks/useAssetBrands';
import { useSmartIdFormat } from './hooks/useSmartIdFormat';
import { AssetCategories } from './components/AssetCategories';
import { Suppliers } from './components/Suppliers';
import { AssetTypes } from './components/AssetTypes';
import { AssetBrands } from './components/AssetBrands';
import { SmartAssetIdFormat } from './components/SmartAssetIdFormat';
import { Shimmer } from '@/components/ui/shimmer';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { classifyDepartmentScopeByName } from '@/lib/assetScope';

export function AssetsTab({ isActive }: { isActive?: boolean }) {
  const { user } = useCurrentUser();
  const [isTabLoading, setIsTabLoading] = useState(true);
  const [activeCompany, setActiveCompany] = useState<ActiveCompany | null>(
    null
  );
  const [copyingSettings, setCopyingSettings] = useState(false);

  const {
    categories,
    loading: categoriesLoading,
    fetchCategories,
  } = useCategories();
  const { suppliers, fetchSuppliers } = useSuppliers();
  const { types, fetchTypes } = useAssetTypes();
  const { brands, fetchBrands } = useAssetBrands();
  const { fetchAssetIdFormatSettings } = useSmartIdFormat(activeCompany);

  // Determine user's role scope
  const userRoleScope = useMemo(() => {
    const normalizedRoleName = (user?.role?.name ?? '').trim().toLowerCase();
    if (normalizedRoleName === 'it asset') return 'IT';
    if (normalizedRoleName === 'admin asset') return 'Admin';
    return null;
  }, [user?.role?.name]);

  // Filter categories based on user's role scope
  const filteredCategories = useMemo(() => {
    if (!userRoleScope) return categories;
    return categories.filter(cat => {
      const deptName = cat.department?.name || null;
      const scope = classifyDepartmentScopeByName(deptName);
      return scope === userRoleScope;
    });
  }, [categories, userRoleScope]);

  // Filter types based on filtered categories
  const filteredTypes = useMemo(() => {
    if (!userRoleScope) return types;
    const filteredCategoryIds = new Set(filteredCategories.map(c => c.id));
    return types.filter(type => filteredCategoryIds.has(type.categoryId || type.category_id || 0));
  }, [types, filteredCategories, userRoleScope]);

  // Filter brands based on filtered types
  const filteredBrands = useMemo(() => {
    if (!userRoleScope) return brands;
    const filteredTypeIds = new Set(filteredTypes.map(t => t.id));
    return brands.filter(brand => filteredTypeIds.has(brand.typeId || brand.type_id || 0));
  }, [brands, filteredTypes, userRoleScope]);

  useEffect(() => {
    if (isActive) {
      setIsTabLoading(true);
      const timer = setTimeout(() => setIsTabLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive) fetchCategories();
  }, [isActive, activeCompany]);

  useEffect(() => {
    if (isActive) fetchSuppliers();
  }, [isActive, activeCompany]);

  useEffect(() => {
    if (isActive) fetchTypes();
  }, [isActive, activeCompany]);

  useEffect(() => {
    if (isActive) fetchBrands();
  }, [isActive, activeCompany]);

  useEffect(() => {
    if (isActive) fetchActiveCompany();
  }, [isActive]);

  useEffect(() => {
    if (isActive && activeCompany) fetchAssetIdFormatSettings();
  }, [isActive, activeCompany]);

  const fetchActiveCompany = async () => {
    try {
      const data = await api.get('/companies/active');
      setActiveCompany(data?.data?.[0] || null);
    } catch (error) {
      console.error('Failed to fetch active company:', error);
    }
  };

  const copyMainCompanySettings = async () => {
    if (!activeCompany) {
      toast.error('No active company selected');
      return;
    }

    try {
      setCopyingSettings(true);
      await api.post('/settings/copy-main-company-assets');
      toast.success('Successfully copied asset settings from main company');
      // Refresh all data
      setIsTabLoading(true);
      await Promise.all([
        fetchCategories(),
        fetchSuppliers(),
        fetchTypes(),
        fetchBrands(),
        fetchAssetIdFormatSettings(),
      ]);
      setIsTabLoading(false);
    } catch (error: any) {
      console.error('Failed to copy settings:', error);
      toast.error(error.message || 'Failed to copy settings from main company');
    } finally {
      setCopyingSettings(false);
    }
  };

  if (isTabLoading) {
    return (
      <TabsContent value="assets" className="mt-0">
        {/* All Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Asset Categories Card */}
          <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-card/95 backdrop-blur h-[28rem] flex flex-col">
            <CardHeader className=" bg-red-600 rounded-t-2xl flex-shrink-0">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <Shimmer className="h-8 w-48 rounded bg-white/20" />
                  <Shimmer className="h-5 w-80 rounded mt-2 bg-white/20" />
                </div>
                <Shimmer className="h-12 w-48 rounded-xl bg-white/20" />
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto">
              {/* Table Header Shimmer */}
              <div className="mb-4">
                <div className="flex space-x-4 mb-4">
                  <Shimmer className="h-6 w-32" />
                  <Shimmer className="h-6 w-16" />
                  <Shimmer className="h-6 w-20" />
                  <div className="ml-auto">
                    <Shimmer className="h-6 w-16" />
                  </div>
                </div>
              </div>
              {/* Table Rows Shimmer */}
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 border-b flex items-center space-x-4 p-4"
                  >
                    <Shimmer className="h-6 w-32" />
                    <Shimmer className="h-6 w-16 rounded" />
                    <Shimmer className="h-6 w-20 rounded" />
                    <div className="flex space-x-2 ml-auto">
                      <Shimmer className="h-8 w-8 rounded" />
                      <Shimmer className="h-8 w-8 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter></CardFooter>
          </Card>

          {/* Suppliers Card */}
          <Card className="shadow-lg border-0 rounded-2xl overflow-hidden mb-10 bg-card/95 backdrop-blur h-[28rem] flex flex-col">
            <CardHeader className=" bg-red-600 rounded-t-2xl flex-shrink-0">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <Shimmer className="h-8 w-32 rounded bg-white/20" />
                  <Shimmer className="h-5 w-80 rounded mt-2 bg-white/20" />
                </div>
                <Shimmer className="h-12 w-48 rounded-xl bg-white/20" />
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto">
              {/* Table Header Shimmer */}
              <div className="mb-4">
                <div className="flex space-x-4 mb-4">
                  <Shimmer className="h-6 w-32" />
                  <Shimmer className="h-6 w-24" />
                  <Shimmer className="h-6 w-24" />
                  <Shimmer className="h-6 w-32" />
                  <div className="ml-auto">
                    <Shimmer className="h-6 w-16" />
                  </div>
                </div>
              </div>
              {/* Table Rows Shimmer */}
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 border-b flex items-center space-x-4 p-4"
                  >
                    <Shimmer className="h-6 w-32" />
                    <Shimmer className="h-6 w-24 rounded" />
                    <Shimmer className="h-6 w-24 rounded" />
                    <Shimmer className="h-6 w-32 rounded" />
                    <div className="flex space-x-2 ml-auto">
                      <Shimmer className="h-8 w-8 rounded" />
                      <Shimmer className="h-8 w-8 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter></CardFooter>
          </Card>

          {/* Asset Types Card */}
          <Card className="shadow-lg border-0 rounded-2xl overflow-hidden mb-10 bg-card/95 backdrop-blur h-[28rem] flex flex-col">
            <CardHeader className=" bg-red-600 rounded-t-2xl flex-shrink-0">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <Shimmer className="h-8 w-32 rounded bg-white/20" />
                  <Shimmer className="h-5 w-80 rounded mt-2 bg-white/20" />
                </div>
                <Shimmer className="h-12 w-40 rounded-xl bg-white/20" />
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto">
              {/* Table Header Shimmer */}
              <div className="mb-4">
                <div className="flex space-x-4 mb-4">
                  <Shimmer className="h-6 w-24" />
                  <Shimmer className="h-6 w-20" />
                  <div className="ml-auto">
                    <Shimmer className="h-6 w-16" />
                  </div>
                </div>
              </div>
              {/* Table Rows Shimmer */}
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 border-b flex items-center space-x-4 p-4"
                  >
                    <Shimmer className="h-6 w-24" />
                    <Shimmer className="h-6 w-20 rounded" />
                    <div className="flex space-x-2 ml-auto">
                      <Shimmer className="h-8 w-8 rounded" />
                      <Shimmer className="h-8 w-8 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter></CardFooter>
          </Card>

          {/* Asset Brands Card */}
          <Card className="shadow-lg border-0 rounded-2xl overflow-hidden mb-10 bg-card/95 backdrop-blur h-[28rem] flex flex-col">
            <CardHeader className=" bg-red-600 rounded-t-2xl">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <Shimmer className="h-8 w-32 rounded bg-white/20" />
                  <Shimmer className="h-5 w-80 rounded mt-2 bg-white/20" />
                </div>
                <Shimmer className="h-12 w-40 rounded-xl bg-white/20" />
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto">
              {/* Table Header Shimmer */}
              <div className="mb-4">
                <div className="flex space-x-4 mb-4">
                  <Shimmer className="h-6 w-24" />
                  <Shimmer className="h-6 w-20" />
                  <div className="ml-auto">
                    <Shimmer className="h-6 w-16" />
                  </div>
                </div>
              </div>
              {/* Table Rows Shimmer */}
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 border-b flex items-center space-x-4 p-4"
                  >
                    <Shimmer className="h-6 w-24" />
                    <Shimmer className="h-6 w-16 rounded" />
                    <div className="flex space-x-2 ml-auto">
                      <Shimmer className="h-8 w-8 rounded" />
                      <Shimmer className="h-8 w-8 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter></CardFooter>
          </Card>
        </div>

        <div className="mb-12">
          <Card className="relative overflow-hidden border-2 border-red-500/30 bg-gradient-to-br from-red-50 to-white shadow-xl rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Shimmer className="h-10 w-10 rounded-xl" />
                <Shimmer className="h-8 w-48" />
              </div>
            </CardHeader>
            <CardContent>
              <Shimmer className="h-5 w-full mb-6" />
              <div className="p-8 bg-card border rounded-2xl">
                <div className="space-y-2">
                  <Shimmer className="h-6 w-32" />
                  <Shimmer className="h-6 w-40" />
                  <Shimmer className="h-6 w-36" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="assets" className="mt-0">
      {/* Copy from Main Company Button - Only show for non-main companies that have no existing data */}
      {activeCompany &&
        !activeCompany.is_main &&
        filteredCategories.length === 0 &&
        suppliers.length === 0 &&
        filteredTypes.length === 0 &&
        filteredBrands.length === 0 && (
          <div className="mb-6">
            <Button
              onClick={copyMainCompanySettings}
              disabled={copyingSettings}
              variant="outline"
              className="w-full sm:w-auto bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 text-blue-700 hover:text-blue-800 font-medium rounded-xl shadow-sm"
            >
              {copyingSettings ? (
                <>
                  <div className="mr-2 h-4 w-20 animate-pulse rounded bg-blue-100"></div>
                  Copying Settings...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Use same asset settings as the main company
                </>
              )}
            </Button>
          </div>
        )}

      {/* All Tables Grid — equal row heights on large screens */}
      <div className="grid grid-cols-1 gap-8 mb-10 lg:grid-cols-2 lg:min-h-[36rem] lg:[grid-template-rows:repeat(2,minmax(0,1fr))]">
        <AssetCategories
          onAfterSave={fetchCategories}
          categories={filteredCategories}
        />
        <Suppliers
          categories={filteredCategories}
          categoriesLoading={categoriesLoading}
        />
        <AssetTypes categories={filteredCategories} onAfterSave={fetchTypes} />
        <AssetBrands types={filteredTypes} />
      </div>

      <div className="mb-12">
        <SmartAssetIdFormat activeCompany={activeCompany} />
      </div>
    </TabsContent>
  );
}

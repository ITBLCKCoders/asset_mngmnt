import { useState, useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  X,
  FileText,
  Image as ImageIcon,
  Paperclip,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { AssetFormData, UpdateFormHandler } from '../assetTypes/assetFormTypes';

interface Step1AssetInfoProps {
  formData: AssetFormData;
  updateForm: UpdateFormHandler;
  categories: any[];
  types: any[];
  suppliers: any[];
  brands: any[];
  onOpenAddCategory: () => void;
  onOpenAddSupplier: () => void;
  onOpenAddType: () => void;
  onOpenAddBrand: () => void;
}

export function Step1AssetInfo({
  formData,
  updateForm,
  categories,
  types,
  suppliers,
  brands,
  onOpenAddCategory,
  onOpenAddSupplier,
  onOpenAddType,
  onOpenAddBrand,
}: Step1AssetInfoProps) {
  const { user } = useCurrentUser();
  const { roleCustodian } = useUserPermissions();
  const canAdd =
    user?.role?.name === 'Global Admin' ||
    user?.role?.name === 'Admin' ||
    (!!roleCustodian &&
      (roleCustodian.assetType === 'it' ||
        roleCustodian.assetType === 'admin' ||
        ['itManager', 'adminManager', 'overallManager'].includes(
          roleCustodian.managerRole
        )));

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');


  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  // Update selectedCategoryId when category changes
  useEffect(() => {
    if (formData.categoryId && formData.categoryId !== selectedCategoryId) {
      setSelectedCategoryId(formData.categoryId);
    }
  }, [formData.categoryId, selectedCategoryId]);

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Initialize image preview when formData.imageUrl changes
  useEffect(() => {
    if (formData.imageUrl) {
      setImagePreview(formData.imageUrl);
    }
  }, [formData.imageUrl]);
  const [imageDragOver, setImageDragOver] = useState(false);

  const [documents, setDocuments] = useState<
    { file: File; progress: number; id: string }[]
  >(
    formData.documents
      ? formData.documents.map(f => ({
          file: f,
          progress: 100,
          id: `${f.name}-${f.size}-${f.lastModified}`,
        }))
      : []
  );

  const [docDragOver, setDocDragOver] = useState(false);

  useEffect(() => {
    if (selectedCategoryId && formData.typeId && types.length > 0) {
      const type = types.find(t => t.id == formData.typeId);
      if (
        !type ||
        (type.categoryId != selectedCategoryId &&
          type.category_id != selectedCategoryId &&
          type.categoryId !== null &&
          type.category_id !== null)
      ) {
        updateForm('typeId', '');
        updateForm('type', '');
      }
    }
  }, [selectedCategoryId, types, formData.typeId, updateForm]);

  useEffect(() => {
    if (selectedCategoryId && formData.supplier && suppliers.length > 0) {
      const supplier = suppliers.find(s => s.name == formData.supplier);
      if (
        !supplier ||
        (((supplier.categoryId || supplier.category_id) != selectedCategoryId) &&
          supplier.categoryId !== null &&
          supplier.category_id !== null)
      ) {
        updateForm('supplier', '');
      }
    }
  }, [selectedCategoryId, suppliers, formData.supplier, updateForm]);

  useEffect(() => {
    if (formData.typeId && formData.brandId && brands.length > 0) {
      const brand = brands.find(b => b.id.toString() == formData.brandId);
      if (
        !brand ||
        (brand.typeId != formData.typeId &&
          brand.type_id != formData.typeId &&
          brand.typeId !== null &&
          brand.type_id !== null)
      ) {
        // Only clear the brand if we're not in edit mode with existing brand data
        if (!formData.assetId) {
          // If no assetId, it's not edit mode
          updateForm('brandId', '');
          updateForm('brand', '');
        }
      }
    }
  }, [formData.typeId, brands, formData.brandId, updateForm, formData.assetId]);

  useEffect(() => {
    setSelectedCategoryId(formData.categoryId || '');
  }, []);

  // Additional effect to sync selectedCategoryId with formData changes
  useEffect(() => {
    if (formData.categoryId && formData.categoryId !== selectedCategoryId) {
      setSelectedCategoryId(formData.categoryId);
    }
  }, [formData.categoryId]);

  const handleImageDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setImageDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) processImageFile(file);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      updateForm('imageUrl', result);
      updateForm('imageFile', file);
    };
    reader.onerror = () => {
      toast.error('Failed to process image file');
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    updateForm('imageUrl', '');
    updateForm('imageFile', null);
  };

  const handleDocDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDocDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    processDocumentFiles(files);
  }, []);

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) processDocumentFiles(Array.from(files));
  };

  const processDocumentFiles = (files: File[]) => {
    const currentCount = documents.length;
    const newFiles = files.slice(0, 5 - currentCount); // Limit to max 5 total

    if (files.length > newFiles.length) {
      toast.error(
        `Maximum 5 documents allowed. Only ${newFiles.length} files were added.`
      );
    }

    const newDocs = newFiles.map(file => ({
      file,
      progress: 0,
      id: `${file.name}-${file.size}-${file.lastModified}`,
    }));

    setDocuments(prev => [...prev, ...newDocs]);
    updateForm('documents', prev => [...(prev.documents || []), ...newFiles]);

    newDocs.forEach(doc => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 15 + Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }
        setDocuments(prev =>
          prev.map(d => (d.id === doc.id ? { ...d, progress } : d))
        );
      }, 200);
    });
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => {
      const filtered = prev.filter(d => d.id !== id);
      const remainingFiles = filtered.map(d => d.file);
      updateForm(
        'documents',
        remainingFiles.length > 0 ? remainingFiles : undefined
      );
      return filtered;
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label className="font-semibold">
          Asset Name <span className="text-red-500">*</span>
        </Label>
        <Input
          placeholder="e.g. MacBook Pro 16-inch M3 Max"
          value={formData.name || ''}
          onChange={e => updateForm('name', e.target.value)}
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">Asset Description</Label>
        <Textarea
          placeholder="Provide detailed information about this asset..."
          value={formData.description || ''}
          onChange={e => updateForm('description', e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-2">
          <Label className="font-semibold">
            Category <span className="text-red-500">*</span>
          </Label>
          <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-12 w-full justify-between">
                {formData.category
                  ? formData.category
                  : formData.categoryId
                    ? categories.find(
                        c => c.id.toString() === formData.categoryId
                      )?.name || 'Select category'
                    : 'Select category'}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white z-[9999]">
              <Command>
                {categories.length > 5 && (
                  <CommandInput
                    placeholder="Search categories..."
                    value={categorySearch}
                    onValueChange={setCategorySearch}
                  />
                )}
                <CommandEmpty>No categories found.</CommandEmpty>
                <CommandGroup className="max-h-60 overflow-y-auto">
                  {categories
                    .filter(cat =>
                      cat.name
                        .toLowerCase()
                        .includes(categorySearch.toLowerCase())
                    )
                    .map(cat => (
                      <CommandItem
                        key={cat.id}
                        value={cat.name}
                        onSelect={() => {
                          setSelectedCategoryId(cat.id.toString());
                          updateForm('categoryId', cat.id.toString());
                          updateForm('category', cat.name);
                          setCategoryOpen(false);
                          setCategorySearch('');
                        }}
                        className="hover:bg-gray-200"
                      >
                        {cat.name}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </Command>
              {canAdd && (
                <div className="p-2 border-t">
                  <Button
                    onClick={() => {
                      onOpenAddCategory();
                      setCategoryOpen(false);
                    }}
                    size="sm"
                    className="w-full"
                  >
                    Add Category
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">
            Supplier <span className="text-red-500">*</span>
          </Label>
          <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-12 w-full justify-between">
                {formData.supplier || 'Select supplier'}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white z-[9999]">
              <Command>
                {(() => {
                  const filteredSuppliers = suppliers.filter(
                    s =>
                      (s.categoryId && s.categoryId == selectedCategoryId) ||
                      (s.category_id && s.category_id == selectedCategoryId) ||
                      s.categoryId === null ||
                      s.category_id === null
                  );
                  const showSearch = filteredSuppliers.length > 5;
                  return (
                    <>
                      {showSearch && (
                        <CommandInput
                          placeholder="Search suppliers..."
                          value={supplierSearch}
                          onValueChange={setSupplierSearch}
                        />
                      )}
                      <CommandEmpty>No suppliers found.</CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-y-auto">
                        {!selectedCategoryId && (
                          <CommandItem disabled>
                            Select a category first
                          </CommandItem>
                        )}
                        {selectedCategoryId &&
                          filteredSuppliers.length === 0 && (
                            <CommandItem disabled>
                              No suppliers available for this category
                            </CommandItem>
                          )}
                        {selectedCategoryId &&
                          filteredSuppliers
                            .filter(s =>
                              s.name
                                .toLowerCase()
                                .includes(supplierSearch.toLowerCase())
                            )
                            .map(s => (
                              <CommandItem
                                key={s.id}
                                value={s.name}
                                onSelect={() => {
                                  updateForm('supplier', s.name);
                                  setSupplierOpen(false);
                                  setSupplierSearch('');
                                }}
                                className="hover:bg-gray-200"
                              >
                                {s.name}
                              </CommandItem>
                            ))}
                      </CommandGroup>
                    </>
                  );
                })()}
              </Command>
              {canAdd && (
                <div className="p-2 border-t">
                  <Button
                    onClick={() => {
                      onOpenAddSupplier();
                      setSupplierOpen(false);
                    }}
                    size="sm"
                    className="w-full"
                  >
                    Add Supplier
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">
            Type <span className="text-red-500">*</span>
          </Label>
          <Popover open={typeOpen} onOpenChange={setTypeOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-12 w-full justify-between">
                {formData.type
                  ? formData.type
                  : formData.typeId
                    ? types.find(t => t.id.toString() === formData.typeId)
                        ?.name || 'Select type'
                    : 'Select type'}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white z-[9999]">
              <Command>
                {(() => {
                  const filteredTypes = types.filter(
                    t =>
                      t.categoryId == selectedCategoryId ||
                      t.category_id == selectedCategoryId ||
                      t.categoryId === null ||
                      t.category_id === null
                  );
                  const showSearch = filteredTypes.length > 5;
                  return (
                    <>
                      {showSearch && (
                        <CommandInput
                          placeholder="Search types..."
                          value={typeSearch}
                          onValueChange={setTypeSearch}
                        />
                      )}
                      <CommandEmpty>No types found.</CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-y-auto">
                        {filteredTypes.length === 0 && (
                          <CommandItem disabled>
                            {selectedCategoryId
                              ? 'No types available for this category'
                              : 'Select a category first'}
                          </CommandItem>
                        )}
                        {filteredTypes
                          .filter(t =>
                            t.name
                              .toLowerCase()
                              .includes(typeSearch.toLowerCase())
                          )
                          .map(t => (
                            <CommandItem
                              key={t.id}
                              value={t.name}
                              onSelect={() => {
                                updateForm('typeId', t.id.toString());
                                updateForm('type', t.name);
                                setTypeOpen(false);
                                setTypeSearch('');
                              }}
                              className="hover:bg-gray-200"
                            >
                              {t.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                      {/* Show all types if none are found in the filtered list but we have a selected type */}
                      {selectedCategoryId &&
                        filteredTypes.length === 0 &&
                        formData.typeId && (
                          <CommandGroup className="max-h-60 overflow-y-auto">
                            <CommandItem disabled>
                              Selected type not available for this category
                            </CommandItem>
                          </CommandGroup>
                        )}
                    </>
                  );
                })()}
              </Command>
              {canAdd && (
                <div className="p-2 border-t">
                  <Button
                    onClick={() => {
                      onOpenAddType();
                      setTypeOpen(false);
                    }}
                    size="sm"
                    className="w-full"
                  >
                    Add Type
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-2">
          <Label className="font-semibold">
            Brand <span className="text-red-500">*</span>
          </Label>
          <Popover open={brandOpen} onOpenChange={setBrandOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-12 w-full justify-between">
                {formData.brandId
                  ? brands.find(b => b.id.toString() === formData.brandId)
                      ?.name ||
                    formData.brand ||
                    'Select brand'
                  : formData.brand
                    ? // Try to find the brand by name if we have a brand name but no ID
                      brands.find(
                        b =>
                          b.name.toLowerCase() === formData.brand?.toLowerCase()
                      )?.name || formData.brand
                    : 'Select brand'}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white z-[9999]">
              <Command>
                {(() => {
                  // Show all brands if no type is selected, otherwise filter by type
                  let filteredBrands = [];
                  if (!formData.typeId) {
                    filteredBrands = brands;
                  } else {
                    filteredBrands = brands.filter(
                      b =>
                        b.typeId == formData.typeId ||
                        b.type_id == formData.typeId ||
                        b.typeId === null ||
                        b.type_id === null
                    );
                  }

                  const showSearch = filteredBrands.length > 5;
                  return (
                    <>
                      {showSearch && (
                        <CommandInput
                          placeholder="Search brands..."
                          value={brandSearch}
                          onValueChange={setBrandSearch}
                        />
                      )}
                      <CommandEmpty>No brands found.</CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-y-auto">
                        {!formData.typeId && brands.length > 0 && (
                          <>
                            <CommandItem
                              disabled
                              className="text-xs text-gray-500"
                            >
                              Select a type to filter brands or choose from all
                              brands below
                            </CommandItem>
                            {brands
                              .filter(b =>
                                b.name
                                  .toLowerCase()
                                  .includes(brandSearch.toLowerCase())
                              )
                              .map(b => (
                                <CommandItem
                                  key={b.id}
                                  value={b.name}
                                  onSelect={() => {
                                    updateForm('brandId', b.id.toString());
                                    updateForm('brand', b.name);
                                    setBrandOpen(false);
                                    setBrandSearch('');
                                  }}
                                  className="hover:bg-gray-200"
                                >
                                  {b.name}
                                </CommandItem>
                              ))}
                          </>
                        )}
                        {formData.typeId && filteredBrands.length === 0 && (
                          <CommandItem disabled>
                            No brands available for this type
                          </CommandItem>
                        )}
                        {formData.typeId &&
                          filteredBrands
                            .filter(b =>
                              b.name
                                .toLowerCase()
                                .includes(brandSearch.toLowerCase())
                            )
                            .map(b => (
                              <CommandItem
                                key={b.id}
                                value={b.name}
                                onSelect={() => {
                                  updateForm('brandId', b.id.toString());
                                  updateForm('brand', b.name);
                                  setBrandOpen(false);
                                  setBrandSearch('');
                                }}
                                className="hover:bg-gray-200"
                              >
                                {b.name}
                              </CommandItem>
                            ))}
                      </CommandGroup>
                      {/* Show all brands if none are found in the filtered list but we have a selected brand */}
                      {formData.typeId &&
                        filteredBrands.length === 0 &&
                        formData.brandId && (
                          <CommandGroup className="max-h-60 overflow-y-auto">
                            <CommandItem disabled>
                              Selected brand not available for this type
                            </CommandItem>
                            {/* Show the selected brand anyway if it exists */}
                            {formData.brandId && brands.length > 0 && (
                              <CommandItem
                                key={formData.brandId}
                                value={formData.brand || 'Unknown Brand'}
                                onSelect={() => {
                                  setBrandOpen(false);
                                  setBrandSearch('');
                                }}
                                className="hover:bg-gray-200"
                              >
                                {formData.brand || 'Unknown Brand'} (Currently
                                selected)
                              </CommandItem>
                            )}
                          </CommandGroup>
                        )}
                    </>
                  );
                })()}
              </Command>
              {canAdd && (
                <div className="p-2 border-t">
                  <Button
                    onClick={() => {
                      onOpenAddBrand();
                      setBrandOpen(false);
                    }}
                    size="sm"
                    className="w-full"
                  >
                    Add Brand
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label className="font-semibold">
            Model <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="Z1AW001"
            value={formData.model || ''}
            onChange={e => updateForm('model', e.target.value)}
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-semibold">
            Serial Number <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="SN123456789"
            value={formData.serial || ''}
            onChange={e => updateForm('serial', e.target.value)}
            className="h-12"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="font-semibold">Asset Image</Label>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            className={`relative border-2 border-dashed rounded-lg p-10 text-center transition-all cursor-pointer ${
              imageDragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={e => {
              e.preventDefault();
              setImageDragOver(true);
            }}
            onDragLeave={e => {
              e.preventDefault();
              setImageDragOver(false);
            }}
            onDrop={handleImageDrop}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-3 text-sm font-medium text-gray-700">
              Drop image here or click to upload
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>

          {imagePreview && (
            <div className="relative group">
              <img
                src={proxyCloudinaryUrl(imagePreview)}
                alt="Asset preview"
                className="rounded-lg object-cover w-full h-64 border shadow-lg"
              />
              <button
                onClick={removeImage}
                className="absolute top-3 right-3 bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="font-semibold">Supporting Documents</Label>
        <div
          className={`relative border-2 border-dashed rounded-lg p-10 transition-all text-center cursor-pointer ${
            docDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={e => {
            e.preventDefault();
            setDocDragOver(true);
          }}
          onDragLeave={e => {
            e.preventDefault();
            setDocDragOver(false);
          }}
          onDrop={handleDocDrop}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
            onChange={handleDocChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <Paperclip className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-3 text-sm font-medium text-gray-700">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-gray-500">PDF, Word, Excel, Images...</p>
        </div>

        {documents.length > 0 && (
          <div className="mt-6 space-y-3">
            {documents.map(({ file, progress, id }) => (
              <div
                key={id}
                className="flex items-center gap-4 bg-gray-50 rounded-lg p-4 border"
              >
                <FileText className="h-10 w-10 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB •{' '}
                    {progress < 100 ? 'Uploading...' : 'Uploaded'}
                  </p>
                  <Progress value={progress} className="h-2 mt-2" />
                </div>
                {progress === 100 && (
                  <button
                    onClick={() => removeDocument(id)}
                    className="text-red-600 hover:text-red-800 dark:hover:text-red-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

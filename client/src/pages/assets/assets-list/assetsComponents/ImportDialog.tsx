import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Table,
  FileSpreadsheet,
  FileUp,
  Info,
  HelpCircle,
  ChevronRight,
  X,
} from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ParsedAssetRow, ParsedBuilderRow, ImportResult } from '@/hooks/useAssetImport';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedAssets: ParsedAssetRow[] | null;
  parsedBuilders: ParsedBuilderRow[] | null;
  validationErrors: { row: number; field: string; message: string }[];
  importResult: ImportResult | null;
  isUploading: boolean;
  fileName: string | null;
  onFileUpload: (file: File) => Promise<void>;
  onImport: () => Promise<ImportResult | null>;
  onDownloadTemplate: () => Promise<void>;
  onReset: () => void;
}

interface ColumnGuide {
  field: string;
  required: boolean;
  type: string;
  example: string;
  description: string;
}

const BASIC_INFO_COLUMNS: ColumnGuide[] = [
  { field: 'name', required: true, type: 'Text', example: 'Dell OptiPlex 7090', description: 'Asset name' },
  { field: 'description', required: false, type: 'Text', example: 'IT Department Desktop', description: 'Asset description' },
  { field: 'category', required: true, type: 'Text', example: 'Computer', description: 'Category name (must exist in system)' },
  { field: 'type', required: false, type: 'Text', example: 'Desktop', description: 'Type name (must exist in system)' },
  { field: 'brand', required: false, type: 'Text', example: 'Dell', description: 'Brand name' },
  { field: 'model', required: false, type: 'Text', example: 'OptiPlex 7090', description: 'Model number' },
  { field: 'serial', required: false, type: 'Text', example: 'SN-001-ABC', description: 'Serial number' },
  { field: 'supplier', required: false, type: 'Text', example: 'ABC Supplier Inc.', description: 'Supplier name' },
];

const FINANCIAL_COLUMNS: ColumnGuide[] = [
  { field: 'purchase_date', required: false, type: 'Date', example: '2025-01-15', description: 'Purchase date (YYYY-MM-DD)' },
  { field: 'asset_value', required: false, type: 'Number', example: '65000', description: 'Purchase price/value' },
  { field: 'salvage_value', required: false, type: 'Number', example: '5000', description: 'Salvage/residual value' },
  { field: 'depreciation_method', required: false, type: 'Select', example: 'straight-line', description: 'straight-line, declining-balance, double-declining, units-of-production' },
  { field: 'useful_life_years', required: false, type: 'Number', example: '5', description: 'Useful life in years' },
  { field: 'depreciation_start_date', required: false, type: 'Date', example: '2025-02-01', description: 'Depreciation start date (YYYY-MM-DD)' },
  { field: 'warranty_months', required: false, type: 'Number', example: '24', description: 'Warranty period in months' },
];

const LOCATION_COLUMNS: ColumnGuide[] = [
  { field: 'company', required: true, type: 'Text', example: 'ACME Corp', description: 'Company name (must exist in system)' },
  { field: 'building', required: false, type: 'Text', example: 'Main Building', description: 'Building name' },
  { field: 'department', required: false, type: 'Text', example: 'IT Department', description: 'Department name (must exist in system)' },
  { field: 'location_site', required: false, type: 'Text', example: 'Head Office', description: 'Location site name' },
  { field: 'location_room', required: false, type: 'Text', example: 'Room 301', description: 'Room/area name' },
  { field: 'location_notes', required: false, type: 'Text', example: '3rd floor, left wing', description: 'Location notes' },
];

const STATUS_COLUMNS: ColumnGuide[] = [
  { field: 'condition', required: false, type: 'Select', example: 'Excellent', description: 'New, Excellent, Good, Fair, Poor, Bad, Needs Repair, Obsolete, Damaged' },
  { field: 'maintenance_schedule', required: false, type: 'Select', example: 'Quarterly', description: 'Monthly, Quarterly, Semi-Annual, Annually, As Needed, None' },
  { field: 'status', required: false, type: 'Select', example: 'Available', description: 'Available, Assigned, In Use, For Disposal, etc.' },
  { field: 'is_old_unit', required: false, type: 'Boolean', example: 'no', description: 'yes/no or true/false' },
  { field: 'assigned_user', required: false, type: 'Text', example: 'EMP001', description: 'Employee number or email' },
];

function ColumnGuideTable({ columns, title }: { columns: ColumnGuide[]; title?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Column</th>
            <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Required</th>
            <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Example</th>
            <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {columns.map((col, i) => (
            <motion.tr
              key={col.field}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="hover:bg-gray-50/80 transition-colors"
            >
              <td className="px-4 py-2.5">
                <code className="text-xs font-mono font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                  {col.field}
                </code>
              </td>
              <td className="px-4 py-2.5">
                {col.required ? (
                  <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-semibold uppercase tracking-wide">
                    Required
                  </Badge>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">Optional</span>
                )}
              </td>
              <td className="px-4 py-2.5">
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-medium">
                  {col.type}
                </Badge>
              </td>
              <td className="px-4 py-2.5">
                <code className="text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                  {col.example}
                </code>
              </td>
              <td className="px-4 py-2.5 text-xs text-gray-600 leading-relaxed">{col.description}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionCard({ icon: Icon, title, description, children, className }: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200',
      className
    )}>
      <div className="flex items-center gap-3 mb-4">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
          <Icon className="h-4 w-4 text-red-600" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function ImportDialog({
  open,
  onOpenChange,
  parsedAssets,
  parsedBuilders,
  validationErrors,
  importResult,
  isUploading,
  fileName,
  onFileUpload,
  onImport,
  onDownloadTemplate,
  onReset,
}: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'guide' | 'preview'>('guide');
  const [importing, setImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep('preview');
    await onFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setStep('preview');
    await onFileUpload(file);
  };

  const handleImport = async () => {
    setImporting(true);
    await onImport();
    setImporting(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    onReset();
    setStep('guide');
    setIsDragOver(false);
  };

  const hasValidationErrors = validationErrors.length > 0;
  const hasData = parsedAssets && parsedAssets.length > 0;

  const assetCount = parsedAssets?.length ?? 0;
  const builderCount = parsedBuilders?.length ?? 0;
  const totalRows = assetCount + builderCount;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <AppDialogFrame className="max-w-4xl max-h-[90vh] overflow-hidden !flex !flex-col !border-0 !shadow-2xl">
        <AppDialogGradientHeader
          title={step === 'guide' ? 'Import Assets from Excel' : 'Preview & Import'}
          description={
            step === 'guide'
              ? 'Upload an Excel file to bulk import assets and optionally create builder groups in one go.'
              : `${assetCount} asset${assetCount !== 1 ? 's' : ''}${builderCount > 0 ? `, ${builderCount} builder row${builderCount !== 1 ? 's' : ''}` : ''} found in "${fileName ?? 'uploaded file'}"`
          }
        />

        <AppDialogBody className="overflow-y-auto py-5 sm:py-6">
          {step === 'guide' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Upload zone */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'relative border-2 border-dashed rounded-2xl p-10 sm:p-12 text-center cursor-pointer transition-all duration-200 group',
                  isDragOver
                    ? 'border-red-400 bg-red-50/50 shadow-lg shadow-red-100'
                    : 'border-gray-300 hover:border-red-300 hover:bg-red-50/30 hover:shadow-md'
                )}
              >
                <div className={cn(
                  'mx-auto w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200 mb-4',
                  isDragOver
                    ? 'bg-red-100 scale-110'
                    : 'bg-gray-100 group-hover:bg-red-100 group-hover:scale-105'
                )}>
                  <FileSpreadsheet className={cn(
                    'h-8 w-8 transition-colors duration-200',
                    isDragOver ? 'text-red-600' : 'text-gray-400 group-hover:text-red-500'
                  )} />
                </div>
                <p className="text-base font-semibold text-gray-800 mb-1">
                  {isDragOver ? 'Drop your file here' : 'Click to select or drag & drop'}
                </p>
                <p className="text-sm text-gray-500">
                  Excel file (.xlsx) with an <span className="font-semibold text-gray-700">"Assets"</span> sheet
                  {', '}optionally a <span className="font-semibold text-gray-700">"Builders"</span> sheet
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </motion.div>

              {/* Template download */}
              <div className="flex items-center justify-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownloadTemplate}
                  className="rounded-xl gap-2 px-5 shadow-sm hover:shadow-md transition-all"
                >
                  <Download className="h-4 w-4" />
                  Download Sample Template
                </Button>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
              </div>

              {/* Column sections */}
              <div className="space-y-5">
                <SectionCard icon={Info} title="Basic Information" description="Identity and classification fields">
                  <ColumnGuideTable columns={BASIC_INFO_COLUMNS} />
                </SectionCard>

                <SectionCard icon={FileUp} title="Financial & Lifecycle" description="Purchase, depreciation, and warranty details">
                  <ColumnGuideTable columns={FINANCIAL_COLUMNS} />
                </SectionCard>

                <SectionCard icon={HelpCircle} title="Location & Assignment" description="Where the asset belongs and who it's assigned to">
                  <ColumnGuideTable columns={LOCATION_COLUMNS} />
                </SectionCard>

                <SectionCard icon={Table} title="Status & Configuration" description="Operational state and asset settings">
                  <ColumnGuideTable columns={STATUS_COLUMNS} />
                </SectionCard>
              </div>

              {/* Builders sheet info */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 sm:p-6"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Table className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-blue-900 mb-1">Optional: "Builders" Sheet</h4>
                    <p className="text-xs text-blue-700/80 mb-4 leading-relaxed">
                      To create asset builder groups (composite assets), add a second sheet named <span className="font-semibold text-blue-800">"Builders"</span>.
                      Each row links one asset code to a builder group. Multiple rows with the same builder name are grouped together.
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-blue-200/60 bg-white/80">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-blue-50 border-b border-blue-100">
                            <th className="px-3 py-2.5 font-semibold text-blue-800 uppercase tracking-wider">Column</th>
                            <th className="px-3 py-2.5 font-semibold text-blue-800 uppercase tracking-wider">Required</th>
                            <th className="px-3 py-2.5 font-semibold text-blue-800 uppercase tracking-wider">Example</th>
                            <th className="px-3 py-2.5 font-semibold text-blue-800 uppercase tracking-wider">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100">
                          {[
                            { col: 'builder_name', req: true, ex: 'Workstation Set A', desc: 'Builder group name — rows sharing this name become one builder' },
                            { col: 'builder_description', req: false, ex: 'Complete workstation setup', desc: 'Optional builder description' },
                            { col: 'asset_code', req: true, ex: 'AST-001', desc: 'Asset code to include in the builder (one row per asset)' },
                            { col: 'is_parent', req: false, ex: 'yes', desc: 'Mark this asset as the parent component (yes/no)' },
                          ].map((row, i) => (
                            <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                              <td className="px-3 py-2"><code className="font-mono font-semibold text-blue-800 bg-blue-100/60 px-1.5 py-0.5 rounded">{row.col}</code></td>
                              <td className="px-3 py-2">{row.req ? <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge> : <span className="text-gray-400">Optional</span>}</td>
                              <td className="px-3 py-2"><code className="text-gray-500 font-mono bg-white px-1.5 py-0.5 rounded border border-blue-100">{row.ex}</code></td>
                              <td className="px-3 py-2 text-gray-600">{row.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {step === 'preview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-5"
            >
              {/* File info bar */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                <FileSpreadsheet className="h-5 w-5 text-red-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{fileName}</p>
                  <p className="text-xs text-gray-500">
                    {assetCount} asset{assetCount !== 1 ? 's' : ''}
                    {builderCount > 0 && `, ${builderCount} builder row${builderCount !== 1 ? 's' : ''}`}
                    {' '}· {totalRows} total row{totalRows !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setStep('guide'); onReset(); }}
                  className="shrink-0 rounded-lg text-xs gap-1"
                >
                  <ChevronRight className="h-3 w-3 rotate-180" />
                  Change File
                </Button>
              </div>

              {/* Validation errors */}
              {hasValidationErrors && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border-2 border-red-200 rounded-2xl p-5"
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-red-200 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-700" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-800">Validation Errors</p>
                      <p className="text-xs text-red-600">{validationErrors.length} issue{validationErrors.length !== 1 ? 's' : ''} found</p>
                    </div>
                  </div>
                  <ScrollArea className="max-h-32">
                    <div className="space-y-1.5">
                      {validationErrors.map((err, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-red-700 bg-red-100/50 rounded-lg px-3 py-2">
                          <span className="shrink-0 font-semibold mt-0.5">
                            {err.row > 0 ? `Row ${err.row}` : 'File'}:
                          </span>
                          <span>{err.message}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}

              {/* Asset preview */}
              {parsedAssets && parsedAssets.length > 0 && (
                <SectionCard icon={CheckCircle2} title="Asset Data" description={`${parsedAssets.length} row${parsedAssets.length !== 1 ? 's' : ''} parsed`}>
                  <ScrollArea className="max-h-52 rounded-xl border border-gray-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">#</th>
                          <th className="px-3 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                          <th className="px-3 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                          <th className="px-3 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                          <th className="px-3 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedAssets.slice(0, 50).map((a, i) => (
                          <motion.tr
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.01 }}
                            className="hover:bg-gray-50/80 transition-colors"
                          >
                            <td className="px-3 py-2 text-gray-400 font-mono">{a.row}</td>
                            <td className="px-3 py-2 font-medium text-gray-900">{a.name}</td>
                            <td className="px-3 py-2 text-gray-600">{a.category}</td>
                            <td className="px-3 py-2 text-gray-600">{a.company}</td>
                            <td className="px-3 py-2">
                              <Badge variant="secondary" className="text-[10px] font-medium">
                                {a.status || 'Available'}
                              </Badge>
                            </td>
                          </motion.tr>
                        ))}
                        {parsedAssets.length > 50 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-3 text-center text-xs text-gray-400 bg-gray-50/50">
                              ... and {parsedAssets.length - 50} more row{parsedAssets.length - 50 !== 1 ? 's' : ''}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </ScrollArea>
                </SectionCard>
              )}

              {/* Builder preview */}
              {parsedBuilders && parsedBuilders.length > 0 && (
                <SectionCard icon={Table} title="Builder Data" description={`${parsedBuilders.length} row${parsedBuilders.length !== 1 ? 's' : ''} parsed`}>
                  <ScrollArea className="max-h-36 rounded-xl border border-gray-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">Builder</th>
                          <th className="px-3 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">Asset Code</th>
                          <th className="px-3 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">Parent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedBuilders.map((b, i) => (
                          <motion.tr
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-gray-50/80 transition-colors"
                          >
                            <td className="px-3 py-2 font-medium text-gray-900">{b.builderName}</td>
                            <td className="px-3 py-2 font-mono text-gray-600">{b.assetCode}</td>
                            <td className="px-3 py-2">
                              {b.isParent ? (
                                <Badge variant="warning" className="text-[10px] font-medium">Parent</Badge>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </SectionCard>
              )}

              {/* Import result */}
              {importResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className={cn(
                    'rounded-2xl border-2 p-5 sm:p-6',
                    importResult.failed > 0
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-green-50 border-green-200'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                      importResult.failed > 0 ? 'bg-amber-200' : 'bg-green-200'
                    )}>
                      {importResult.failed > 0 ? (
                        <AlertTriangle className="h-5 w-5 text-amber-700" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-700" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 mb-1">Import Complete</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm text-gray-700">
                          <span className="font-semibold text-green-600">{importResult.created}</span> asset{importResult.created !== 1 ? 's' : ''} created
                        </span>
                        {importResult.builders.length > 0 && (
                          <span className="text-sm text-gray-700">
                            · <span className="font-semibold text-blue-600">{importResult.builders.length}</span> builder{importResult.builders.length !== 1 ? 's' : ''} created
                          </span>
                        )}
                        {importResult.failed > 0 && (
                          <span className="text-sm text-gray-700">
                            · <span className="font-semibold text-red-600">{importResult.failed}</span> error{importResult.failed !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {importResult.errors && importResult.errors.length > 0 && (
                        <ScrollArea className="max-h-24 mt-3">
                          <div className="space-y-1">
                            {importResult.errors.map((e, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-red-700 bg-red-100/50 rounded-lg px-3 py-1.5">
                                <span className="shrink-0 font-semibold">Row {e.row}:</span>
                                <span>{e.message}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* No data fallback */}
              {!hasData && !hasValidationErrors && !importResult && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <FileSpreadsheet className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">No data found</p>
                  <p className="text-xs text-gray-500 mb-4">The file doesn't contain any parsable data.</p>
                  <Button variant="outline" size="sm" onClick={() => { setStep('guide'); onReset(); }} className="rounded-xl">
                    Go back
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AppDialogBody>

        <AppDialogChromeFooter>
          <Button
            variant="outline"
            size="lg"
            onClick={handleClose}
            className="rounded-xl px-6"
          >
            {importResult ? 'Close' : 'Cancel'}
          </Button>

          {step === 'preview' && !importResult && (
            <Button
              size="lg"
              onClick={handleImport}
              disabled={!hasData || hasValidationErrors || importing || isUploading}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-8 shadow-md hover:shadow-lg gap-2 transition-all"
            >
              {importing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              {importing ? 'Importing...' : `Import ${assetCount} Asset${assetCount !== 1 ? 's' : ''}`}
            </Button>
          )}
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}

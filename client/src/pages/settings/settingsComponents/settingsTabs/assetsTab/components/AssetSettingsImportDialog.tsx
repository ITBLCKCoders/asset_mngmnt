import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  Info,
  ChevronRight,
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
import {
  type EntityType,
  type ColumnDef,
  type ValidationError,
  type ImportResult,
  getEntityColumns,
  getEntityLabel,
  parseImportFile,
  mapImportRows,
  validateImportRows,
  generateTemplate,
} from '../utils/importExportUtils';

interface AssetSettingsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  onImport: (rows: Record<string, string>[]) => Promise<ImportResult>;
  onAfterImport?: () => void;
}

function ColumnGuideTable({ columns }: { columns: ColumnDef[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Column</th>
            <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Required</th>
            <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Example</th>
            <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {columns.map((col, i) => (
            <motion.tr
              key={col.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="hover:bg-gray-50/80 transition-colors"
            >
              <td className="px-4 py-2.5">
                <code className="text-xs font-mono font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                  {col.header}
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

export function AssetSettingsImportDialog({
  open,
  onOpenChange,
  entityType,
  onImport,
  onAfterImport,
}: AssetSettingsImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'guide' | 'preview'>('guide');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[] | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importing, setImporting] = useState(false);

  const columns = getEntityColumns(entityType);
  const entityLabel = getEntityLabel(entityType);

  const reset = useCallback(() => {
    setFileName(null);
    setParsedRows(null);
    setValidationErrors([]);
    setImportResult(null);
    setIsProcessing(false);
    setImporting(false);
    setStep('guide');
    setIsDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    reset();
  }, [onOpenChange, reset]);

  const processFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setValidationErrors([]);
      setImportResult(null);
      try {
        const rawRows = await parseImportFile(file);
        const mappedRows = mapImportRows(rawRows);
        const errors = validateImportRows(entityType, mappedRows);
        setValidationErrors(errors);
        setParsedRows(mappedRows);
        setFileName(file.name);
        setStep('preview');
      } catch (err: any) {
        setValidationErrors([
          { row: 0, field: 'file', message: err.message || 'Failed to parse file' },
        ]);
        setFileName(file.name);
        setParsedRows([]);
        setStep('preview');
      } finally {
        setIsProcessing(false);
      }
    },
    [entityType]
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await processFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [processFile]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      await processFile(file);
    },
    [processFile]
  );

  const handleImport = useCallback(async () => {
    if (!parsedRows || parsedRows.length === 0) return;
    setImporting(true);
    try {
      const result = await onImport(parsedRows);
      setImportResult(result);
      if (onAfterImport) onAfterImport();
    } catch {
      setImportResult({
        created: 0,
        skipped: 0,
        failed: 1,
        errors: [{ row: 0, message: 'Import failed unexpectedly' }],
      });
    } finally {
      setImporting(false);
    }
  }, [parsedRows, onImport, onAfterImport]);

  const handleDownloadTemplate = useCallback(async () => {
    await generateTemplate(entityType);
  }, [entityType]);

  const hasValidationErrors = validationErrors.length > 0;
  const hasData = parsedRows && parsedRows.length > 0;
  const validRowCount = hasData ? parsedRows.length - validationErrors.filter(e => e.row > 0).length : 0;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <AppDialogFrame className="max-w-3xl max-h-[90vh] overflow-hidden !flex !flex-col !border-0 !shadow-2xl">
        <AppDialogGradientHeader
          title={step === 'guide' ? `Import ${entityLabel}` : 'Preview & Import'}
          description={
            step === 'guide'
              ? `Upload a CSV or Excel file to bulk import ${entityLabel.toLowerCase()}.`
              : `${parsedRows?.length ?? 0} row${(parsedRows?.length ?? 0) !== 1 ? 's' : ''} found in "${fileName ?? 'uploaded file'}"`
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
                  {isProcessing ? 'Processing...' : isDragOver ? 'Drop your file here' : 'Click to select or drag & drop'}
                </p>
                <p className="text-sm text-gray-500">
                  Supports CSV and Excel (.xlsx) files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                />
              </motion.div>

              {/* Template download */}
              <div className="flex items-center justify-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="rounded-xl gap-2 px-5 shadow-sm hover:shadow-md transition-all"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
              </div>

              {/* Column guide */}
              <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 sm:p-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Info className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-blue-900 mb-1">Import Instructions</h4>
                    <ul className="text-xs text-blue-700/80 space-y-1 mb-4 leading-relaxed">
                      <li>1. Download the template file above to see the required format</li>
                      <li>2. Fill in your data following the column structure in the template</li>
                      <li>3. Required columns are marked with an asterisk (*) in the template</li>
                      <li>4. For related fields (Category, Type, Department), use the exact name as it appears in the system</li>
                      <li>5. Duplicate entries (same name) will be automatically skipped</li>
                      <li>6. Upload your completed file using the area above</li>
                    </ul>
                  </div>
                </div>
              </div>

              <ColumnGuideTable columns={columns} />
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
                    {parsedRows?.length ?? 0} row{(parsedRows?.length ?? 0) !== 1 ? 's' : ''} parsed
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setStep('guide'); reset(); }}
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

              {/* Data preview */}
              {hasData && parsedRows.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900">Data Preview</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{parsedRows.length} row{parsedRows.length !== 1 ? 's' : ''} ready to import</p>
                    </div>
                  </div>
                  <ScrollArea className="max-h-52 rounded-xl border border-gray-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">#</th>
                          {columns.slice(0, 4).map(col => (
                            <th key={col.key} className="px-3 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">
                              {col.header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedRows.slice(0, 50).map((row, i) => (
                          <motion.tr
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.01 }}
                            className="hover:bg-gray-50/80 transition-colors"
                          >
                            <td className="px-3 py-2 text-gray-400 font-mono">{i + 2}</td>
                            {columns.slice(0, 4).map(col => (
                              <td key={col.key} className="px-3 py-2 text-gray-700">
                                {row[col.key] || <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                          </motion.tr>
                        ))}
                        {parsedRows.length > 50 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-3 text-center text-xs text-gray-400 bg-gray-50/50">
                              ... and {parsedRows.length - 50} more row{parsedRows.length - 50 !== 1 ? 's' : ''}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
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
                          <span className="font-semibold text-green-600">{importResult.created}</span> created
                        </span>
                        {importResult.skipped > 0 && (
                          <span className="text-sm text-gray-700">
                            · <span className="font-semibold text-amber-600">{importResult.skipped}</span> skipped (duplicates)
                          </span>
                        )}
                        {importResult.failed > 0 && (
                          <span className="text-sm text-gray-700">
                            · <span className="font-semibold text-red-600">{importResult.failed}</span> failed
                          </span>
                        )}
                      </div>
                      {importResult.errors && importResult.errors.length > 0 && (
                        <ScrollArea className="max-h-24 mt-3">
                          <div className="space-y-1">
                            {importResult.errors.map((e, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-red-700 bg-red-100/50 rounded-lg px-3 py-1.5">
                                <span className="shrink-0 font-semibold">
                                  {e.row > 0 ? `Row ${e.row}:` : 'Error:'}
                                </span>
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
                  <Button variant="outline" size="sm" onClick={() => { setStep('guide'); reset(); }} className="rounded-xl">
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
              disabled={!hasData || hasValidationErrors || importing || isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-8 shadow-md hover:shadow-lg gap-2 transition-all"
            >
              {importing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              {importing ? 'Importing...' : `Import ${validRowCount > 0 ? validRowCount : parsedRows?.length ?? 0} Row${(parsedRows?.length ?? 0) !== 1 ? 's' : ''}`}
            </Button>
          )}
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}

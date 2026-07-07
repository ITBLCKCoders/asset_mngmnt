'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Printer, QrCode, Barcode, ChevronUp, Loader2 } from 'lucide-react';
import { TagPreviewCard } from './TagPreviewCard';
import { Company } from '@/pages/settings/settingsComponents/settingsTabs/generalTab/components/utils/companyTypes';

const BARCODE_WIDTH_MAP: Record<number, number> = { 2: 520, 3: 460 };

interface AssetTagModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssetsData: any[];
  activeCompany: Company | null;
  onPrint: () => Promise<void>;
  columns: number;
  onColumnsChange: (cols: number) => void;
}

export function AssetTagModal({
  isOpen,
  onOpenChange,
  selectedAssetsData,
  activeCompany,
  onPrint,
  columns,
  onColumnsChange,
}: AssetTagModalProps) {
  const [tagType, setTagType] = useState<'qr' | 'barcode' | 'both'>('qr');
  const [showCompanyLogo, setShowCompanyLogo] = useState(true);
  const [showCompanyName, setShowCompanyName] = useState(true);
  const [showAssetName, setShowAssetName] = useState(true);
  const [showAssetCode, setShowAssetCode] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const barcodeWidth = BARCODE_WIDTH_MAP[columns] ?? 150;
  const visibleCount = [showCompanyLogo, showCompanyName, showAssetName, showAssetCode].filter(Boolean).length;

  const handlePrintClick = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      await onPrint();
    } finally {
      setIsPrinting(false);
    }
  };

  const tagTypeBtn = (type: 'qr' | 'barcode' | 'both', label: string, Icon: typeof QrCode) => (
    <button
      type="button"
      onClick={() => setTagType(type)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        tagType === type
          ? 'bg-red-600 text-white shadow-sm'
          : 'text-slate-700 hover:bg-white/90 hover:text-slate-900'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  const colBtn = (n: number) => (
    <button
      key={n}
      type="button"
      onClick={() => onColumnsChange(n)}
      className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors min-w-[28px] ${
        columns === n
          ? 'bg-red-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-white/90 hover:text-slate-900'
      }`}
    >
      {n}
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <AppDialogFrame className="max-w-5xl max-h-[80vh] overflow-hidden !flex !flex-col">
        <AppDialogGradientHeader
          title={
            <span className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-white"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <path d="M7 7h.01"></path>
                <path d="M7 11h.01"></path>
                <path d="M7 15h.01"></path>
                <path d="M11 7h.01"></path>
                <path d="M11 11h.01"></path>
                <path d="M11 15h.01"></path>
                <path d="M15 7h.01"></path>
                <path d="M15 11h.01"></path>
                <path d="M15 15h.01"></path>
              </svg>
              Asset Tags Preview
            </span>
          }
          description="Review tag layout, then download a PDF for printing."
        />
        <AppDialogBody className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div
            id="tags-grid"
            className={columns === 3 ? 'grid gap-0.5' : 'grid gap-1'}
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {selectedAssetsData.map(asset => {
              const qrData = `${window.location.origin}/assets/details/${asset.id}`;

              return (
                  <TagPreviewCard
                    key={asset.id}
                    asset={asset}
                    activeCompany={activeCompany}
                    qrData={qrData}
                    tagType={tagType}
                    barcodeFormat="CODE128"
                    barcodeWidth={barcodeWidth}
                    showCompanyLogo={showCompanyLogo}
                    showCompanyName={showCompanyName}
                    showAssetName={showAssetName}
                    showAssetCode={showAssetCode}
                  />
              );
            })}
          </div>
        </AppDialogBody>
        <AppDialogChromeFooter>
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/90 p-1 shadow-sm">
                {tagTypeBtn('qr', 'QR', QrCode)}
                {tagTypeBtn('barcode', 'Barcode', Barcode)}
                {tagTypeBtn('both', 'Both', QrCode)}
              </div>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-white/90"
                >
                  <ChevronUp className={`h-3.5 w-3.5 transition-transform ${showDropdown ? '' : 'rotate-180'}`} />
                  {visibleCount > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold">
                      {visibleCount}
                    </span>
                  )}
                </button>
                {showDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 w-40 rounded-lg border border-slate-200 bg-white shadow-lg z-50 overflow-hidden">
                    {[
                      { label: 'Logo', value: showCompanyLogo, set: setShowCompanyLogo },
                      { label: 'Company', value: showCompanyName, set: setShowCompanyName },
                      { label: 'Asset', value: showAssetName, set: setShowAssetName },
                      { label: 'Code', value: showAssetCode, set: setShowAssetCode },
                    ].map(({ label, value, set }) => (
                      <label
                        key={label}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={() => set(!value)}
                          className="accent-red-600"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/90 p-1 shadow-sm">
                <span className="text-[10px] font-medium text-slate-500 px-1.5">Cols</span>
                {colBtn(2)}
                {colBtn(3)}
              </div>
            </div>
            <Button
              onClick={handlePrintClick}
              disabled={isPrinting}
              className="bg-red-600 hover:bg-red-700 text-white min-w-[140px]"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Printer className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}

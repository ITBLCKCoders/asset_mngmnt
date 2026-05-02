'use client';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TagPreviewCard } from './TagPreviewCard';
import { Company } from '@/pages/settings/settingsComponents/settingsTabs/generalTab/components/utils/companyTypes';

interface AssetTagModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssetsData: any[];
  activeCompany: Company | null;
  onPrint: () => Promise<void>;
}

export function AssetTagModal({
  isOpen,
  onOpenChange,
  selectedAssetsData,
  activeCompany,
  onPrint,
}: AssetTagModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <AppDialogFrame className="max-w-4xl max-h-[80vh] overflow-hidden !flex !flex-col">
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 print:grid-cols-2"
          >
            {selectedAssetsData.map(asset => {
              const qrData = `${window.location.origin}/assets/details/${asset.id}`;

              return (
                <TagPreviewCard
                  key={asset.id}
                  asset={asset}
                  activeCompany={activeCompany}
                  qrData={qrData}
                />
              );
            })}
          </div>
        </AppDialogBody>
        <AppDialogChromeFooter>
          <Button
            onClick={onPrint}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Printer className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}

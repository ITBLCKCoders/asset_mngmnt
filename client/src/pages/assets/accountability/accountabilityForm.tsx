'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateAssetChecklistPDF, downloadPDF } from '@/lib/pdfGenerator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogTitle } from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  segmentTabsListClassName,
  segmentTabsTriggerClassName,
} from '@/components/ui/tabs';
import {
  AppDialogBody,
  AppDialogChromeFooter,
  AppDialogFrame,
  AppDialogGradientHeader,
  AppAlertDialogChromeFooter,
  AppAlertDialogFrame,
  AppAlertDialogGradientHeader,
  AppAlertDialogMessage,
} from '@/components/common/appDialogChrome';
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  User,
  Package,
  Calendar,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createLogger } from '@/lib/logger';
import { getApiBase } from '@/lib/env';
import { cn } from '@/lib/utils';
import {
  classifyDepartmentScopeByName,
  type ClientAssetScopeType,
} from '@/lib/assetScope';
import { PDFViewer } from '@/components/PDFViewer';
import {
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const logger = createLogger('AccountabilityForm');

// Simple in-memory PDF cache
const pdfCache = new Map<string, Blob>();

// Simple in-memory image cache
const imageCache = new Map<string, string>();

// Debounce utility
const debounce = <T extends (...args: T[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Generate cache key from form data
const generateCacheKey = (form: AccountabilityForm, currentUser?: any): string => {
  const keyData = {
    formId: form.id,
    formNumber: form.formNumber,
    status: form.status,
    issuerSignature: form.issuerSignature,
    itCopySignature: form.itCopySignature,
    receivedCopy201FileSignature: form.receivedCopy201FileSignature,
    digitalSignature: form.acknowledgments?.digitalSignature,
    assetCount: form.assets.length,
    assetIds: form.assets.map(a => a.id).join(','),
    currentUser: currentUser?.id,
  };
  return JSON.stringify(keyData);
};

// Helper function to add logo to PDF
const addLogoToPDF = async (doc: jsPDF, logoUrl?: string) => {
  try {
    if (!logoUrl) {
      logger.debug('No company logo available');
      return;
    }

    // Check image cache first
    if (imageCache.has(logoUrl)) {
      logger.debug('Using cached logo image');
      const cachedImgData = imageCache.get(logoUrl);
      if (cachedImgData) {
        // Create a new image to get dimensions
        const img = new Image();
        return new Promise<string>(resolve => {
          img.onload = function () {
            // Use full size but convert pixels to mm (assuming 96 DPI)
            const pixelsToMm = 0.264583; // 1 pixel = 0.264583 mm at 96 DPI
            const fullWidth = img.width * pixelsToMm;
            const fullHeight = img.height * pixelsToMm;

            // If logo is too large, scale down proportionally to fit in available space
            const maxWidth = 80; // Maximum width in mm
            const maxHeight = 40; // Maximum height in mm

            let finalWidth = fullWidth;
            let finalHeight = fullHeight;

            if (fullWidth > maxWidth) {
              const scale = maxWidth / fullWidth;
              finalWidth = maxWidth;
              finalHeight = fullHeight * scale;
            }

            if (finalHeight > maxHeight) {
              const scale = maxHeight / finalHeight;
              finalHeight = maxHeight;
              finalWidth = finalWidth * scale;
            }

            // Add logo with calculated dimensions
            doc.addImage(cachedImgData, 'PNG', 15, 8, finalWidth, finalHeight);
            resolve(cachedImgData);
          };
          img.src = cachedImgData;
        });
      }
    }

    const response = await fetch(logoUrl);
    if (response.ok) {
      const blob = await response.blob();
      const reader = new FileReader();
      return new Promise<string>(resolve => {
        reader.onload = e => {
          const imgData = e.target?.result as string;
          // Cache the image data
          imageCache.set(logoUrl, imgData);
          
          // Create a new image to get dimensions
          const img = new Image();
          img.onload = function () {
            // Use full size but convert pixels to mm (assuming 96 DPI)
            const pixelsToMm = 0.264583; // 1 pixel = 0.264583 mm at 96 DPI
            const fullWidth = img.width * pixelsToMm;
            const fullHeight = img.height * pixelsToMm;

            // If logo is too large, scale down proportionally to fit in available space
            const maxWidth = 80; // Maximum width in mm
            const maxHeight = 40; // Maximum height in mm

            let finalWidth = fullWidth;
            let finalHeight = fullHeight;

            if (fullWidth > maxWidth) {
              const scale = maxWidth / fullWidth;
              finalWidth = maxWidth;
              finalHeight = fullHeight * scale;
            }

            if (finalHeight > maxHeight) {
              const scale = maxHeight / finalHeight;
              finalHeight = maxHeight;
              finalWidth = finalWidth * scale;
            }

            // Add logo with calculated dimensions
            doc.addImage(imgData, 'PNG', 15, 8, finalWidth, finalHeight);
            resolve(imgData);
          };
          img.src = imgData;
        };
        reader.readAsDataURL(blob);
      });
    }
  } catch (error) {
    logger.debug('Logo not found, continuing without it');
  }
  return null;
};

// Helper function to add signature to PDF (handles both text and base64 images)
const addSignatureToPDF = async (
  doc: jsPDF,
  signatureData: string | undefined,
  x: number,
  y: number,
  maxWidth: number = 50,
  maxHeight: number = 20
): Promise<void> => {
  try {
    logger.debug('addSignatureToPDF called', { hasSignature: !!signatureData, x, y });
    
    if (!signatureData) {
      logger.debug('No signature data provided');
      return;
    }

    // Check if signature is plain text (not a base64 image or Cloudinary URL)
    // Base64 images start with "data:image/", Cloudinary URLs start with "http://" or "https://"
    // Plain text is short and doesn't start with these prefixes
    const isPlainText = !signatureData.startsWith('data:image/') &&
                        !signatureData.startsWith('http://') &&
                        !signatureData.startsWith('https://') &&
                        signatureData.length < 100;

    if (isPlainText) {
      // Render as text initials
      logger.debug('Rendering signature as text', { text: signatureData });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(signatureData, x, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    } else {
      // Render as base64 image or Cloudinary URL
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Check if signature is a URL (not base64) and if it's cached
      if (signatureData.startsWith('http://') || signatureData.startsWith('https://')) {
        if (imageCache.has(signatureData)) {
          logger.debug('Using cached signature image');
          img.src = imageCache.get(signatureData)!;
        } else {
          img.src = signatureData;
        }
      } else {
        img.src = signatureData;
      }
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          logger.debug('Signature image loaded', { width: img.width, height: img.height });
          
          // Convert image to black using canvas
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Convert to black and white, keeping black pixels black, others transparent
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];
              
              // If pixel is not transparent
              if (a > 0) {
                // Make it black
                data[i] = 0;     // R
                data[i + 1] = 0; // G
                data[i + 2] = 0; // B
                data[i + 3] = a; // Keep original alpha
              }
            }
            
            ctx.putImageData(imageData, 0, 0);
            // Cache the processed signature image if it's a URL
            if (signatureData.startsWith('http://') || signatureData.startsWith('https://')) {
              const processedDataUrl = canvas.toDataURL();
              imageCache.set(signatureData, processedDataUrl);
              img.src = processedDataUrl;
            } else {
              img.src = canvas.toDataURL();
            }
          }
          
          resolve();
        };
        img.onerror = () => {
          logger.debug('Failed to load signature image');
          reject(new Error('Failed to load signature image'));
        };
      });

      const pixelsToMm = 0.264583;
      const sigWidth = img.width * pixelsToMm;
      const sigHeight = img.height * pixelsToMm;
      
      let finalSigWidth = sigWidth;
      let finalSigHeight = sigHeight;
      
      if (sigWidth > maxWidth) {
        const scale = maxWidth / sigWidth;
        finalSigWidth = maxWidth;
        finalSigHeight = sigHeight * scale;
      }
      
      if (finalSigHeight > maxHeight) {
        const scale = maxHeight / finalSigHeight;
        finalSigHeight = maxHeight;
        finalSigWidth = finalSigWidth * scale;
      }
      
      logger.debug('Adding signature image to PDF', { finalSigWidth, finalSigHeight, x, y });
      doc.addImage(img.src, 'PNG', x, y, finalSigWidth, finalSigHeight);
    }
  } catch (error) {
    logger.debug('Failed to add signature to PDF', error as Record<string, unknown>);
  }
};

// Helper to classify an asset into IT/Admin/Other scope using department-like names
const getAssetScopeType = (
  asset: AccountabilityForm['assets'][number],
  form: AccountabilityForm
): ClientAssetScopeType => {
  const deptCandidate =
    asset.categoryDepartment ||
    form.department?.name ||
    form.user.department?.name ||
    asset.category ||
    '';
  return classifyDepartmentScopeByName(deptCandidate);
};

// Helper function to determine department label for header based on asset scopes
const getDepartmentName = (form: AccountabilityForm) => {
  let hasIT = false;
  let hasAdmin = false;

  for (const asset of form.assets) {
    const scope = getAssetScopeType(asset, form);
    if (scope === 'IT') hasIT = true;
    if (scope === 'Admin') hasAdmin = true;
    if (hasIT && hasAdmin) break;
  }

  if (hasIT && hasAdmin) {
    return 'Human Resources Department';
  }
  if (hasIT) {
    return 'IT Department';
  }
  if (hasAdmin) {
    return 'Administration Department';
  }
  return 'Human Resources Department';
};

export interface AccountabilityForm {
  id: string;
  formNumber: string;
  assets: {
    id: string;
    code: string;
    name: string;
    category: string;
    categoryDepartment?: string; // Added category department information
    type: string;
    serialNo: string;
    modelNo?: string;
    brand?: string;
    specifications?: any[];
  }[];
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    employeeNumber?: string;
    position?: string;
    company?: { id: string; name: string };
    department?: { id: string; name: string };
    companyLogoUrl?: string | null;
  };
  assignment: {
    id: string;
    assigned_date: string;
    expected_return_date?: string;
    assignment_notes?: string;
    assigned_by?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    } | null;
  };
  issuer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  department?: {
    id: string;
    name: string;
  };
  location?: {
    id: string;
    name: string;
    floor_unit: string;
    building: string;
  };
  status:
    | 'Pending'
    | 'Signed'
    | 'Completed'
    | 'Revoked'
    | 'Disabled'
    | 'Declined';
  declineReason?: string | null;
  created_at: string;
  updated_at?: string;
  signed_at?: string;
  issuerSignature?: string;
  itCopySignature?: string;
  receivedCopy201FileSignature?: string | null;
  receivedCopy201FileSignedAt?: string | null;
  receivedCopy201FileSignedById?: string | null;
  receivedCopy201FileSignedByName?: string | null;
  acknowledgments?: {
    digitalSignature?: string;
    [key: string]: any;
  };
  /** Issued when return assigns assets to processor (distinct from normal assignment forms). */
  formOrigin?: 'processor_return';
}

interface AccountabilityFormProps {
  form: AccountabilityForm;
  onSign?: (formId: string, acknowledgments?: Record<string, unknown>) => void;
  onView?: (form: AccountabilityForm) => void;
  onDownload?: (form: AccountabilityForm) => void;
  setActiveTab?: (tab: string) => void;
  showSignButton?: boolean;
  /** When true, status is derived from receivedCopy201FileSignature: Pending if empty, Signed if filled */
  statusBasedOnReceivedCopy?: boolean;
  /** When set, badge shows only Active vs Disabled (matches list filters; ignores received-copy derivation). */
  statusPillVariant?: 'default' | 'activeDisabled' | 'toReceive';
  /** Profile documents: allow assignee to decline pending form with a reason */
  showDeclineButton?: boolean;
  onDecline?: (formId: string, reason: string) => Promise<void>;
  /** HR Copy: show Receive to upload wet-signed PDF */
  showReceiveButton?: boolean;
  onReceive?: (form: AccountabilityForm) => void;
  /** Show download button in card footer */
  showDownloadButton?: boolean;
}

// Reusable PDF generation function (exported for issuer decline notification dialog)
export const generateAccountabilityFormPDF = async (
  form: AccountabilityForm,
  currentUser?: any
): Promise<Blob> => {
  // 8.5 x 13 inches is approximately 215.9 mm x 330.2 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [215.9, 330.2], // 8.5 x 13 inches in millimeters
  });
  // Table width and equal left/right margins (page 215.9mm - 10mm each side = 195.9mm)
  const tableMargin = { left: 10, right: 10 };
  const tableWidth = 195.9;
  const issuerName = form.issuer
    ? `${form.issuer.first_name} ${form.issuer.last_name}`
    : 'Administrator';

  // Set PDF properties
  doc.setProperties({
    title: `${form.user.first_name} ${form.user.last_name} ${form.formNumber}`,
    subject: 'Asset Accountability Form',
    author: 'Asset Management System',
  });

  const companyLogoUrl = form.user.companyLogoUrl ?? undefined;

  // Add logo first
  await addLogoToPDF(doc, companyLogoUrl);

  // Header with logo and FOR INTERNAL USE ONLY (moved slightly left)
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(255, 255, 255);
  doc.rect(145, 10, 55, 8, 'FD'); // Moved from 150 to 145mm x (only 5mm left)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal'); // Set font to normal (not bold)
  doc.text('FOR INTERNAL USE ONLY', 172.5, 16, { align: 'center' }); // Centered at new position

  // Add red box for asset accountability code below the FOR INTERNAL USE ONLY box (moved slightly left)
  doc.setDrawColor(255, 0, 0);
  doc.setFillColor(255, 255, 255);
  doc.rect(145, 20, 55, 8, 'FD'); // Moved from 150 to 145mm x (only 5mm left)
  doc.setTextColor(255, 0, 0);
  doc.setFontSize(12);
  doc.text(form.formNumber, 172.5, 26, { align: 'center' }); // Centered at new position
  doc.setTextColor(0, 0, 0);

  // Title - Bold and font size 14
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Asset Accountability Form', 105, 40, { align: 'center' });

  // Department - font size 12
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const departmentName = getDepartmentName(form);
  doc.text(departmentName, 105, 50, { align: 'center' });

  // Employee Information - font size 12 bold
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  let y = 70;
  doc.text('Employee Information', 20, y);
  y += 6; // Reduced from 10 to 6 to move table closer
  autoTable(doc, {
    startY: y,
    tableWidth,
    margin: tableMargin,
    head: [
      [
        'Employee Name',
        'Designation / Position',
        'Department',
        'Employee ID',
        'Date Issued',
      ],
    ],
    body: [
      [
        `${form.user.first_name} ${form.user.last_name}`,
        form.user.position || '',
        form.user.department?.name || form.department?.name || '',
        form.user.employeeNumber || '',
        `${new Date(form.created_at).toLocaleDateString()}`,
      ],
    ],
    theme: 'grid',
    styles: {
      fontSize: 12,
      cellPadding: 1,
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    headStyles: { fillColor: [199, 164, 100], textColor: [0, 0, 0] },
  });
  y = (doc as any).lastAutoTable.finalY + 15; // Increased from 6 to 15 to add more space

  // Acknowledgment of Receipt - font size 12 bold
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Acknowledgment of Receipt', 20, y);
  y += 10;

  // Categorize assets based on IT/Admin scope classification
  const itAssets = form.assets.filter(
    asset => getAssetScopeType(asset, form) === 'IT'
  );
  const adminAssets = form.assets.filter(
    asset => getAssetScopeType(asset, form) === 'Admin'
  );

  // Determine which department to show in the acknowledgment text
  let issuingDepartment = '_______________________________';
  if (itAssets.length > 0 && adminAssets.length > 0) {
    issuingDepartment = 'IT Department and Admin Department';
  } else if (itAssets.length > 0) {
    issuingDepartment = 'IT Department';
  } else if (adminAssets.length > 0) {
    issuingDepartment = 'Admin Department';
  }

  // Acknowledgment content - font size 12 normal (not bold)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const employeeName = `${form.user.first_name} ${form.user.last_name}`;

  // Create acknowledgment text with underlined employee name
  const acknowledgmentText = `I, ${employeeName}, acknowledge the receipt of the company properties listed below from ${issuingDepartment}, and agree to maintain them in good condition and to return them upon termination of my employment, for whatever reason, or when requested by Management. In case the said properties are no longer needed for the performance of my job, I will notify the Admin or IT Department through my superior to arrange for their surrender. Any damage incurred to the property, whether due to wear and tear or an incident or accident beyond my control, shall be reported immediately within twenty-four (24) hours to the Admin Department, with a copy furnished to the HR Department, using the Incident Report.

I agree that if any of the items are damaged or lost due to my negligence, I shall be held accountable. I hereby authorize the Company to deduct the cost from my salary, final pay, or any monetary claims, equivalent to the amount of the damage or the value of the lost company property.`;

  const splitAcknowledgment = doc.splitTextToSize(acknowledgmentText, 170);
  doc.text(splitAcknowledgment, 20, y, { align: 'justify', maxWidth: 170 });

  y += splitAcknowledgment.length * 5 + 5;

  // Preload company logo for continuation page headers
  let cachedContinuationLogo: {
    imgData: string;
    width: number;
    height: number;
  } | null = null;
  if (companyLogoUrl) {
    try {
      const response = await fetch(companyLogoUrl);
      if (response.ok) {
        const blob = await response.blob();
        const imgData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve((e.target?.result as string) || '');
          reader.onerror = () => reject(new Error('Failed to read logo'));
          reader.readAsDataURL(blob);
        });
        const dimensions = await new Promise<{ w: number; h: number }>(
          resolve => {
            const img = new Image();
            img.onload = () => {
              const pixelsToMm = 0.264583;
              let w = img.width * pixelsToMm;
              let h = img.height * pixelsToMm;
              const maxWidth = 80;
              const maxHeight = 40;
              if (w > maxWidth) {
                const s = maxWidth / w;
                w = maxWidth;
                h *= s;
              }
              if (h > maxHeight) {
                const s = maxHeight / h;
                h = maxHeight;
                w *= s;
              }
              resolve({ w, h });
            };
            img.onerror = () => resolve({ w: 0, h: 0 });
            img.src = imgData;
          }
        );
        cachedContinuationLogo = {
          imgData,
          width: dimensions.w,
          height: dimensions.h,
        };
      }
    } catch (err) {
      logger.warn('Failed to preload company logo for continuation pages');
    }
  }

  const continuationHeaderDrawnPages = new Set<number>();

  const drawContinuationHeader = () => {
    if (cachedContinuationLogo && cachedContinuationLogo.width > 0) {
      doc.addImage(
        cachedContinuationLogo.imgData,
        'PNG',
        125,
        8,
        cachedContinuationLogo.width,
        cachedContinuationLogo.height
      );
    }
    const continuationPageBoxWidth = 55;
    const continuationPageBoxHeight = 8;
    const continuationPageBoxX = 145;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.setFillColor(255, 255, 255);
    doc.rect(
      continuationPageBoxX,
      8 + 25 - 3,
      continuationPageBoxWidth,
      continuationPageBoxHeight,
      'FD'
    );
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('FOR INTERNAL USE ONLY', 172.5, 8 + 25 + 3, {
      align: 'center',
    });
  };

  // Table column header row (same structure as Employee Information table)
  const assetTableHead = [
    'Asset',
    'Brand',
    'Model No.',
    'Serial No.',
    'Asset Tag',
    'Condition',
  ];
  // Fixed column widths: Asset larger; Model No. and Serial No. small (tableWidth 195.9)
  const assetTableColumnStyles = {
    0: { cellWidth: 60 }, // Asset - larger, fixed
    1: { cellWidth: 32 }, // Brand
    2: { cellWidth: 22 }, // Model No. - small, fixed
    3: { cellWidth: 22 }, // Serial No. - small, fixed
    4: { cellWidth: 32 }, // Asset Tag
    5: { cellWidth: 27.9 }, // Condition
  };

  // IT Asset Details - font size 12 bold
  if (itAssets.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('IT Asset Details', 20, y);

    // Process IT assets in chunks of 15 rows per page
    const assetsPerPage = 15;
    let currentY = y + 5;
    let remainingAssets = [...itAssets];

    while (remainingAssets.length > 0) {
      const isFirstBatch = remainingAssets.length === itAssets.length;
      const currentBatch = remainingAssets.slice(0, assetsPerPage);
      remainingAssets = remainingAssets.slice(assetsPerPage);

      // Create rows for current batch
      const itAssetRows = currentBatch.map(asset => [
        asset.name,
        asset.brand || '',
        asset.modelNo || '',
        asset.serialNo,
        asset.code,
        'Good',
      ]);

      // On first page only: add empty rows when there are few assets; cap so table does not overflow to next page
      const maxRowsFirstPage = 10;
      if (isFirstBatch && itAssetRows.length < maxRowsFirstPage) {
        const emptyRowsNeeded = maxRowsFirstPage - itAssetRows.length;
        for (let i = 0; i < emptyRowsNeeded; i++) {
          itAssetRows.push(['', '', '', '', '', '']);
        }
      }

      // Show table header on first batch or when batch starts at top of page (one header per page)
      const showTableHead = isFirstBatch || currentY <= 80;

      autoTable(doc, {
        startY: currentY,
        tableWidth,
        margin: { ...tableMargin, top: 45 },
        head: showTableHead ? [assetTableHead] : [],
        body: itAssetRows,
        theme: 'grid',
        styles: {
          fontSize: 12,
          cellPadding: 1,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        headStyles: { fillColor: [199, 164, 100], textColor: [0, 0, 0] },
        columnStyles: assetTableColumnStyles,
        didDrawPage: data => {
          if (
            data.pageNumber >= 2 &&
            !continuationHeaderDrawnPages.has(data.pageNumber)
          ) {
            doc.setPage(data.pageNumber);
            drawContinuationHeader();
            continuationHeaderDrawnPages.add(data.pageNumber);
          }
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 1;

      // If there are more assets and we're approaching the bottom of the page, add a new page
      if (remainingAssets.length > 0) {
        const pageHeight = 330.2; // 8.5 x 13 inches in mm
        const bottomMargin = 30; // Leave some margin at bottom

        if (currentY + 50 > pageHeight - bottomMargin) {
          doc.addPage();
          const newPageNum = doc.getNumberOfPages();
          if (!continuationHeaderDrawnPages.has(newPageNum)) {
            drawContinuationHeader();
            continuationHeaderDrawnPages.add(newPageNum);
          }
          currentY = 45;
        }
      }
    }

    y = currentY;
  }

  // Admin Asset Details - font size 12 bold
  if (adminAssets.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Admin Asset Details', 20, y);

    // Process Admin assets in chunks of 15 rows per page
    const assetsPerPage = 15;
    let currentY = y + 5;
    let remainingAssets = [...adminAssets];

    while (remainingAssets.length > 0) {
      const isFirstBatch = remainingAssets.length === adminAssets.length;
      const currentBatch = remainingAssets.slice(0, assetsPerPage);
      remainingAssets = remainingAssets.slice(assetsPerPage);

      // Create rows for current batch
      const adminAssetRows = currentBatch.map(asset => [
        asset.name,
        asset.brand || '',
        asset.modelNo || '',
        asset.serialNo,
        asset.code,
        'Good',
      ]);

      // On first page only: add empty rows when there are few assets; cap so table does not overflow to next page
      const maxRowsFirstPage = 10;
      if (isFirstBatch && adminAssetRows.length < maxRowsFirstPage) {
        const emptyRowsNeeded = maxRowsFirstPage - adminAssetRows.length;
        for (let i = 0; i < emptyRowsNeeded; i++) {
          adminAssetRows.push(['', '', '', '', '', '']);
        }
      }

      // Show table header on first batch or when batch starts at top of page (one header per page)
      const showTableHead = isFirstBatch || currentY <= 80;

      autoTable(doc, {
        startY: currentY,
        tableWidth,
        margin: { ...tableMargin, top: 45 },
        head: showTableHead ? [assetTableHead] : [],
        body: adminAssetRows,
        theme: 'grid',
        styles: {
          fontSize: 12,
          cellPadding: 1,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        headStyles: { fillColor: [199, 164, 100], textColor: [0, 0, 0] },
        columnStyles: assetTableColumnStyles,
        didDrawPage: data => {
          if (
            data.pageNumber >= 2 &&
            !continuationHeaderDrawnPages.has(data.pageNumber)
          ) {
            doc.setPage(data.pageNumber);
            drawContinuationHeader();
            continuationHeaderDrawnPages.add(data.pageNumber);
          }
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 1;

      // If there are more assets and we're approaching the bottom of the page, add a new page
      if (remainingAssets.length > 0) {
        const pageHeight = 330.2; // 8.5 x 13 inches in mm
        const bottomMargin = 30; // Leave some margin at bottom

        if (currentY + 50 > pageHeight - bottomMargin) {
          doc.addPage();
          const newPageNum = doc.getNumberOfPages();
          if (!continuationHeaderDrawnPages.has(newPageNum)) {
            drawContinuationHeader();
            continuationHeaderDrawnPages.add(newPageNum);
          }
          currentY = 45;
        }
      }
    }

    y = currentY;
  }

  // Last page number that has table content (table continuation pages only; agreement/signature pages come after)

  // First page footer: gold bar and black line at fixed position at bottom of page 1 (page height 330.2 mm)
  doc.setPage(1);
  const footerGoldY = 320; // Near bottom of first page
  const footerLineY = 324;
  doc.setDrawColor(199, 164, 100); // Same color as table header background
  doc.setFillColor(199, 164, 100);
  doc.setLineWidth(0.1); // Thin line for the colored block border
  doc.rect(10, footerGoldY, 195, 1, 'FD'); // Gold bar in footer
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(6); // Thick line for the black line
  doc.line(10, footerLineY, 205, footerLineY); // Black line in footer

  // Company Property Issuance Agreement section
  // Ensure the agreement always starts on a clean page
  // Check if we're on the first page and tables might extend to second page
  const agreementPage = doc.getNumberOfPages();
  const pageHeight = 330.2; // 8.5 x 13 inches in mm
  const bottomMargin = 30; // Leave some margin at bottom

  // If we're approaching the bottom of the current page, or if tables might have extended to second page,
  // force the agreement to start on a new page
  if (y + 100 > pageHeight - bottomMargin || agreementPage > 1) {
    doc.addPage();
    y = 20;
  }

  // Header (logo + FOR INTERNAL USE ONLY) is drawn on all pages 2+ at the end - skip here to avoid duplicate

  // Centered "Company Property Issuance Agreement" title - font size 14 bold (space for header at top)
  y = 45; // Leave room for header drawn at end on this page
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Company Property Issuance Agreement', 105, y + 20, {
    align: 'center',
  });
  y += 35;

  // Agreement content - font size 12
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const agreementItems = [
    '1. This issued company property is for official use only.',
    '2. The issued company equipment shall remain the property of the Company, which retains all rights and sole discretion to regain possession, suspend its use, and/or assign the property to another employee as necessary.',
    '3. This Agreement shall continue to exist unless sooner terminated as provided herein, or upon determination by the Company that the provision of new equipment is necessary. In such a case, the old company property, along with all accompanying accessories, if any, shall be turned over without further need of demand to the Administration Department or the IT Department.',
    '4. In case of employment termination, the employee shall likewise surrender the Company issued property, together with all accompanying accessories, if any, to the Administration Department or IT Department not later than the last day of work, without further need of demand.',
    '5. In the event of damage, whether due to an accident or any untoward incident, the employee shall immediately file a report (through an Incident Report Form) within twenty four (24) hours, explaining the cause of the damage. The employee shall be fully accountable for the cost of repair if it is not covered or is no longer covered by warranty, in cases where the investigation conducted by Admin, IT, or HR concludes that the damage or loss was due to negligence or failure to follow company policy or job responsibilities.',
    '6. In case of loss due to negligence, the employee shall provide a replacement of the same model and condition. If such replacement is no longer possible, the employee shall pay in cash the full value of the equipment at the time it was supposed to be turned over, or at its current value, subject to investigation by Finance, IT, Admin, and HRD. The value of the laptop is not limited to its hardware but also includes its contents (company confidential information), software applications, licenses, and related assets.',
  ];

  // Render each agreement item with hanging indent (text wraps to text alignment, not under number)
  agreementItems.forEach((item, index) => {
    // Split each item into number and text content for hanging indent
    const numberMatch = item.match(/^(\d+\.)\s*/);
    if (numberMatch) {
      const numberPart = numberMatch[1];
      const textPart = item.slice(numberMatch[0].length);

      // Width of the number (including period and space) to calculate indent
      const numberWidth = 10; // mm - estimated width for "6. "

      // Draw the number at left position
      doc.text(numberPart, 20, y);

      // Draw the text with indentation to create hanging effect
      const splitText = doc.splitTextToSize(textPart, 170 - numberWidth);
      if (index === 0) {
        // Item 1 - left aligned with hanging indent
        for (const line of splitText) {
          doc.text(line, 20 + numberWidth, y);
          y += 5;
        }
      } else {
        // Items 2-6 - justified with hanging indent
        doc.text(splitText, 20 + numberWidth, y, {
          align: 'justify',
          maxWidth: 170 - numberWidth,
        });
        y += splitText.length * 5;
      }
    } else {
      // Fallback for items without number formatting
      const splitItem = doc.splitTextToSize(item, 170);
      if (index === 0) {
        for (const line of splitItem) {
          doc.text(line, 20, y);
          y += 5;
        }
      } else {
        doc.text(splitItem, 20, y, { align: 'justify', maxWidth: 170 });
        y += splitItem.length * 5;
      }
    }

    // Very minimal spacing between items (2mm) to move them closer
    if (index < agreementItems.length - 1) {
      y += 2;
    }
  });

  // Split the agreement text into two parts: main agreement and the signing clause
  const signingClause = `By signing this, I fully accept all the terms and conditions of this agreement. All the provisions and terms of this agreement have been made clear to me.`;

  // Always start the signing clause and signature section on a new page to ensure they're together
  doc.addPage();
  y = 45; // Leave room for header (logo + FOR INTERNAL USE ONLY) drawn at end on every page

  // Render signing clause - font size 12
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const splitSigningClause = doc.splitTextToSize(signingClause, 170);
  for (const line of splitSigningClause) {
    doc.text(line, 20, y);
    y += 5;
  }
  y += 10;

  // Add Document No in lower right side
  doc.setFontSize(10);
  doc.text(`Document No: ${form.formNumber} ver1 01Jan2026`, 190, 270, {
    align: 'right',
  });

  // Signatures
  const signatureY = y;
  doc.text('Issued by:', 20, signatureY);

  const issuerSignedDate = form.created_at
    ? new Date(form.created_at)
    : new Date();
  
  doc.text(`${issuerSignedDate.toLocaleDateString()}`, 60, signatureY + 10);
  doc.text(`${issuerSignedDate.toLocaleTimeString()}`, 60, signatureY + 15);
  doc.text(issuerName, 20, signatureY + 28);
  
  // Render issuer digital signature if available (to the right of the name)
  logger.debug('Rendering issuer signature', { 
    hasIssuerSignature: !!form.issuerSignature, 
    signatureLength: form.issuerSignature?.length 
  });
  await addSignatureToPDF(doc, form.issuerSignature, 20, signatureY + 22, 40, 15);
  
  doc.setLineWidth(0.2);
  doc.line(20, signatureY + 30, 80, signatureY + 30);
  doc.text('Signature over Printed Name', 20, signatureY + 35);

  doc.text('Issued to/ Received by:', 130, signatureY);

  if (form.status === 'Signed' && form.signed_at) {
    const empDate = new Date(form.signed_at);
    doc.text(`${empDate.toLocaleDateString()}`, 170, signatureY + 10);
    doc.text(`${empDate.toLocaleTimeString()}`, 170, signatureY + 15);
    doc.text(
      `${form.user.first_name} ${form.user.last_name}`,
      130,
      signatureY + 28
    );
    
    // Render digital signature from acknowledgments if available
    const digitalSignature = form.acknowledgments?.digitalSignature;
    logger.debug('Rendering user digital signature in Issued to section', { 
      hasDigitalSignature: !!digitalSignature, 
      signatureLength: digitalSignature?.length,
      signaturePrefix: digitalSignature?.substring(0, 50)
    });
    if (digitalSignature) {
      await addSignatureToPDF(doc, digitalSignature, 125, signatureY + 22, 40, 25);
    }
    
    doc.setLineWidth(0.2);
    doc.line(130, signatureY + 30, 190, signatureY + 30);
    doc.text('Signature over Printed Name', 130, signatureY + 35);
  } else {
    doc.text(
      `${form.user.first_name} ${form.user.last_name}`,
      130,
      signatureY + 28
    );
    doc.text('____________________', 130, signatureY + 30);
    doc.text('Signature over Printed Name', 130, signatureY + 35);
  }

  // Determine which copy label to use based on asset types
  const copyLabel = itAssets.length > 0 ? 'Copy for IT:' : 'Copy for Admin:';
  doc.text(copyLabel, 20, signatureY + 60);

  const itCopyDate = form.created_at ? new Date(form.created_at) : new Date();
  
  doc.text(`${itCopyDate.toLocaleDateString()}`, 60, signatureY + 70);
  doc.text(`${itCopyDate.toLocaleTimeString()}`, 60, signatureY + 75);
  doc.text(issuerName, 20, signatureY + 88);
  
  // Render IT copy digital signature if available (between name and signature line)
  logger.debug('Rendering IT copy signature', { 
    hasITCopySignature: !!form.itCopySignature, 
    signatureLength: form.itCopySignature?.length 
  });
  await addSignatureToPDF(doc, form.itCopySignature, 20, signatureY + 82, 40, 15);
  
  doc.setLineWidth(0.2);
  doc.line(20, signatureY + 90, 80, signatureY + 90);
  doc.text('Signature over Printed Name', 20, signatureY + 95);
  doc.text('Received Copy for 201 File:', 130, signatureY + 60);
  if (form.receivedCopy201FileSignedAt) {
    const rcSignedDate = new Date(form.receivedCopy201FileSignedAt);
    doc.text(`${rcSignedDate.toLocaleDateString()}`, 170, signatureY + 70);
    doc.text(`${rcSignedDate.toLocaleTimeString()}`, 170, signatureY + 75);
    const firstName =
      (currentUser as any)?.first_name ?? (currentUser as any)?.firstName ?? '';
    const lastName =
      (currentUser as any)?.last_name ?? (currentUser as any)?.lastName ?? '';
    const rcSignerName =
      form.receivedCopy201FileSignedByName?.trim() ||
      (currentUser &&
      form.receivedCopy201FileSignedById &&
      ((currentUser as any).id === form.receivedCopy201FileSignedById ||
        (currentUser as any).userID === form.receivedCopy201FileSignedById)
        ? `${firstName} ${lastName}`.trim()
        : '') ||
      '';
    doc.text(rcSignerName, 130, signatureY + 88);
    // Display digital initials (supports both drawn images and typed text)
    if (form.receivedCopy201FileSignature) {
      await addSignatureToPDF(doc, form.receivedCopy201FileSignature, 130, signatureY + 82, 50, 30);
    }
    doc.setLineWidth(0.2);
    doc.line(130, signatureY + 90, 190, signatureY + 90);
    doc.text('Signature over Printed Name', 130, signatureY + 95);
  } else {
    doc.setLineWidth(0.2);
    doc.line(130, signatureY + 90, 190, signatureY + 90);
    doc.text('Signature over Printed Name', 130, signatureY + 95);
  }

  // Draw header (logo + FOR INTERNAL USE ONLY) on every page from 2 to the end - single pass so page 3, 4, ... always get it.
  // Agreement and signature sections no longer draw their own header; we draw once per page here.
  const totalPages = doc.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    drawContinuationHeader();
  }

  return doc.output('blob');
};

export function AccountabilityFormCard({
  form,
  onSign,
  onView,
  onDownload,
  setActiveTab,
  showSignButton = true,
  statusBasedOnReceivedCopy = false,
  statusPillVariant = 'default',
  showDeclineButton = false,
  onDecline,
  showReceiveButton = false,
  onReceive,
  showDownloadButton = false,
}: AccountabilityFormProps) {
  const { user: currentUser } = useCurrentUser();
  const displayedStatus =
    statusPillVariant === 'activeDisabled' && form.receivedCopy201FileSignedAt
      ? 'Received'
      : statusPillVariant === 'toReceive'
        ? 'To receive'
        : statusPillVariant === 'activeDisabled'
          ? form.status === 'Disabled' || form.status === 'Declined'
            ? 'Disabled'
            : 'Active'
          : statusBasedOnReceivedCopy
            ? form.status
            : form.status;
  const isDeclined = form.status === 'Declined';
  const isDisabledWithDeclineReason = form.status === 'Disabled' && form.declineReason;
  const issuerName = form.issuer
    ? `${form.issuer.first_name} ${form.issuer.last_name}`
    : 'Administrator';
  const isAssignedUser = currentUser?.id === form.user.id;
  const canSign = isAssignedUser && form.status === 'Pending';
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isSigning, setIsSigning] = useState(false);
  const [localForm, setLocalForm] = useState<AccountabilityForm>(form);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAgreement, setAgreeAgreement] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReasonDraft, setDeclineReasonDraft] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);
  const [activeCardTab, setActiveCardTab] = useState<'accountability' | 'checklist'>('accountability');
  const [checklistData, setChecklistData] = useState<any>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const [hasChecklist, setHasChecklist] = useState(false);
  const [checklistPdfUrl, setChecklistPdfUrl] = useState<string>('');
  const checklistAsset = checklistData?.asset;
  const fallbackChecklistAsset =
    form.assets.find(asset => asset.id === checklistAsset?.id) ?? form.assets[0];
  const checklistAssetName =
    checklistAsset?.name || fallbackChecklistAsset?.name || 'Asset';
  const checklistAssetCode =
    checklistAsset?.code || fallbackChecklistAsset?.code || '—';
  const checklistAssetLabel = `${checklistAssetName} (${checklistAssetCode})`;

  // OTP verification state
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpExpiryFromSettings, setOtpExpiryFromSettings] = useState(300);
  const [pendingActionType, setPendingActionType] = useState<'sign' | 'decline' | null>(null);
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    setLocalForm(form);
  }, [form]);

  // Fetch OTP expiry from settings
  useEffect(() => {
    const fetchOtpExpiry = async () => {
      try {
        const response = await api.get<{ settings: { otpExpirySeconds?: number } }>('/settings/security');
        if (response?.settings?.otpExpirySeconds) {
          setOtpExpiryFromSettings(response.settings.otpExpirySeconds);
        }
      } catch (err) {
        console.error('Failed to fetch OTP expiry setting:', err);
      }
    };
    fetchOtpExpiry();
  }, []);

  // Fetch checklist data when checklist tab is selected
  useEffect(() => {
    const fetchChecklist = async () => {
      if (form.assignment?.id) {
        try {
          setChecklistLoading(true);
          const response = await api.get(`/asset-assignments/checklist/${form.assignment.id}`);
          setChecklistData(response);
          setHasChecklist(!!response);
        } catch (error) {
          console.error('Failed to fetch checklist:', error);
          setChecklistData(null);
          setHasChecklist(false);
        } finally {
          setChecklistLoading(false);
        }
      } else {
        setHasChecklist(false);
      }
    };
    fetchChecklist();
  }, [form.assignment?.id]);

  // Generate checklist PDF when dialog opens
  useEffect(() => {
    const generateChecklistPdf = async () => {
      if (showChecklistDialog && checklistData) {
        try {
          const pdfBlob = await generateAssetChecklistPDF({
            ...checklistData,
            asset_label: checklistAssetLabel,
          });
          const url = URL.createObjectURL(pdfBlob);
          setChecklistPdfUrl(url);
        } catch (error) {
          console.error('Failed to generate checklist PDF:', error);
          toast.error('Failed to generate checklist PDF');
        }
      } else if (!showChecklistDialog && checklistPdfUrl) {
        // Cleanup URL when dialog closes
        URL.revokeObjectURL(checklistPdfUrl);
        setChecklistPdfUrl('');
      }
    };
    generateChecklistPdf();
  }, [showChecklistDialog, checklistData, checklistAssetLabel]);

  useEffect(() => {
    const generatePdf = async () => {
      try {
        // Check cache first
        const cacheKey = generateCacheKey(localForm, currentUser);
        const cachedPdf = pdfCache.get(cacheKey);
        
        if (cachedPdf) {
          logger.debug('Using cached PDF');
          const url = URL.createObjectURL(cachedPdf);
          setPdfUrl(url);
          return;
        }

        // Generate new PDF
        const pdfBlob = await generateAccountabilityFormPDF(
          localForm,
          currentUser
        );
        
        // Cache the generated PDF
        pdfCache.set(cacheKey, pdfBlob);
        
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
    };

    // Debounce PDF generation to avoid rapid regeneration
    const debouncedGenerate = debounce(generatePdf, 500);
    debouncedGenerate();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [localForm, currentUser]);

  const handleDownload = async () => {
    if (activeCardTab === 'checklist' && checklistData) {
      try {
        const pdfBlob = await generateAssetChecklistPDF({
          ...checklistData,
          asset_label: checklistAssetLabel,
        });
        const fileName = `Asset_Checklist_${checklistData.employee_name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        downloadPDF(pdfBlob, fileName);
        toast.success('Checklist PDF downloaded successfully');
      } catch (error) {
        console.error('Failed to download checklist PDF:', error);
        toast.error('Failed to download checklist PDF');
      }
      return;
    }

    try {
      // Check cache first
      const cacheKey = generateCacheKey(localForm, currentUser);
      const cachedPdf = pdfCache.get(cacheKey);
      
      let pdfBlob: Blob;
      if (cachedPdf) {
        logger.debug('Using cached PDF for download');
        pdfBlob = cachedPdf;
      } else {
        pdfBlob = await generateAccountabilityFormPDF(
          localForm,
          currentUser
        );
        // Cache the generated PDF
        pdfCache.set(cacheKey, pdfBlob);
      }
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${form.user.first_name}_${form.user.last_name}_${form.formNumber}.pdf`;
      link.click();

      // Cleanup
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error generating PDF for download:', error);
      toast.error('Failed to generate PDF for download');
    }
  };

  const openDeclineDialog = () => {
    setShowPreviewModal(false);
    setShowDeclineDialog(true);
  };

  return (
    <Card
      className={`hover:shadow-md transition-shadow flex flex-col ${isDeclined ? 'opacity-75' : ''}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{form.formNumber}</CardTitle>
              <p className="text-sm text-gray-500">
                Created {new Date(form.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge
              variant={
                statusPillVariant === 'activeDisabled'
                  ? displayedStatus === 'Disabled'
                    ? 'destructive'
                    : 'outline'
                  : displayedStatus === 'To receive'
                    ? 'outline'
                    : displayedStatus === 'Completed'
                      ? 'default'
                      : displayedStatus === 'Signed'
                        ? 'secondary'
                        : displayedStatus === 'Disabled' ||
                            displayedStatus === 'Declined'
                          ? 'destructive'
                          : 'outline'
              }
              className={
                statusPillVariant === 'activeDisabled'
                  ? displayedStatus === 'Disabled'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                  : displayedStatus === 'To receive'
                    ? 'bg-orange-100 text-orange-800'
                    : displayedStatus === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : displayedStatus === 'Signed'
                        ? 'bg-blue-100 text-blue-800'
                        : displayedStatus === 'Disabled'
                          ? 'bg-red-100 text-red-800'
                          : displayedStatus === 'Declined'
                            ? 'bg-slate-200 text-slate-800'
                            : displayedStatus === 'Revoked'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
              }
            >
              {displayedStatus}
            </Badge>
            {form.formOrigin === 'processor_return' && (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-900 font-medium"
              >
                Temporary
              </Badge>
            )}
            {form.status === 'Pending' && (
              <Badge
                variant="outline"
                className="border-orange-300 bg-orange-50 text-orange-900 font-medium"
              >
                Pending Receiver Signature
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        {hasChecklist ? (
          <Tabs value={activeCardTab} onValueChange={(v) => setActiveCardTab(v as 'accountability' | 'checklist')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 rounded-xl border bg-white p-1 shadow-sm">
              <TabsTrigger
                value="accountability"
                className="rounded-lg transition-all duration-200 hover:bg-red-50 hover:text-red-700 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow"
              >
                Accountability
              </TabsTrigger>
              <TabsTrigger
                value="checklist"
                className="rounded-lg transition-all duration-200 hover:bg-red-50 hover:text-red-700 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow"
              >
                Checklist
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="accountability" className="space-y-4">
              {(isDeclined || isDisabledWithDeclineReason) && (
                <div
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  title={form.declineReason || undefined}
                >
                  <p className="font-semibold text-slate-900">
                    {isDeclined ? 'Declined' : 'Disabled'}
                  </p>
                  {form.declineReason ? (
                    <p className="mt-1 line-clamp-3 text-slate-700">
                      {form.declineReason}
                    </p>
                  ) : (
                    <p className="mt-1 text-slate-600">No reason on file.</p>
                  )}
                </div>
              )}
              {/* Asset Info */}
              <div className="flex items-start gap-3">
              <Package className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {form.assets.length === 0
                    ? 'No Assets'
                    : `${form.assets.length} Assets`}
                </p>
                {form.assets.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    <div className="space-y-0.5">
                      {form.assets.slice(0, 5).map(asset => (
                        <div key={asset.id} className="flex items-center">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                          <span>{asset.code}</span>
                        </div>
                      ))}
                      {form.assets.length > 5 && (
                        <div className="flex items-center">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                          <span className="text-gray-400">...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment Info */}
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {form.user.first_name} {form.user.last_name}
                </p>
                <p className="text-xs text-gray-500">
                  {form.user.position || 'No position'}
                </p>
              </div>
            </div>

            {/* Issued By Info */}
            {form.issuer && (
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    Issued by: {form.issuer.first_name} {form.issuer.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{form.issuer.email}</p>
                </div>
              </div>
            )}

            {/* Date Info */}
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">
                  Assigned:{' '}
                  {form.created_at && !isNaN(new Date(form.created_at).getTime())
                    ? new Date(form.created_at).toLocaleDateString() +
                      ' ' +
                      new Date(form.created_at).toLocaleTimeString()
                    : 'Not specified'}
                </p>
                {form.assignment.expected_return_date &&
                  form.assignment.expected_return_date !==
                    '1970-01-01T00:00:00.000Z' &&
                  !form.assignment.expected_return_date.startsWith(
                    '1970-01-01'
                  ) && (
                    <p className="text-xs text-gray-500">
                      Expected Return:{' '}
                      {new Date(
                        form.assignment.expected_return_date
                      ).toLocaleDateString()}
                    </p>
                  )}
              </div>
            </div>

            {/* Location Info */}
            {form.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">
                    {form.location.name} - {form.location.floor_unit},{' '}
                    {form.location.building}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="checklist" className="space-y-4">
            {checklistLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Loading checklist...
              </div>
            ) : checklistData ? (
              <div className="space-y-3 rounded-xl border border-red-100 bg-gradient-to-br from-red-50/80 via-white to-slate-50 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-red-100 pb-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-red-600">
                      Asset Checklist
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                      {checklistData.form_number || `CHK-${checklistData.assignment_id}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {checklistData.type_onboarding && (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        Onboarding
                      </Badge>
                    )}
                    {checklistData.type_offboarding && (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                        Offboarding
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Date Created
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {new Date(checklistData.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Employee
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {checklistData.employee_name}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white/80 p-3 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Received By
                  </p>
                  <p className="mt-1 font-medium text-slate-900">
                    {checklistData.received_by || 'N/A'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No checklist data available
              </div>
            )}
          </TabsContent>
        </Tabs>
        ) : (
          <div className="space-y-4">
            {(isDeclined || isDisabledWithDeclineReason) && (
              <div
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                title={form.declineReason || undefined}
              >
                <p className="font-semibold text-slate-900">
                  {isDeclined ? 'Declined' : 'Disabled'}
                </p>
                {form.declineReason ? (
                  <p className="mt-1 line-clamp-3 text-slate-700">
                    {form.declineReason}
                  </p>
                ) : (
                  <p className="mt-1 text-slate-600">No reason on file.</p>
                )}
              </div>
            )}
            {/* Asset Info */}
            <div className="flex items-start gap-3">
              <Package className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {form.assets.length === 0
                    ? 'No Assets'
                    : `${form.assets.length} Assets`}
                </p>
                {form.assets.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    <div className="space-y-0.5">
                      {form.assets.slice(0, 5).map(asset => (
                        <div key={asset.id} className="flex items-center">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                          <span>{asset.code}</span>
                        </div>
                      ))}
                      {form.assets.length > 5 && (
                        <div className="flex items-center">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                          <span className="text-gray-400">...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment Info */}
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {form.user.first_name} {form.user.last_name}
                </p>
                <p className="text-xs text-gray-500">
                  {form.user.position || 'No position'}
                </p>
              </div>
            </div>

            {/* Issued By Info */}
            {form.issuer && (
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    Issued by: {form.issuer.first_name} {form.issuer.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{form.issuer.email}</p>
                </div>
              </div>
            )}

            {/* Date Info */}
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">
                  Assigned:{' '}
                  {form.created_at && !isNaN(new Date(form.created_at).getTime())
                    ? new Date(form.created_at).toLocaleDateString() +
                      ' ' +
                      new Date(form.created_at).toLocaleTimeString()
                    : 'Not specified'}
                </p>
                {form.assignment.expected_return_date &&
                  form.assignment.expected_return_date !==
                    '1970-01-01T00:00:00.000Z' &&
                  !form.assignment.expected_return_date.startsWith(
                    '1970-01-01'
                  ) && (
                    <p className="text-xs text-gray-500">
                      Expected Return:{' '}
                      {new Date(
                        form.assignment.expected_return_date
                      ).toLocaleDateString()}
                    </p>
                  )}
              </div>
            </div>

            {/* Location Info */}
            {form.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">
                    {form.location.name} - {form.location.floor_unit},{' '}
                    {form.location.building}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Footer with Actions */}
      <div className="flex gap-2 p-4 mt-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (activeCardTab === 'checklist' && checklistData) {
              setShowChecklistDialog(true);
            } else if (onView) {
              onView(form);
            } else {
              setShowPreviewModal(true);
            }
          }}
          className="flex-1 hover:bg-red-600 hover:text-white"
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>

        {showDownloadButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex-1 hover:bg-blue-600 hover:text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}

        {showReceiveButton && onReceive && (
          <Button
            size="sm"
            onClick={() => onReceive(form)}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            Receive
          </Button>
        )}

        {canSign && showSignButton && (
          <>
            <Button
              size="sm"
              onClick={() => setShowConfirmDialog(true)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Sign Form
            </Button>

            {/* Confirmation Dialog */}
            <AlertDialog
              open={showConfirmDialog}
              onOpenChange={setShowConfirmDialog}
            >
              <AppAlertDialogFrame className="flex max-h-[90vh] !max-w-2xl flex-col overflow-hidden !gap-0 !border-0 !p-0">
                <AppAlertDialogGradientHeader title="Confirm Form Signing" />
                <AppAlertDialogMessage>
                  <AlertDialogDescription className="text-base text-gray-600">
                    Please review your accountability form below. By signing
                    this form, you agree to all the terms and conditions stated
                    in the document.
                  </AlertDialogDescription>
                </AppAlertDialogMessage>

                <div className="min-h-0 flex-1 overflow-auto">
                  <div className="mx-4 my-4 h-[600px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:mx-6">
                    {pdfUrl ? (
                      <PDFViewer pdfUrl={pdfUrl} className="h-full w-full" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-500">
                        Loading form preview...
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 px-6 py-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="agree-terms"
                        checked={agreeTerms}
                        onCheckedChange={checked =>
                          setAgreeTerms(checked as boolean)
                        }
                        className="mt-1"
                      />
                      <label
                        htmlFor="agree-terms"
                        className="text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        I agree to the terms and conditions
                      </label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="agree-agreement"
                        checked={agreeAgreement}
                        onCheckedChange={checked =>
                          setAgreeAgreement(checked as boolean)
                        }
                        className="mt-1"
                      />
                      <label
                        htmlFor="agree-agreement"
                        className="text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        I agree to the Company Property Issuance Agreement
                      </label>
                    </div>
                  </div>
                </div>

                <AppAlertDialogChromeFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setShowConfirmDialog(false);
                      setAgreeTerms(false);
                      setAgreeAgreement(false);
                    }}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      // Store the sign action and show OTP dialog
                      setPendingActionType('sign');
                      pendingActionRef.current = async () => {
                        try {
                          // Get user's digital initials from profile
                          const digitalInitials = (currentUser as any)?.digitalSignature || '';
                          
                          // Prepare acknowledgments with digital signature
                          const acknowledgmentsData = digitalInitials ? {
                            ...form.acknowledgments,
                            digitalSignature: digitalInitials,
                            signedBy: currentUser?.id,
                            signedByName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim(),
                          } : form.acknowledgments;
                          
                          await onSign?.(form.id, acknowledgmentsData);
                          
                          // Create updated form object for PDF generation
                          const updatedForm = {
                            ...form,
                            status: 'Signed' as const,
                            signed_at: new Date().toISOString(),
                            acknowledgments: digitalInitials ? {
                              ...form.acknowledgments,
                              digitalSignature: digitalInitials,
                              signedBy: currentUser?.id,
                              signedByName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim(),
                            } : form.acknowledgments,
                          };
                          
                          // Update localForm state
                          setLocalForm(updatedForm);

                          // Generate PDF with updated form data directly
                          const generatePdf = async () => {
                            try {
                              // Check cache first
                              const cacheKey = generateCacheKey(updatedForm, currentUser);
                              const cachedPdf = pdfCache.get(cacheKey);
                              
                              let pdfBlob: Blob;
                              if (cachedPdf) {
                                logger.debug('Using cached PDF after sign');
                                pdfBlob = cachedPdf;
                              } else {
                                pdfBlob = await generateAccountabilityFormPDF(
                                  updatedForm,
                                  currentUser
                                );
                                // Cache the generated PDF
                                pdfCache.set(cacheKey, pdfBlob);
                              }
                              
                              const url = URL.createObjectURL(pdfBlob);
                              setPdfUrl(url);
                            } catch (error) {
                              console.error('Error generating PDF:', error);
                            }
                          };

                          generatePdf();
                        } catch (error) {
                          console.error('Failed to sign form:', error);
                          throw error;
                        }
                      };

                      // Show OTP dialog
                      setShowOtpDialog(true);
                    }}
                    disabled={!agreeTerms || !agreeAgreement}
                    className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Sign Form
                  </AlertDialogAction>
                </AppAlertDialogChromeFooter>
              </AppAlertDialogFrame>
            </AlertDialog>
          </>
        )}

        {showDeclineButton && canSign && onDecline && (
          <Button
            variant="outline"
            size="sm"
            onClick={openDeclineDialog}
            className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
          >
            Decline
          </Button>
        )}
      </div>

      <Dialog
        open={showDeclineDialog}
        onOpenChange={open => {
          setShowDeclineDialog(open);
          if (!open) setDeclineReasonDraft('');
        }}
      >
        <AppDialogFrame className="flex h-[min(96dvh,calc(100vh-0.5rem))] !max-h-[min(96dvh,calc(100vh-0.5rem))] min-h-0 !max-w-2xl flex-col overflow-hidden !gap-0 !border-0 !p-0">
          <AppDialogGradientHeader title="Decline this Asset Accountability form" />
          <AppDialogBody className="min-h-0 flex-1 overflow-auto !p-0">
            <div className="px-4 pb-4 pt-4 sm:px-6">
              <p className="text-sm text-muted-foreground">
                Declining will release the assets on this form so they can be
                assigned again. This cannot be undone.
              </p>
            </div>
            <div className="mx-4 h-[575px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:mx-6">
              {pdfUrl ? (
                <PDFViewer pdfUrl={pdfUrl} className="h-full w-full" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-500">
                  Loading form preview...
                </div>
              )}
            </div>
            <div className="space-y-2 px-4 py-4 sm:px-6">
              <Label htmlFor="accountability-decline-reason">
                Reasons <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="accountability-decline-reason"
                value={declineReasonDraft}
                onChange={e => setDeclineReasonDraft(e.target.value)}
                placeholder="Explain why you are declining this form…"
                rows={4}
                className="resize-y min-h-[100px]"
              />
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter className="justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeclineDialog(false);
                setDeclineReasonDraft('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!declineReasonDraft.trim() || isDeclining}
              onClick={async () => {
                const r = declineReasonDraft.trim();
                if (!r || !onDecline) return;
                
                // Store the decline action and show OTP dialog
                setPendingActionType('decline');
                pendingActionRef.current = async () => {
                  try {
                    setIsDeclining(true);
                    await onDecline(form.id, r);
                    setShowDeclineDialog(false);
                    setDeclineReasonDraft('');
                  } catch {
                    /* toast from parent */
                  } finally {
                    setIsDeclining(false);
                  }
                };

                // Show OTP dialog
                setShowOtpDialog(true);
              }}
            >
              {isDeclining ? 'Declining…' : 'Decline'}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      {/* OTP Verification Dialog */}
      <SmsOtpDialog
        isOpen={showOtpDialog}
        onOpenChange={setShowOtpDialog}
        sendOtpEndpoint="/auth/initials/send-otp"
        verifyOtpEndpoint="/auth/initials/verify-otp"
        onVerified={() => {
          if (pendingActionType === 'sign') {
            toast.success('Form signed successfully');
          } else if (pendingActionType === 'decline') {
            toast.success('Form declined successfully');
          }
          setPendingActionType(null);
          setShowConfirmDialog(false);
          setAgreeTerms(false);
          setAgreeAgreement(false);
        }}
        onCancel={() => {
          pendingActionRef.current = null;
          setPendingActionType(null);
          setShowConfirmDialog(false);
          setAgreeTerms(false);
          setAgreeAgreement(false);
          setShowDeclineDialog(false);
          setDeclineReasonDraft('');
        }}
        pendingActionRef={pendingActionRef}
        expirySeconds={otpExpiryFromSettings}
        title="OTP SMS Verification"
        description="OTP SMS Verification has been sent to your registered mobile number for accountability form signing."
        icon={<ShieldCheck className="h-6 w-6 text-blue-600" />}
        verifyButtonLabel="Verify & Sign"
        phoneNumber={currentUser?.contactNumber || undefined}
      />

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <AppDialogFrame className="max-w-4xl max-h-[90vh] overflow-hidden !flex !flex-col !gap-0 !border-0 !p-0">
          <AppDialogGradientHeader
            title={`${form.user.first_name} ${form.user.last_name} - ${form.formNumber}`}
            description="Asset Accountability Form Preview"
          />
          <AppDialogBody className="min-h-0 flex-1 overflow-auto !p-0">
            <div className="mx-4 my-4 h-[620px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:mx-6">
              {pdfUrl ? (
                <PDFViewer pdfUrl={pdfUrl} className="h-full w-full" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-500">
                  Loading form preview...
                </div>
              )}
            </div>
          </AppDialogBody>

          <AppDialogChromeFooter className="justify-end gap-3">
            {showDeclineButton && canSign && onDecline && (
              <Button
                variant="outline"
                size="sm"
                onClick={openDeclineDialog}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Decline
              </Button>
            )}
            {canSign && (
              <Button
                size="sm"
                onClick={() => {
                  setShowPreviewModal(false);
                  setShowConfirmDialog(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Sign Form
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreviewModal(false)}
            >
              Close
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      {/* Checklist Dialog */}
      <Dialog open={showChecklistDialog} onOpenChange={setShowChecklistDialog}>
        <AppDialogFrame className="max-w-4xl max-h-[90vh] overflow-hidden !flex !flex-col !gap-0 !border-0 !p-0">
          <AppDialogGradientHeader
            title={`${checklistData?.employee_name || form.user.first_name + ' ' + form.user.last_name} - Asset Checklist`}
            description="Asset Checklist Form Preview"
          />
          <AppDialogBody className="min-h-0 flex-1 overflow-auto !p-0">
            <div className="mx-4 my-4 h-[620px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:mx-6">
              {checklistPdfUrl ? (
                <PDFViewer pdfUrl={checklistPdfUrl} className="h-full w-full" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-500">
                  Generating checklist PDF preview...
                </div>
              )}
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter className="justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (checklistData) {
                  try {
                    const pdfBlob = await generateAssetChecklistPDF({
                      ...checklistData,
                      asset_label: checklistAssetLabel,
                    });
                    const fileName = `Asset_Checklist_${checklistData.employee_name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
                    downloadPDF(pdfBlob, fileName);
                    toast.success('Checklist PDF downloaded successfully');
                  } catch (error) {
                    console.error('Failed to download checklist PDF:', error);
                    toast.error('Failed to download checklist PDF');
                  }
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChecklistDialog(false)}
            >
              Close
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>
    </Card>
  );
}

interface AccountabilityFormDetailProps {
  form: AccountabilityForm;
  onClose: () => void;
  onSign: (formId: string) => void;
  setActiveTab?: (tab: string) => void;
  onSignReceivedCopy?: (formId: string) => Promise<void>;
  canSignReceivedCopy?: boolean;
  /** HR Copy view: digital vs wet-signed tabs; hide digital Sign Received Copy */
  hrViewMode?: boolean;
  /** When the parent dialog already renders AppDialogGradientHeader with this title */
  headerInParentChrome?: boolean;
  /** Accountability Forms: "all" = view-only HR workflow (footer Close only); "hrCopy" = Receive / upload */
  viewContext?: 'all' | 'hrCopy';
  readOnly?: boolean;
  embedded?: boolean;
  /** Profile documents: allow assignee to decline pending form with a reason */
  showDeclineButton?: boolean;
  onDecline?: (formId: string, reason: string) => Promise<void>;
}

export function AccountabilityFormDetail({
  form,
  onClose,
  onSign,
  setActiveTab,
  onSignReceivedCopy,
  canSignReceivedCopy = false,
  hrViewMode = false,
  headerInParentChrome = false,
  viewContext = 'hrCopy',
  readOnly = false,
  embedded = false,
  showDeclineButton = false,
  onDecline,
}: AccountabilityFormDetailProps) {
  const { user: currentUser } = useCurrentUser();
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [localForm, setLocalForm] = useState<AccountabilityForm>(form);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showReceivedCopyConfirmDialog, setShowReceivedCopyConfirmDialog] =
    useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAgreement, setAgreeAgreement] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReasonDraft, setDeclineReasonDraft] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);
  const [showReceiveCopyDialog, setShowReceiveCopyDialog] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [showReceiveOtpDialog, setShowReceiveOtpDialog] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpExpiryFromSettings, setOtpExpiryFromSettings] = useState(300);
  const [pendingActionType, setPendingActionType] = useState<'sign' | 'decline' | null>(null);
  const [pendingDigitalInitials, setPendingDigitalInitials] = useState<string | null>(null);
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);
  const pendingReceiveActionRef = useRef<(() => Promise<void>) | null>(null);

  const isAssignedUser = currentUser?.id === form.user.id;
  const canSign = !readOnly && isAssignedUser && form.status === 'Pending';
  const needsReceivedCopySignature = !localForm.receivedCopy201FileSignedAt;
  const showSignReceivedCopy =
    !readOnly &&
    !hrViewMode &&
    canSignReceivedCopy &&
    onSignReceivedCopy &&
    needsReceivedCopySignature;
  const showReceiveCopyButton =
    headerInParentChrome &&
    viewContext === 'hrCopy' &&
    needsReceivedCopySignature &&
    form.status === 'Signed';

  useEffect(() => {
    setLocalForm(form);
  }, [form]);

  useEffect(() => {
    const generatePdf = async () => {
      try {
        // Check cache first
        const cacheKey = generateCacheKey(localForm, currentUser);
        const cachedPdf = pdfCache.get(cacheKey);
        
        if (cachedPdf) {
          logger.debug('Using cached PDF (detail view)');
          const url = URL.createObjectURL(cachedPdf);
          setPdfUrl(url);
          return;
        }

        // Generate new PDF
        const pdfBlob = await generateAccountabilityFormPDF(
          localForm,
          currentUser
        );
        
        // Cache the generated PDF
        pdfCache.set(cacheKey, pdfBlob);
        
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate PDF preview');
      }
    };

    // Debounce PDF generation to avoid rapid regeneration
    const debouncedGenerate = debounce(generatePdf, 500);
    debouncedGenerate();

    // Cleanup
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [localForm, currentUser]);

  const hrWorkflowActions = viewContext === 'hrCopy';
  const containerClassName = embedded
    ? 'flex h-full min-h-0 flex-1 flex-col bg-transparent p-0'
    : headerInParentChrome
      ? 'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-0 bg-transparent p-0'
      : hrViewMode
        ? 'mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-3 bg-white p-4 sm:p-6'
        : 'mx-auto max-w-2xl space-y-6 bg-white p-6';
  const previewClassName = embedded
    ? 'w-full min-h-0 flex-1 overflow-auto rounded-none border-0 bg-transparent px-4 sm:px-6'
    : headerInParentChrome
      ? 'flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-auto border-0 bg-transparent'
      : hrViewMode
        ? 'flex w-full min-h-[70vh] flex-1 flex-col overflow-auto rounded-lg border border-slate-200/80 bg-slate-50/50'
        : 'w-full h-[85vh] border rounded-lg mx-auto overflow-auto';
  const showHrReceive = false;
  const showActionBar =
    canSign || showSignReceivedCopy || showHrReceive || !embedded;

  const useScrollShell = embedded || headerInParentChrome;
  const scrollShellClass = embedded
    ? 'min-h-0 flex-1 overflow-y-auto'
    : headerInParentChrome && hrViewMode
      ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-0 py-0'
      : headerInParentChrome && !hrViewMode
        ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
        : headerInParentChrome
          ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
          : 'min-h-0 flex-1 overflow-y-auto';

  const tabsShellClass =
    headerInParentChrome && hrViewMode
      ? 'flex min-h-0 w-full min-w-0 flex-1 flex-col gap-1.5 px-3 pb-2 pt-2 sm:px-4'
      : 'flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-3';

  const previewPaneClass =
    headerInParentChrome && hrViewMode
      ? 'h-[70vh] w-full min-w-0 overflow-auto border-0 bg-white'
      : 'h-[70vh] w-full overflow-auto rounded-md border border-slate-200 bg-slate-50';

  const actionBar = (
    <>
      {showDeclineButton && canSign && onDecline && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeclineDialog(true)}
          className="border-red-300 text-red-700 hover:bg-red-50"
        >
          Decline
        </Button>
      )}
      {canSign && (
        <>
          <Button
            size="sm"
            onClick={() => setShowConfirmDialog(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Sign Form
          </Button>
          <AlertDialog
            open={showConfirmDialog}
            onOpenChange={setShowConfirmDialog}
          >
            <AppAlertDialogFrame className="flex max-h-[90vh] !max-w-2xl flex-col overflow-hidden !gap-0 !border-0 !p-0">
              <AppAlertDialogGradientHeader title="Confirm Form Signing" />
              <AppAlertDialogMessage>
                <AlertDialogDescription className="text-base text-gray-600">
                  Please review your accountability form below. By signing
                  this form, you agree to all the terms and conditions stated in
                  the document.
                </AlertDialogDescription>
              </AppAlertDialogMessage>

              <div className="min-h-0 flex-1 overflow-auto">
                <div className="mx-4 my-4 h-[500px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:mx-6">
                  {pdfUrl ? (
                    <PDFViewer pdfUrl={pdfUrl} className="h-full w-full" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-500">
                      Loading form preview...
                    </div>
                  )}
                </div>

                <div className="space-y-4 px-6 py-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="agree-terms-detail"
                      checked={agreeTerms}
                      onCheckedChange={checked =>
                        setAgreeTerms(checked as boolean)
                      }
                      className="mt-1"
                    />
                    <label
                      htmlFor="agree-terms-detail"
                      className="text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I agree to the terms and conditions
                    </label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="agree-agreement-detail"
                      checked={agreeAgreement}
                      onCheckedChange={checked =>
                        setAgreeAgreement(checked as boolean)
                      }
                      className="mt-1"
                    />
                    <label
                      htmlFor="agree-agreement-detail"
                      className="text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I agree to the Company Property Issuance Agreement
                    </label>
                  </div>
                </div>
              </div>

              <AppAlertDialogChromeFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setAgreeTerms(false);
                    setAgreeAgreement(false);
                  }}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    // Store the sign action and show OTP dialog
                    setPendingActionType('sign');
                    pendingActionRef.current = async () => {
                      try {
                        await onSign(form.id);
                        setLocalForm(prev => ({
                          ...prev,
                          status: 'Signed',
                          signed_at: new Date().toISOString(),
                        }));
                      } catch (error) {
                        console.error('Failed to sign form:', error);
                        throw error;
                      }
                    };

                    // Show OTP dialog
                    setShowOtpDialog(true);
                  }}
                  disabled={!agreeTerms || !agreeAgreement}
                  className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Sign Form
                </AlertDialogAction>
              </AppAlertDialogChromeFooter>
            </AppAlertDialogFrame>
          </AlertDialog>
        </>
      )}
      {showDeclineButton && canSign && onDecline && (
        <Dialog
          open={showDeclineDialog}
          onOpenChange={open => {
            setShowDeclineDialog(open);
            if (!open) setDeclineReasonDraft('');
          }}
        >
          <AppDialogFrame className="max-h-[90vh] max-w-5xl overflow-hidden !flex !flex-col !gap-0 !border-0 !p-0">
            <AppDialogGradientHeader title="Decline this Asset Accountability form" />
            <AppDialogBody className="min-h-0 flex-1 overflow-auto !p-0">
              <div className="px-4 pb-4 pt-4 sm:px-6">
                <p className="text-sm text-muted-foreground">
                  Declining will release the assets on this form so they can be
                  assigned again. This cannot be undone.
                </p>
              </div>
              <div className="mx-4 h-[420px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:mx-6">
                {pdfUrl ? (
                  <PDFViewer pdfUrl={pdfUrl} className="h-full w-full" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-500">
                    Loading form preview...
                  </div>
                )}
              </div>
              <div className="space-y-2 px-4 py-4 sm:px-6">
                <Label htmlFor="accountability-decline-reason">
                  Reasons <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="accountability-decline-reason"
                  value={declineReasonDraft}
                  onChange={e => setDeclineReasonDraft(e.target.value)}
                  placeholder="Explain why you are declining this form…"
                  rows={4}
                  className="resize-y min-h-[100px]"
                />
              </div>
            </AppDialogBody>
            <AppDialogChromeFooter className="justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeclineDialog(false);
                  setDeclineReasonDraft('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!declineReasonDraft.trim() || isDeclining}
                onClick={async () => {
                  const r = declineReasonDraft.trim();
                  if (!r || !onDecline) return;

                  // Store the decline action and show OTP dialog
                  setPendingActionType('decline');
                  pendingActionRef.current = async () => {
                    try {
                      setIsDeclining(true);
                      await onDecline(form.id, r);
                      setShowDeclineDialog(false);
                      setDeclineReasonDraft('');
                      setLocalForm(prev => ({
                        ...prev,
                        status: 'Declined',
                        declineReason: r,
                      }));
                    } catch {
                      /* toast from parent */
                    } finally {
                      setIsDeclining(false);
                    }
                  };

                  // Show OTP dialog
                  setShowOtpDialog(true);
                }}
              >
                {isDeclining ? 'Declining…' : 'Decline'}
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>
      )}

      {/* OTP Verification Dialog for Sign */}
      <SmsOtpDialog
        isOpen={showOtpDialog}
        onOpenChange={setShowOtpDialog}
        sendOtpEndpoint="/auth/initials/send-otp"
        verifyOtpEndpoint="/auth/initials/verify-otp"
        onVerified={() => {
          if (pendingActionType === 'sign') {
            toast.success('Form signed successfully');
          } else if (pendingActionType === 'decline') {
            toast.success('Form declined successfully');
          }
          setPendingActionType(null);
          setShowConfirmDialog(false);
          setAgreeTerms(false);
          setAgreeAgreement(false);
        }}
        onCancel={() => {
          pendingActionRef.current = null;
          setPendingActionType(null);
          setShowConfirmDialog(false);
          setAgreeTerms(false);
          setAgreeAgreement(false);
          setShowDeclineDialog(false);
          setDeclineReasonDraft('');
        }}
        pendingActionRef={pendingActionRef}
        expirySeconds={otpExpiryFromSettings}
        title="OTP SMS Verification"
        description="OTP SMS Verification has been sent to your registered mobile number for accountability form signing."
        icon={<ShieldCheck className="h-6 w-6 text-blue-600" />}
        verifyButtonLabel="Verify & Sign"
        phoneNumber={currentUser?.contactNumber || undefined}
      />

      {showSignReceivedCopy && (
        <>
          <Button
            size="sm"
            onClick={() => setShowReceivedCopyConfirmDialog(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Sign Received Copy
          </Button>
          <AlertDialog
            open={showReceivedCopyConfirmDialog}
            onOpenChange={setShowReceivedCopyConfirmDialog}
          >
            <AppAlertDialogFrame className="max-w-md">
              <AppAlertDialogGradientHeader title="Sign Received Copy for 201 File" />
              <AppAlertDialogMessage>
                <AlertDialogDescription className="text-base text-gray-600">
                  Your name and the time of signing will be recorded on the
                  Received Copy for 201 File section of this accountability
                  form.
                </AlertDialogDescription>
              </AppAlertDialogMessage>
              <AppAlertDialogChromeFooter>
                <AlertDialogCancel
                  onClick={() => setShowReceivedCopyConfirmDialog(false)}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await onSignReceivedCopy!(form.id);
                      const signerDisplay = [
                        currentUser?.firstName,
                        currentUser?.lastName,
                      ]
                        .filter(Boolean)
                        .join(' ')
                        .trim();
                      setLocalForm(prev => ({
                        ...prev,
                        receivedCopy201FileSignedAt:
                          new Date().toISOString(),
                        ...(signerDisplay
                          ? {
                              receivedCopy201FileSignedByName: signerDisplay,
                            }
                          : {}),
                      }));
                      setShowReceivedCopyConfirmDialog(false);
                    } catch {
                      // Error already shown by handler
                    }
                  }}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Sign
                </AlertDialogAction>
              </AppAlertDialogChromeFooter>
            </AppAlertDialogFrame>
          </AlertDialog>
        </>
      )}
      {showReceiveCopyButton && (
        <>
          <Button
            size="sm"
            onClick={() => setShowReceiveCopyDialog(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Receive Copy
          </Button>
          <AlertDialog
            open={showReceiveCopyDialog}
            onOpenChange={setShowReceiveCopyDialog}
          >
            <AppAlertDialogFrame className="max-w-md">
              <AppAlertDialogGradientHeader title="Receive Copy for 201 File" />
              <AppAlertDialogMessage>
                <AlertDialogDescription className="text-base text-gray-600">
                  I am receiving this copy as an official accountability and for safe keeping of 201 file of the user.
                </AlertDialogDescription>
              </AppAlertDialogMessage>
              <AppAlertDialogChromeFooter>
                <AlertDialogCancel
                  onClick={() => setShowReceiveCopyDialog(false)}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    // Use user's saved digital signature/initials instead of auto-generating from name
                    const firstName = currentUser?.firstName || '';
                    const lastName = currentUser?.lastName || '';
                    const digitalInitials = (currentUser as any)?.digitalSignature || '';
                    setPendingDigitalInitials(digitalInitials);
                    pendingReceiveActionRef.current = async () => {
                      await api.post(`/accountability-forms/${form.id}/sign-received-copy`, {
                        digitalInitials,
                      });
                      toast.success('Copy received successfully');
                      setLocalForm(prev => ({
                        ...prev,
                        receivedCopy201FileSignature: digitalInitials,
                        receivedCopy201FileSignedAt: new Date().toISOString(),
                        receivedCopy201FileSignedById: currentUser?.id,
                        receivedCopy201FileSignedByName: `${firstName} ${lastName}`.trim(),
                      }));
                      onClose();
                    };
                    setShowReceiveCopyDialog(false);
                    setShowReceiveOtpDialog(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Verify & Receive
                </AlertDialogAction>
              </AppAlertDialogChromeFooter>
            </AppAlertDialogFrame>
          </AlertDialog>
        </>
      )}
      {!embedded ? (
        <Button size="sm" variant="outline" onClick={onClose}>
          Close
        </Button>
      ) : null}
    </>
  );

  const mainContent = (
    <>
      {!headerInParentChrome && (
        <div className="text-center">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {form.user.first_name} {form.user.last_name} - {form.formNumber}
          </DialogTitle>
          <p className="mt-2 text-gray-600">
            Asset Accountability Form Preview
          </p>
        </div>
      )}

      {!(headerInParentChrome && !hrViewMode) && localForm.status === 'Declined' && (
        <div
          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
          title={localForm.declineReason || undefined}
        >
          <p className="font-semibold text-slate-900">Declined</p>
          {localForm.declineReason ? (
            <p className="mt-1">{localForm.declineReason}</p>
          ) : null}
        </div>
      )}

      {headerInParentChrome && !hrViewMode ? (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-4 pt-2 pb-2 sm:px-6">
          {localForm.status === 'Declined' && (
            <div
              className="mb-2 shrink-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
              title={localForm.declineReason || undefined}
            >
              <p className="font-semibold text-slate-900">Declined</p>
              {localForm.declineReason ? (
                <p className="mt-1">{localForm.declineReason}</p>
              ) : null}
            </div>
          )}
          <div className="mx-0 my-2 flex h-[70vh] flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:my-3">
            {pdfUrl ? (
              <PDFViewer pdfUrl={pdfUrl} className="h-full w-full" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-500">
                Generating PDF preview...
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={previewClassName}>
        {pdfUrl ? (
          <PDFViewer pdfUrl={pdfUrl} className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-500">
            Generating PDF preview...
          </div>
        )}
        </div>
      )}
    </>
  );

  return (
    <div className={containerClassName}>
      {useScrollShell ? (
        <div className={scrollShellClass}>{mainContent}</div>
      ) : (
        mainContent
      )}
      {showActionBar && !embedded ? (
        <AppDialogChromeFooter className="mt-auto shrink-0 gap-2 rounded-none border-x-0 border-b-0 border-t-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:rounded-b-lg sm:px-4 sm:py-4">
          {actionBar}
        </AppDialogChromeFooter>
      ) : showActionBar && embedded ? (
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-4 py-2 sm:px-4">
          {actionBar}
        </div>
      ) : null}

      {/* OTP Verification Dialog for Receive Copy */}
      <SmsOtpDialog
        isOpen={showReceiveOtpDialog}
        onOpenChange={setShowReceiveOtpDialog}
        sendOtpEndpoint="/auth/initials/send-otp"
        verifyOtpEndpoint="/auth/initials/verify-otp"
        onVerified={() => {
          setShowReceiveOtpDialog(false);
          setPendingDigitalInitials(null);
          pendingReceiveActionRef.current = null;
        }}
        onCancel={() => {
          pendingReceiveActionRef.current = null;
          setPendingDigitalInitials(null);
          setShowReceiveOtpDialog(false);
        }}
        pendingActionRef={pendingReceiveActionRef}
        expirySeconds={otpExpiryFromSettings}
        title="OTP SMS Verification"
        description="OTP SMS Verification has been sent to your registered mobile number for receiving the accountability form copy."
        icon={<ShieldCheck className="h-6 w-6 text-blue-600" />}
        verifyButtonLabel="Verify & Receive"
        phoneNumber={currentUser?.contactNumber || undefined}
      />
    </div>
  );
}

export default AccountabilityFormCard;

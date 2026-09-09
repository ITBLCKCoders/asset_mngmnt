'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  generateAssetChecklistPDF,
  downloadPDF,
  type AssetChecklistData,
} from '@/lib/pdfGenerator';
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
  GitBranch,
  History,
} from 'lucide-react';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { jsPDF } from 'jspdf';
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
import { Shimmer } from '@/components/ui/shimmer';
import {
  addCompanyLogoToPDF,
  cropSignatureToInk,
  getCompanyAccentColor,
  getBlackCodersFooterGradient,
  isBlackCoders,
  sortAssetsByLast5Digits,
  computeSignatureFitSize,
  PDF_SIGNATURE_PX_TO_MM,
} from '@/lib/pdfGenerator/shared';
import type { AccountabilityForm } from './accountabilityFormTypes';
import { AssetMovementTab } from './AssetMovementTab';
import { AccountabilityFormTimeline } from './AccountabilityFormTimeline';
import type { AssetBuilderRecord } from '@/utils/builderScan';
import {
  buildBuilderGroupedAssetRows,
  type AccountabilityAssetRow,
} from './builderAssetGrouping';
import {
  fetchAssignedIntangibleAssetsForForm,
  getAssetDisplayScope,
  getFormAssignedIntangibleAssets,
  getFormDisplayAssets,
  intangibleMatchesFormScope,
  mergeAssetsById,
  splitDisplayAssets,
} from './accountabilityFormAssets';

export type { AccountabilityForm } from './accountabilityFormTypes';

const logger = createLogger('AccountabilityForm');

// Simple in-memory PDF cache
const pdfCache = new Map<string, Blob>();

// Simple in-memory image cache
const imageCache = new Map<string, string>();

// In-flight dedupe for the company-wide intangible asset list. Every list card
// resolves the same /intangible-assets payload on mount; sharing one promise
// collapses N concurrent DB calls into a single one. Cleared once settled so
// later refetches still get fresh data.
let intangibleAssetsFetchPromise: Promise<any> | null = null;

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
const generateCacheKey = (
  form: AccountabilityForm,
  currentUser?: any,
  intangibleAssets: any[] = []
): string => {
  const keyData = {
    formId: form.id,
    formNumber: form.formNumber,
    status: form.status,
    approvalStatus: form.approvalStatus,
    signed_at: form.signed_at,
    issuerSignature: form.issuerSignature,
    itCopySignature: form.itCopySignature,
    adminCopySignature: (form as AccountabilityForm).adminCopySignature,
    adminCopySignedAt: (form as AccountabilityForm).adminCopySignedAt,
    adminCopySignerName: (form as AccountabilityForm).adminCopySignerName,
    deptHeadSignedById: form.deptHeadSignedById,
    deptHeadSignedByName: form.deptHeadSignedByName,
    deptHeadSignature: form.deptHeadSignature,
    deptHeadSignedAt: form.deptHeadSignedAt,
    approvedByName: (form as AccountabilityForm).approvedByName,
    approvedBySignature: (form as AccountabilityForm).approvedBySignature,
    approvedAt: form.approvedAt,
    receivedCopy201FileSignature: form.receivedCopy201FileSignature,
    receivedCopy201FileSignedAt: form.receivedCopy201FileSignedAt,
    receivedCopy201FileSignedByName: form.receivedCopy201FileSignedByName,
    digitalSignature: form.acknowledgments?.digitalSignature,
    assetCount: form.assets.length,
    assetIds: form.assets.map(a => a.id).join(','),
    intangibleAssetCount: intangibleAssets.length,
    intangibleAssetIds: intangibleAssets.map(a => a.id).join(','),
    currentUser: currentUser?.id,
  };
  return JSON.stringify(keyData);
};

// Helper function to convert Blob to Data URL
const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Horizontal shift (mm) applied to centered signatures on this form only.
// Pushed further left than the shared PDF_SIGNATURE_NUDGE_X_MM (-2) per design
// feedback; other form PDFs are unaffected.
const SIGNATURE_NUDGE_X_MM = -6;

// Helper function to add signature to PDF (handles both text and base64 images)
//
// Uniform layout: when `centerWithin` is set the image is sized to a
// fixed fraction of the column width (equal prominence everywhere),
// centered horizontally with a slight left nudge, and its bottom edge
// aligns to `anchorBottomY` (just below the printed-name baseline so the
// lower strokes overlap the name).
const addSignatureToPDF = async (
  doc: jsPDF,
  signatureData: string | undefined,
  x: number,
  y: number,
  maxWidth: number = 50,
  maxHeight: number = 20,
  anchorBottomY?: number,
  centerWithin?: { x: number; width: number }
): Promise<void> => {
  try {
    logger.debug('addSignatureToPDF called', {
      hasSignature: !!signatureData,
      x,
      y,
    });

    if (!signatureData) {
      logger.debug('No signature data provided');
      return;
    }

    const isImageSignature =
      signatureData.startsWith('data:image/') ||
      signatureData.startsWith('http://') ||
      signatureData.startsWith('https://');

    if (!isImageSignature) {
      logger.debug('Skipping non-image signature data');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    // Pixel dimensions of the processed (possibly cropped) image — the
    // cropped data URL has a different aspect than the raw file.
    let inkWidth = 0;
    let inkHeight = 0;

    // Check if signature is a URL (not base64) and if it's cached
    if (
      signatureData.startsWith('http://') ||
      signatureData.startsWith('https://')
    ) {
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
        logger.debug('Signature image loaded', {
          width: img.width,
          height: img.height,
        });

        // Process image to remove white background and make it transparent
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Make white/near-white pixels transparent
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Check if pixel is white or near-white
            const brightness = (r + g + b) / 3;
            if (brightness > 240 && a > 0) {
              // Make transparent
              data[i + 3] = 0;
            }
          }

          ctx.putImageData(imageData, 0, 0);

          // Trim scan whitespace so the ink fills the box (bigger render)
          const cropped = cropSignatureToInk(canvas);
          inkWidth = cropped.width;
          inkHeight = cropped.height;

          // Cache the processed signature image if it's a URL
          if (
            signatureData.startsWith('http://') ||
            signatureData.startsWith('https://')
          ) {
            const processedDataUrl = cropped.toDataURL();
            imageCache.set(signatureData, processedDataUrl);
            img.src = processedDataUrl;
          } else {
            img.src = cropped.toDataURL();
          }
        }

        resolve();
      };
      img.onerror = () => {
        logger.debug('Failed to load signature image');
        reject(new Error('Failed to load signature image'));
      };
    });

    const sigWidth = inkWidth * PDF_SIGNATURE_PX_TO_MM;
    const sigHeight = inkHeight * PDF_SIGNATURE_PX_TO_MM;

    if (!sigWidth || !sigHeight) {
      return;
    }

    // Uniform size: every signature is aspect-fit inside the shared
    // standard box so all render at the same visual size, further capped
    // by the column width for cell-centered signatures.
    const fit = computeSignatureFitSize(sigWidth, sigHeight, {
      cellWidthMm:
        centerWithin && centerWithin.width > 0 ? centerWithin.width : undefined,
      maxWidthMm: maxWidth,
      maxHeightMm: maxHeight,
    });

    const finalSigWidth = fit.width;
    const finalSigHeight = fit.height;

    if (!finalSigWidth || !finalSigHeight) {
      return;
    }

    const drawX =
      centerWithin && centerWithin.width > 0
        ? centerWithin.x +
          (centerWithin.width - finalSigWidth) / 2 +
          SIGNATURE_NUDGE_X_MM
        : x;
    const drawY =
      anchorBottomY != null ? anchorBottomY - finalSigHeight : y;

    logger.debug('Adding signature image to PDF', {
      finalSigWidth,
      finalSigHeight,
      x: drawX,
      y: drawY,
    });
    doc.addImage(img.src, 'PNG', drawX, drawY, finalSigWidth, finalSigHeight);
  } catch (error) {
    logger.debug(
      'Failed to add signature to PDF',
      error as Record<string, unknown>
    );
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
// Uses combined tangible + intangible classification (intangible via type_department)
// so the 1st-page header matches the signatory "Copy for IT/Admin" and the
// acknowledgment issuingDepartment logic (itAssets/itIntangibleAssets).
const getDepartmentName = (
  form: AccountabilityForm,
  assignedIntangibleAssets: any[] = []
) => {
  let hasIT = false;
  let hasAdmin = false;

  // Classify embedded form assets via display scope (correct for intangibles)
  for (const asset of form.assets) {
    const scope = getAssetDisplayScope(asset as any, form);
    if (scope === 'IT') hasIT = true;
    if (scope === 'Admin') hasAdmin = true;
    if (hasIT && hasAdmin) break;
  }

  // Also consider resolved assigned intangibles (union used by PDF/content)
  if (!(hasIT && hasAdmin)) {
    for (const asset of assignedIntangibleAssets) {
      const scope = getAssetDisplayScope(asset, form);
      if (scope === 'IT') hasIT = true;
      if (scope === 'Admin') hasAdmin = true;
      if (hasIT && hasAdmin) break;
    }
  }

  // Fallback when form has no classifiable assets: use form/user department
  if (!hasIT && !hasAdmin) {
    const fallback = classifyDepartmentScopeByName(
      form.department?.name || form.user?.department?.name || ''
    );
    if (fallback === 'IT') hasIT = true;
    if (fallback === 'Admin') hasAdmin = true;
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
  /** Show "Pending Receiver Signature" badge (only in AccountabilityFormsPage) */
  showPendingReceiverSignatureBadge?: boolean;
  /** Skip checklist/intangible/OTP fetches on mount (list pages) */
  lazyLoadDetails?: boolean;
}

const getAccountabilityFormAssignmentIds = (
  form: AccountabilityForm
): string[] => {
  const assignmentIds = new Set<string>();
  for (const id of form.assignmentIds ?? []) {
    const assignmentId = String(id ?? '').trim();
    if (assignmentId) {
      assignmentIds.add(assignmentId);
    }
  }
  if (form.assignment?.id) {
    const assignmentId = String(form.assignment.id).trim();
    if (assignmentId) {
      assignmentIds.add(assignmentId);
    }
  }
  return [...assignmentIds];
};

// Classify a display asset (embedded form asset or resolved intangible) into the
// IT/Admin bucket used by the card badges. Mirrors the PDF split at
// generateAccountabilityFormPDF: intangibles are classified solely by their
// Intangible Asset Type's department (Admin only when that department is
// Admin/Administration; otherwise IT), so assignment department / type name do
// not influence the bucket.
const getDisplayScopeType = (
  asset: any,
  form: AccountabilityForm
): ClientAssetScopeType => getAssetDisplayScope(asset, form);

const getIntangibleAssetDescription = (asset: any): string =>
  String(asset?.description ?? '').trim();

const enrichIntangibleAssetsWithDescriptions = async (
  assets: any[],
  form: AccountabilityForm
): Promise<any[]> => {
  if (assets.length === 0) return assets;
  if (
    assets.every(
      asset =>
        getIntangibleAssetDescription(asset) &&
        asset.risk_level?.id &&
        asset.type_department != null
    )
  ) {
    return assets;
  }

  const assignmentIds = new Set(getAccountabilityFormAssignmentIds(form));
  if (assignmentIds.size === 0) return assets;

  try {
    const response = await api.get<any[]>('/intangible-assets');
    const apiById = new Map(
      (response ?? []).map(asset => [String(asset.id), asset])
    );
    return assets.map(asset => {
      const fromApi = apiById.get(String(asset.id));
      if (!fromApi) return asset;
      return {
        ...asset,
        description: fromApi.description ?? asset.description ?? '',
        name: asset.name || fromApi.name,
        type: asset.type || fromApi.type,
        risk_level: fromApi.risk_level ?? asset.risk_level ?? null,
        type_department:
          fromApi.type_department ?? asset.type_department ?? null,
      };
    });
  } catch {
    return assets;
  }
};

// Reusable PDF generation function (exported for issuer decline notification dialog)
export const generateAccountabilityFormPDF = async (
  form: AccountabilityForm,
  currentUser?: any,
  intangibleAssets?: any[],
  assetBuilders?: AssetBuilderRecord[]
): Promise<Blob> => {
  // Resolve the complete intangible set: the intangibles embedded in the form
  // snapshot unioned with the intangibles currently assigned to the form's user
  // (from the caller-provided list or fetched from /intangible-assets). Only
  // intangibles matching the form's scope are included, so an Admin form never
  // prints IT intangibles (and vice versa).
  const embeddedIntangibles = fetchAssignedIntangibleAssetsForForm(form).filter(
    (asset: any) => intangibleMatchesFormScope(asset, form)
  );
  let resolvedIntangibleAssets: any[] = embeddedIntangibles;
  if (intangibleAssets && intangibleAssets.length > 0) {
    resolvedIntangibleAssets = mergeAssetsById(
      embeddedIntangibles,
      intangibleAssets
    );
  } else {
    try {
      const response = await api.get<any[]>('/intangible-assets');
      resolvedIntangibleAssets = mergeAssetsById(
        embeddedIntangibles,
        getFormAssignedIntangibleAssets(response, form)
      );
    } catch (error) {
      logger.warn('Failed to fetch assigned intangible assets for form');
    }
  }
  const assignedIntangibleAssets = await enrichIntangibleAssetsWithDescriptions(
    resolvedIntangibleAssets,
    form
  );

  // Resolve asset builders (used to group builder parent/child assets in the
  // asset table). Builders are matched by the form's asset codes — NOT the
  // viewer's company scope — because a form can hold assets from a company
  // different from the viewer's active company.
  let builders = assetBuilders;
  if (!builders || builders.length === 0) {
    try {
      const assetCodes = (form.assets ?? [])
        .map(a => a.code)
        .filter((code): code is string => Boolean(code));
      const response = await api.post('/asset-builders/match', { assetCodes });
      builders = Array.isArray(response.builders) ? response.builders : [];
      logger.info(
        `[AccountabilityForm] builders resolved: ${
          response.builders ? response.builders.length : 0
        } found`
      );
    } catch (error) {
      logger.warn('Failed to fetch asset builders for accountability form');
      builders = [];
    }
  }
  const firstBuilderItems = builders?.[0]?.items;
  if (firstBuilderItems && firstBuilderItems.length > 0) {
    logger.info(
      `[AccountabilityForm] form ${form.formNumber} builders: ${firstBuilderItems.length}, sample codes: ${firstBuilderItems
        .slice(0, 3)
        .map((i: any) => i.asset_code)
        .join(', ')}`
    );
  }

  const [{ jsPDF: JsPDFConstructor }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = autoTableModule.default;

  // 8.5 x 13 inches is approximately 215.9 mm x 330.2 mm
  const doc = new JsPDFConstructor({
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
  const companyAccentColor = getCompanyAccentColor(form.user.company?.name);
  const isBlackCodersCompany = isBlackCoders(form.user.company?.name);
  const headerFillColor: [number, number, number] = isBlackCodersCompany
    ? [0, 0, 0]
    : [companyAccentColor.r, companyAccentColor.g, companyAccentColor.b];
  const headerTextColor: [number, number, number] = [255, 255, 255];

  // Add logo first
  await addCompanyLogoToPDF(doc, companyLogoUrl, 15, 8);

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
  const title =
    form.formOrigin === 'processor_return'
      ? 'Asset Accountability Form (TEMPORARY)'
      : 'Asset Accountability Form';
  doc.text(title, 105, 40, { align: 'center' });

  // Department - font size 12 (uses combined tangible+intangible scope so IT header matches IT copy)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const departmentName = getDepartmentName(form, assignedIntangibleAssets);
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
    headStyles: { fillColor: headerFillColor, textColor: headerTextColor },
  });
  y = (doc as any).lastAutoTable.finalY + 15; // Increased from 6 to 15 to add more space

  // Acknowledgment of Receipt - font size 12 bold
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Acknowledgment of Receipt', 20, y);
  y += 10;

  // Categorize assets based on IT/Admin scope classification
  const sortedAssets = sortAssetsByLast5Digits(form.assets);
  const tangibleAssets = sortedAssets.filter(
    asset => String(asset.category ?? '').toLowerCase() !== 'intangible'
  );
  const itAssets = tangibleAssets.filter(
    asset => getAssetScopeType(asset, form) === 'IT'
  );
  const adminAssets = tangibleAssets.filter(
    asset => getAssetScopeType(asset, form) === 'Admin'
  );

  const itIntangibleAssets = assignedIntangibleAssets.filter(
    (asset: any) => getAssetDisplayScope(asset, form) === 'IT'
  );
  const adminIntangibleAssets = assignedIntangibleAssets.filter(
    (asset: any) => getAssetDisplayScope(asset, form) === 'Admin'
  );

  // Determine which department to show in the acknowledgment text
  const hasIT = itAssets.length > 0 || itIntangibleAssets.length > 0;
  const hasAdmin = adminAssets.length > 0 || adminIntangibleAssets.length > 0;
  let issuingDepartment = '_______________________________';
  if (hasIT && hasAdmin) {
    issuingDepartment = 'IT Department and Admin Department';
  } else if (hasIT) {
    issuingDepartment = 'IT Department';
  } else if (hasAdmin) {
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
      // Use larger dimensions for continuation header and center within FOR INTERNAL USE ONLY box
      const continuationLogoWidth = 40;
      const continuationLogoHeight = 20;
      doc.addImage(
        cachedContinuationLogo.imgData,
        'PNG',
        152.5,
        8,
        continuationLogoWidth,
        continuationLogoHeight
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

  // Render a scope's asset table with builder grouping. Builder groups start
  // with a full-width separator row showing the builder name (like the asset
  // list export), with the parent asset first and children below. Rows are
  // chunked to keep up to 15 asset rows per page without splitting a group.
  const renderScopeAssetTable = (
    scopeAssets: AccountabilityForm['assets'][number][],
    startY: number
  ): number => {
    const rows = buildBuilderGroupedAssetRows(scopeAssets, builders);
    const separators = rows.filter(r => r.kind === 'separator').length;
    logger.info(
      `[AccountabilityForm] grouping: scopeAssets=${scopeAssets.length}, builders=${
        builders?.length ?? 0
      }, totalRows=${rows.length}, separatorRows=${separators}`
    );
    logger.info(
      `[AccountabilityForm] form asset codes: ${scopeAssets
        .map(a => a.code)
        .join(', ')}`
    );
    const matchedCounts = (builders ?? [])
      .map(b => {
        const matched = b.items?.filter(item =>
          scopeAssets.some(a => a.code === item.asset_code)
        ).length;
        return matched ? `${b.name}: ${matched}` : null;
      })
      .filter(Boolean)
      .join(' | ');
    if (matchedCounts) {
      logger.info(`[AccountabilityForm] builder matches: ${matchedCounts}`);
    } else {
      logger.info(
        `[AccountabilityForm] NO builder matched any form asset (total builder items across all builders: ${
          (builders ?? []).reduce(
            (n, b) => n + (b.items?.length ?? 0),
            0
          )
        })`
      );
    }
    const assetsPerPage = 15;
    const pageHeight = 330.2; // 8.5 x 13 inches in mm
    const bottomMargin = 30; // Leave some margin at bottom

    const batches: AccountabilityAssetRow[][] = [];
    let currentBatch: AccountabilityAssetRow[] = [];
    let assetCountInBatch = 0;

    for (const row of rows) {
      if (row.kind === 'separator' && assetCountInBatch > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        assetCountInBatch = 0;
      } else if (row.kind === 'asset' && assetCountInBatch >= assetsPerPage) {
        batches.push(currentBatch);
        currentBatch = [];
        assetCountInBatch = 0;
      }

      currentBatch.push(row);
      if (row.kind === 'asset') {
        assetCountInBatch += 1;
      }
    }
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    let currentY = startY;
    batches.forEach((batch, index) => {
      const isFirstBatch = index === 0;

      // If there are more batches and we're approaching the bottom of the page, add a new page
      if (!isFirstBatch && currentY + 50 > pageHeight - bottomMargin) {
        doc.addPage();
        const newPageNum = doc.getNumberOfPages();
        if (!continuationHeaderDrawnPages.has(newPageNum)) {
          drawContinuationHeader();
          continuationHeaderDrawnPages.add(newPageNum);
        }
        currentY = 45;
      }

      const bodyRows = batch.map(row =>
        row.kind === 'separator'
          ? [
              {
                content: row.name,
                colSpan: assetTableHead.length,
                styles: {
                  fillColor: headerFillColor,
                  textColor: headerTextColor,
                  fontStyle: 'bold',
                  halign: 'center',
                },
              },
            ]
          : [
              row.asset.name,
              row.asset.brand || '',
              row.asset.modelNo || '',
              row.asset.serialNo,
              row.asset.code,
              'Good',
            ]
      );

      // Show table header on first batch or when batch starts at top of page (one header per page)
      const showTableHead = isFirstBatch || currentY <= 80;

      autoTable(doc, {
        startY: currentY,
        tableWidth,
        margin: { ...tableMargin, top: 45 },
        head: showTableHead ? [assetTableHead] : [],
        body: bodyRows as any[],
        theme: 'grid',
        styles: {
          fontSize: 12,
          cellPadding: 1,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        headStyles: { fillColor: headerFillColor, textColor: headerTextColor },
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
    });

    return currentY;
  };

  // IT Asset Details - font size 12 bold
  if (itAssets.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('IT Asset Details', 20, y);

    y = renderScopeAssetTable(itAssets, y + 5);
  }

  // Intangible Assets - font size 12 bold
  if (itIntangibleAssets.length > 0) {
    y += 10; // Add spacing before Intangible Assets title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Intangible Assets', 20, y);

    // Intangible asset table columns
    const intangibleTableHead = ['Asset Name', 'Description', 'Type', 'Risk Level'];
    const intangibleTableColumnStyles = {
      0: { cellWidth: 70 },
      1: { cellWidth: 70.9 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
    };

    const intangibleRows = itIntangibleAssets.map((asset: any) => [
      asset.name,
      getIntangibleAssetDescription(asset),
      asset.type,
      asset.risk_level?.name || '—',
    ]);

    autoTable(doc, {
      startY: y + 5,
      tableWidth,
      margin: { ...tableMargin, top: 45 },
      head: [intangibleTableHead],
      body: intangibleRows,
      theme: 'grid',
      styles: {
        fontSize: 12,
        cellPadding: 1,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      headStyles: { fillColor: headerFillColor, textColor: headerTextColor },
      columnStyles: intangibleTableColumnStyles,
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

    y = (doc as any).lastAutoTable.finalY + 1;
  }

  // Admin Asset Details - font size 12 bold
  if (adminAssets.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Admin Asset Details', 20, y);

    y = renderScopeAssetTable(adminAssets, y + 5);
  }

  // Intangible Assets - font size 12 bold
  if (adminIntangibleAssets.length > 0) {
    y += 10; // Add spacing before Intangible Assets title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Intangible Assets', 20, y);

    const intangibleTableHead = ['Asset Name', 'Description', 'Type', 'Risk Level'];
    const intangibleTableColumnStyles = {
      0: { cellWidth: 70 },
      1: { cellWidth: 70.9 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
    };

    const intangibleRows = adminIntangibleAssets.map((asset: any) => [
      asset.name,
      getIntangibleAssetDescription(asset),
      asset.type,
      asset.risk_level?.name || '—',
    ]);

    autoTable(doc, {
      startY: y + 5,
      tableWidth,
      margin: { ...tableMargin, top: 45 },
      head: [intangibleTableHead],
      body: intangibleRows,
      theme: 'grid',
      styles: {
        fontSize: 12,
        cellPadding: 1,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      headStyles: { fillColor: headerFillColor, textColor: headerTextColor },
      columnStyles: intangibleTableColumnStyles,
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

    y = (doc as any).lastAutoTable.finalY + 1;
  }

  // Last page number that has table content (table continuation pages only; agreement/signature pages come after)

  // First page footer: gold bar and black line at fixed position at bottom of page 1 (page height 330.2 mm)
  doc.setPage(1);
  const footerGoldY = 320; // Near bottom of first page
  const footerLineY = 324;

  if (isBlackCodersCompany) {
    // Solid red bar for Black Coders
    doc.setDrawColor(220, 38, 38);
    doc.setFillColor(220, 38, 38);
    doc.setLineWidth(0.1);
    doc.rect(10, footerGoldY, 195, 1, 'FD');
  } else {
    // Solid color bar for other companies
    doc.setDrawColor(
      companyAccentColor.r,
      companyAccentColor.g,
      companyAccentColor.b
    ); // Same color as table header background
    doc.setFillColor(
      companyAccentColor.r,
      companyAccentColor.g,
      companyAccentColor.b
    );
    doc.setLineWidth(0.1); // Thin line for the colored block border
    doc.rect(10, footerGoldY, 195, 1, 'FD'); // Gold bar in footer
  }

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
  // Uniform signature columns: left 20–80, right 130–190 (60mm wide each).
  // Images fill the column width; the bottom edge sits only 1mm below the
  // printed-name baseline (name sits at signatureY + 28) — raised from 3mm
  // per design feedback so signatures sit higher above the line.
  const sigColLeft = { x: 20, width: 60 };
  const sigColRight = { x: 130, width: 60 };
  const sigNameOverlap = 1;
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
    signatureLength: form.issuerSignature?.length,
  });
  await addSignatureToPDF(
    doc,
    form.issuerSignature,
    20,
    signatureY,
    122,
    74,
    signatureY + 28 + sigNameOverlap,
    sigColLeft
  );

  doc.setLineWidth(0.2);
  doc.line(20, signatureY + 30, 80, signatureY + 30);
  doc.text('Signature over Printed Name', 20, signatureY + 35);

  doc.text('Issued to / Received by:', 130, signatureY);

  if (form.signed_at) {
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
      signaturePrefix: digitalSignature?.substring(0, 50),
    });
    if (digitalSignature) {
      await addSignatureToPDF(
        doc,
        digitalSignature,
        130,
        signatureY,
        122,
        74,
        signatureY + 28 + sigNameOverlap,
        sigColRight
      );
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

  // Determine which copy label to use based on asset types (must match header/issuingDepartment: IT if any IT asset/intangible, else Admin)
  const hasITForCopy = itAssets.length > 0 || itIntangibleAssets.length > 0;
  const copyLabel = hasITForCopy ? 'Copy for IT:' : 'Copy for Admin:';
  doc.text(copyLabel, 20, signatureY + 60);

  // IT/Admin copy signatory stays blank until the designated copy signer
  // signs. Never pre-fill with the issuer name. Date/time/name render once
  // signed_at exists; the signature image is optional (signers without saved
  // digital initials still store signed_at with a null signature).
  const adminCopySignedAtRaw = form.adminCopySignedAt ?? null;
  const adminCopySignatureValue =
    form.adminCopySignature ?? form.itCopySignature ?? null;
  const isAdminCopySigned = !!adminCopySignedAtRaw;
  const hasAdminCopySignatureImage = !!adminCopySignatureValue;
  const adminCopySignerDisplayName =
    form.adminCopySignerName?.trim() || '';

  if (isAdminCopySigned) {
    const itCopyDate = new Date(adminCopySignedAtRaw as string);
    doc.text(`${itCopyDate.toLocaleDateString()}`, 60, signatureY + 70);
    doc.text(`${itCopyDate.toLocaleTimeString()}`, 60, signatureY + 75);
    if (adminCopySignerDisplayName) {
      doc.text(adminCopySignerDisplayName, 20, signatureY + 88);
    }
  }

  // Render IT/Admin copy digital signature if available (between name and signature line)
  logger.debug('Rendering IT copy signature', {
    hasITCopySignature: hasAdminCopySignatureImage,
    signatureLength: adminCopySignatureValue?.length,
    isAdminCopySigned,
  });
  if (isAdminCopySigned && hasAdminCopySignatureImage) {
    await addSignatureToPDF(
      doc,
      adminCopySignatureValue as string,
      20,
      signatureY + 60,
      122,
      74,
      signatureY + 88 + sigNameOverlap,
      sigColLeft
    );
  }

  doc.setLineWidth(0.2);
  doc.line(20, signatureY + 90, 80, signatureY + 90);
  doc.text('Signature over Printed Name', 20, signatureY + 95);

  // Department head signatory (new field) directly underneath the Copy block,
  // left column. Stamped at final approval by the owner's designated
  // approver/sub-approver. Falls back to approved_by for backfilled rows.
  const deptHeadName =
    form.deptHeadSignedByName?.trim() ||
    (form as any).approvedByName?.trim() ||
    '';
  const deptHeadAtRaw =
    form.deptHeadSignedAt || (form as any).approvedAt || null;
  const deptHeadSignature =
    form.deptHeadSignature || (form as any).approvedBySignature || null;
  // Extra vertical gap (mm) added below the IT/Admin copy signatory section
  // so the Department head block is not sitting too close to it. Only the
  // Department head block offsets below use this gap.
  const deptHeadGap = 15;
  doc.text('Reviewed/Checked by Department Head:', 20, signatureY + 108 + deptHeadGap);
  if (deptHeadAtRaw) {
    const deptHeadDate = new Date(deptHeadAtRaw);
    doc.text(`${deptHeadDate.toLocaleDateString()}`, 60, signatureY + 118 + deptHeadGap);
    doc.text(`${deptHeadDate.toLocaleTimeString()}`, 60, signatureY + 123 + deptHeadGap);
  }
  if (deptHeadName) {
    doc.text(deptHeadName, 20, signatureY + 136 + deptHeadGap);
  }
  if (deptHeadSignature) {
    logger.debug('Rendering Department head signature', {
      hasDeptHeadSignature: !!deptHeadSignature,
      signatureLength: deptHeadSignature?.length,
    });
    await addSignatureToPDF(
      doc,
      deptHeadSignature,
      20,
      signatureY + 108 + deptHeadGap,
      122,
      74,
      signatureY + 136 + deptHeadGap + sigNameOverlap,
      sigColLeft
    );
  }
  doc.setLineWidth(0.2);
  doc.line(20, signatureY + 138 + deptHeadGap, 80, signatureY + 138 + deptHeadGap);
  doc.text('Signature over Printed Name', 20, signatureY + 143 + deptHeadGap);
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
    // Display digital initials
    if (form.receivedCopy201FileSignature) {
      await addSignatureToPDF(
        doc,
        form.receivedCopy201FileSignature,
        130,
        signatureY + 60,
        122,
        74,
        signatureY + 88 + sigNameOverlap,
        sigColRight
      );
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

type FormChecklistEntry = AssetChecklistData & {
  asset?: { id: string; code: string | null; name: string | null } | null;
};

function getChecklistTabKey(checklist: FormChecklistEntry): string {
  return checklist.assignment_id || checklist.id;
}

function isImageDigitalSignature(signature?: string | null): boolean {
  if (!signature) {
    return false;
  }
  return (
    signature.startsWith('data:image/') ||
    signature.startsWith('http://') ||
    signature.startsWith('https://')
  );
}

function resolveEmployeeChecklistSignature(
  checklist: FormChecklistEntry,
  options?: {
    acknowledgmentsSignature?: string | null;
    userSignature?: string | null;
  }
): string | null {
  if (isImageDigitalSignature(checklist.employee_digital_signature)) {
    return checklist.employee_digital_signature!.trim();
  }
  if (isImageDigitalSignature(options?.acknowledgmentsSignature)) {
    return options!.acknowledgmentsSignature!.trim();
  }
  if (isImageDigitalSignature(options?.userSignature)) {
    return options!.userSignature!.trim();
  }
  return checklist.employee_digital_signature || null;
}

function buildChecklistPdfPayload(
  checklist: FormChecklistEntry,
  options: {
    assetLabel: string;
    acknowledgmentsSignature?: string | null;
    userSignature?: string | null;
  }
) {
  return {
    ...checklist,
    asset_label: options.assetLabel,
    employee_digital_signature: resolveEmployeeChecklistSignature(checklist, {
      acknowledgmentsSignature: options.acknowledgmentsSignature,
      userSignature: options.userSignature,
    }),
    employee_company_logo_url: checklist.employee_company_logo_url ?? null,
  };
}

function getChecklistAssetLabel(
  checklist: FormChecklistEntry,
  formAssets: AccountabilityForm['assets']
): string {
  const checklistAsset = checklist.asset;
  const fallback =
    formAssets.find(a => a.id === checklistAsset?.id) ?? formAssets[0];
  const name = checklistAsset?.name || fallback?.name || 'Asset';
  const code = checklistAsset?.code || fallback?.code || '—';
  return `${name} (${code})`;
}

function ChecklistSummaryCard({
  checklist,
}: {
  checklist: FormChecklistEntry;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-red-200 bg-gradient-to-br from-red-50/80 via-white to-slate-50 p-4 shadow-md">
      <div className="flex items-start justify-between gap-3 border-b border-red-100 pb-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-red-600">
            Asset Checklist
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
            {checklist.form_number || `CHK-${checklist.assignment_id}`}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {checklist.type_onboarding && (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/30">
              Onboarding
            </Badge>
          )}
          {checklist.type_offboarding && (
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/30">
              Offboarding
            </Badge>
          )}
          {checklist.employee_signed_at && (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-200 dark:hover:bg-green-900/30">
              Signed
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
            {new Date(checklist.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Employee
          </p>
          <p className="mt-1 font-medium text-slate-900">
            {checklist.employee_name}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white/80 p-3 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Reviewed / Checked By
        </p>
        <p className="mt-1 font-medium text-slate-900">
          {checklist.received_by || 'N/A'}
        </p>
      </div>
    </div>
  );
}

function FormAssetSection({
  tangibleAssets,
  intangibleAssets,
  intangibleAssetsLoading,
}: {
  tangibleAssets: any[];
  intangibleAssets: any[];
  intangibleAssetsLoading: boolean;
}) {
  if (
    !intangibleAssetsLoading &&
    tangibleAssets.length === 0 &&
    intangibleAssets.length === 0
  ) {
    return <p className="font-medium text-sm">No Assets</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-medium text-sm">
          <Package className="h-4 w-4 text-blue-600 flex-shrink-0" />
          Tangible Assets <span className="text-gray-400">({tangibleAssets.length})</span>
        </p>
        {tangibleAssets.length > 0 ? (
          <div className="max-h-[120px] overflow-y-auto scrollbar-hide text-xs text-gray-500 mt-1">
            <div className="space-y-1">
              {tangibleAssets.map(asset => (
                <div key={asset.id} className="flex items-start min-w-0">
                  <span className="w-1 h-1 bg-gray-400 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                  <span className="break-words">{asset.name || asset.code}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-1">None</p>
        )}
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-medium text-sm">
          <FileText className="h-4 w-4 text-amber-600 flex-shrink-0" />
          Intangible Assets <span className="text-gray-400">({intangibleAssets.length})</span>
        </p>
        {intangibleAssetsLoading ? (
          <div className="space-y-1.5 mt-1">
            <Shimmer className="h-4 w-24 rounded" />
            <Shimmer className="h-4 w-32 rounded" />
          </div>
        ) : intangibleAssets.length > 0 ? (
          <div className="max-h-[120px] overflow-y-auto scrollbar-hide text-xs text-gray-500 mt-1">
            <div className="space-y-1">
              {intangibleAssets.map(asset => (
                <div key={asset.id} className="flex items-start min-w-0">
                  <span className="w-1 h-1 bg-gray-400 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                  <span className="break-words">{asset.name || asset.code}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-1">None</p>
        )}
      </div>
    </div>
  );
}

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
  showPendingReceiverSignatureBadge = false,
  lazyLoadDetails = false,
}: AccountabilityFormProps) {
  const { user: currentUser } = useCurrentUser();
  const isDisabledOrDeclined =
    form.status === 'Disabled' || form.status === 'Declined';
  const isReceived201 = !!form.receivedCopy201FileSignedAt;
  const displayedStatus =
    statusPillVariant === 'activeDisabled' && isDisabledOrDeclined
      ? 'Disabled'
      : statusPillVariant === 'activeDisabled' && isReceived201
        ? 'Received'
        : statusPillVariant === 'toReceive'
          ? 'To receive'
          : statusPillVariant === 'activeDisabled'
            ? 'Active'
            : statusBasedOnReceivedCopy
              ? form.status
              : form.status;
  const isDeclined = form.status === 'Declined';
  const isDisabledWithDeclineReason =
    form.status === 'Disabled' && form.declineReason;
  const issuerName = form.issuer
    ? `${form.issuer.first_name} ${form.issuer.last_name}`
    : 'Administrator';
  const isAssignedUser = currentUser?.id === form.user.id;
  const [localForm, setLocalForm] = useState<AccountabilityForm>(form);
  // The owner cannot sign until the IT/Admin copy has been signed.
  const copySignPending =
    localForm.approvalStatus === 'pending_admin_copy_signature';
  const canSign =
    isAssignedUser && localForm.status === 'Pending' && !copySignPending;
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAgreement, setAgreeAgreement] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReasonDraft, setDeclineReasonDraft] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);
  const [activeCardTab, setActiveCardTab] = useState<
    'accountability' | 'checklist' | 'timeline'
  >('accountability');
  const [checklists, setChecklists] = useState<FormChecklistEntry[]>([]);
  const [activeChecklistKey, setActiveChecklistKey] = useState<string>('');
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const [showChecklistSignDialog, setShowChecklistSignDialog] = useState(false);
  const [agreeChecklist, setAgreeChecklist] = useState(false);
  const [checklistPdfUrl, setChecklistPdfUrl] = useState<string>('');
  const hasChecklist = checklists.length > 0;
  const hasUnsignedChecklists = checklists.some(c => !c.employee_signed_at);
  const unsignedChecklistCount = checklists.filter(
    c => !c.employee_signed_at
  ).length;
  const allChecklistsSigned = hasChecklist && !hasUnsignedChecklists;
  const canSignChecklist =
    isAssignedUser && hasChecklist && hasUnsignedChecklists;
  // Timeline tab is view-only: sign/download/decline stay bound to the
  // accountability and checklist tabs.
  const showCardSignButton =
    showSignButton &&
    activeCardTab !== 'timeline' &&
    (activeCardTab !== 'checklist' ? canSign : canSignChecklist);
  const showFooterDownload =
    showDownloadButton &&
    activeCardTab !== 'checklist' &&
    activeCardTab !== 'timeline';
  const showFooterDecline =
    showDeclineButton &&
    canSign &&
    !!onDecline &&
    activeCardTab !== 'timeline' &&
    !(activeCardTab === 'checklist' && allChecklistsSigned);
  const activeChecklist =
    checklists.find(c => getChecklistTabKey(c) === activeChecklistKey) ??
    checklists[0] ??
    null;
  const checklistAssetLabel = activeChecklist
    ? getChecklistAssetLabel(activeChecklist, form.assets)
    : '';
  const [intangibleAssets, setIntangibleAssets] = useState<any[]>([]);
  const [intangibleAssetsLoading, setIntangibleAssetsLoading] = useState(false);
  const displayAssets = getFormDisplayAssets(form, intangibleAssets);
  const {
    tangible: tangibleAssets,
    intangible: intangibleDisplayAssets,
  } = splitDisplayAssets(displayAssets);

  // OTP verification state
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpExpiryFromSettings, setOtpExpiryFromSettings] = useState(300);
  const [pendingActionType, setPendingActionType] = useState<
    'sign' | 'decline' | 'signChecklist' | null
  >(null);
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    setLocalForm(form);
  }, [form]);

  // Fetch OTP expiry from settings
  useEffect(() => {
    if (lazyLoadDetails) {
      return;
    }
    const fetchOtpExpiry = async () => {
      try {
        const response = await api.get<{
          settings: { otpExpirySeconds?: number };
        }>('/settings/security');
        if (response?.settings?.otpExpirySeconds) {
          setOtpExpiryFromSettings(response.settings.otpExpirySeconds);
        }
      } catch (err) {
        console.error('Failed to fetch OTP expiry setting:', err);
      }
    };
    fetchOtpExpiry();
  }, [lazyLoadDetails]);

  // Fetch all checklists linked to this accountability form
  useEffect(() => {
    const fetchChecklists = async () => {
      try {
        setChecklistLoading(true);
        const response = await api.get<{ checklists: FormChecklistEntry[] }>(
          `/accountability-forms/${form.id}/checklists`
        );
        let list = response?.checklists ?? [];

        // Fallback for older forms: single checklist by primary assignment id
        if (list.length === 0 && form.assignment?.id) {
          try {
            const legacy = await api.get<FormChecklistEntry>(
              `/asset-assignments/checklist/${form.assignment.id}`
            );
            if (legacy?.id) {
              list = [legacy];
            }
          } catch (legacyError: unknown) {
            const status = (legacyError as { response?: { status?: number } })
              ?.response?.status;
            if (status !== 404) {
              console.error('Failed to fetch legacy checklist:', legacyError);
            }
          }
        }

        setChecklists(list);
        if (list.length > 0) {
          setActiveChecklistKey(getChecklistTabKey(list[0]!));
        } else {
          setActiveChecklistKey('');
        }
      } catch (error) {
        console.error('Failed to fetch checklists:', error);
        setChecklists([]);
        setActiveChecklistKey('');
      } finally {
        setChecklistLoading(false);
      }
    };
    fetchChecklists();
  }, [form.id, form.assignment?.id]);

  // Fetch intangible assets currently assigned to the form's user. Fetched even
  // on lazy-loaded list cards so the card's asset list matches the PDF, which
  // always resolves assigned intangibles.
  useEffect(() => {
    const fetchIntangibleAssets = async () => {
      try {
        setIntangibleAssetsLoading(true);
        if (!intangibleAssetsFetchPromise) {
          intangibleAssetsFetchPromise = api
            .get('/intangible-assets')
            .finally(() => {
              intangibleAssetsFetchPromise = null;
            });
        }
        const response = await intangibleAssetsFetchPromise;
        setIntangibleAssets(getFormAssignedIntangibleAssets(response, form));
      } catch (error) {
        console.error('Failed to fetch intangible assets:', error);
        setIntangibleAssets([]);
      } finally {
        setIntangibleAssetsLoading(false);
      }
    };
    fetchIntangibleAssets();
  }, [form.id, form.user.id]);

  const refreshFormChecklists = async () => {
    try {
      const response = await api.get<{ checklists: FormChecklistEntry[] }>(
        `/accountability-forms/${form.id}/checklists`
      );
      const list = response?.checklists ?? [];
      setChecklists(list);
      if (list.length > 0) {
        const keepKey = activeChecklistKey || getChecklistTabKey(list[0]);
        const stillExists = list.some(c => getChecklistTabKey(c) === keepKey);
        setActiveChecklistKey(
          stillExists ? keepKey : getChecklistTabKey(list[0])
        );
      }
    } catch (error) {
      console.error('Failed to refresh checklists:', error);
    }
  };

  // Generate checklist PDF when view or sign dialog opens
  useEffect(() => {
    const generateChecklistPdf = async () => {
      if ((showChecklistDialog || showChecklistSignDialog) && activeChecklist) {
        try {
          const pdfBlob = await generateAssetChecklistPDF(
            buildChecklistPdfPayload(activeChecklist, {
              assetLabel: checklistAssetLabel,
              acknowledgmentsSignature:
                localForm.acknowledgments?.digitalSignature ?? null,
              userSignature: currentUser?.digitalSignature ?? null,
            })
          );
          const url = URL.createObjectURL(pdfBlob);
          setChecklistPdfUrl(url);
        } catch (error) {
          console.error('Failed to generate checklist PDF:', error);
          toast.error('Failed to generate checklist PDF');
        }
      } else if (
        !showChecklistDialog &&
        !showChecklistSignDialog &&
        checklistPdfUrl
      ) {
        URL.revokeObjectURL(checklistPdfUrl);
        setChecklistPdfUrl('');
      }
    };
    generateChecklistPdf();
  }, [
    showChecklistDialog,
    showChecklistSignDialog,
    activeChecklist,
    checklistAssetLabel,
    localForm.acknowledgments?.digitalSignature,
    currentUser?.digitalSignature,
  ]);

  // Generate PDF only when preview modal opens
  useEffect(() => {
    if (!showPreviewModal) return;

    const generatePdf = async () => {
      try {
        console.log('Starting PDF generation for preview...');
        setIsPdfGenerating(true);
        console.log('Set isPdfGenerating to true');

        // Check cache first
        const cacheKey = generateCacheKey(
          localForm,
          currentUser,
          intangibleAssets
        );
        const cachedPdf = pdfCache.get(cacheKey);

        if (cachedPdf) {
          console.log('Using cached PDF');
          const url = URL.createObjectURL(cachedPdf);
          console.log('Created blob URL from cache:', url);
          setPdfUrl(url);
          setIsPdfGenerating(false);
          console.log('Set isPdfGenerating to false (cached)');
          return;
        }

        console.log('Generating new PDF...');
        // Generate new PDF
        const pdfBlob = await generateAccountabilityFormPDF(
          localForm,
          currentUser,
          intangibleAssets
        );

        console.log('PDF generated, size:', pdfBlob.size, 'bytes');

        // Cache the generated PDF
        pdfCache.set(cacheKey, pdfBlob);

        const url = URL.createObjectURL(pdfBlob);
        console.log('Created blob URL:', url);
        setPdfUrl(url);
        setIsPdfGenerating(false);
        console.log('Set isPdfGenerating to false (generated)');
      } catch (error) {
        console.error('Error generating PDF:', error);
        setIsPdfGenerating(false);
        console.log('Set isPdfGenerating to false (error)');
        toast.error('Failed to generate PDF preview');
      }
    };

    generatePdf();

    return () => {
      if (pdfUrl) {
        console.log('Revoking blob URL:', pdfUrl);
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl('');
      }
      setIsPdfGenerating(false);
    };
  }, [showPreviewModal, localForm, currentUser, intangibleAssets]);

  // Generate PDF when decline dialog opens (to ensure preview is available)
  useEffect(() => {
    if (!showDeclineDialog) return;

    const generatePdf = async () => {
      try {
        console.log('Starting PDF generation for decline dialog...');
        setIsPdfGenerating(true);

        // Check cache first
        const cacheKey = generateCacheKey(
          localForm,
          currentUser,
          intangibleAssets
        );
        const cachedPdf = pdfCache.get(cacheKey);

        if (cachedPdf) {
          console.log('Using cached PDF for decline dialog');
          const url = URL.createObjectURL(cachedPdf);
          setPdfUrl(url);
          setIsPdfGenerating(false);
          return;
        }

        console.log('Generating new PDF for decline dialog...');
        // Generate new PDF
        const pdfBlob = await generateAccountabilityFormPDF(
          localForm,
          currentUser,
          intangibleAssets
        );

        // Cache the generated PDF
        pdfCache.set(cacheKey, pdfBlob);

        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setIsPdfGenerating(false);
      } catch (error) {
        console.error('Error generating PDF for decline dialog:', error);
        setIsPdfGenerating(false);
        toast.error('Failed to generate PDF preview');
      }
    };

    generatePdf();
  }, [showDeclineDialog, localForm, currentUser, intangibleAssets]);

  // Generate PDF when confirm dialog opens (to ensure preview is available)
  useEffect(() => {
    if (!showConfirmDialog) return;

    const generatePdf = async () => {
      try {
        console.log('Starting PDF generation for confirm dialog...');
        setIsPdfGenerating(true);

        // Check cache first
        const cacheKey = generateCacheKey(
          localForm,
          currentUser,
          intangibleAssets
        );
        const cachedPdf = pdfCache.get(cacheKey);

        if (cachedPdf) {
          console.log('Using cached PDF for confirm dialog');
          const url = URL.createObjectURL(cachedPdf);
          setPdfUrl(url);
          setIsPdfGenerating(false);
          return;
        }

        console.log('Generating new PDF for confirm dialog...');
        // Generate new PDF
        const pdfBlob = await generateAccountabilityFormPDF(
          localForm,
          currentUser,
          intangibleAssets
        );

        // Cache the generated PDF
        pdfCache.set(cacheKey, pdfBlob);

        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setIsPdfGenerating(false);
      } catch (error) {
        console.error('Error generating PDF for confirm dialog:', error);
        setIsPdfGenerating(false);
        toast.error('Failed to generate PDF preview');
      }
    };

    generatePdf();
  }, [showConfirmDialog, localForm, currentUser, intangibleAssets]);

  const handleDownload = async () => {
    try {
      // Check cache first
      const cacheKey = generateCacheKey(
        localForm,
        currentUser,
        intangibleAssets
      );
      const cachedPdf = pdfCache.get(cacheKey);

      let pdfBlob: Blob;
      if (cachedPdf) {
        logger.debug('Using cached PDF for download');
        pdfBlob = cachedPdf;
      } else {
        pdfBlob = await generateAccountabilityFormPDF(
          localForm,
          currentUser,
          intangibleAssets
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
      className={`shadow-md hover:shadow-xl transition-all duration-200 border-slate-200 bg-white flex flex-col overflow-hidden ${isDeclined ? 'opacity-75' : ''}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 shadow-sm rounded-xl">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{form.formNumber}</CardTitle>
              <p className="text-sm text-gray-500">
                Created {new Date(form.created_at).toLocaleDateString()}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {displayAssets.filter(a => getDisplayScopeType(a, form) === 'IT')
                  .length > 0 && (
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800">
                    IT Asset Accountability
                  </span>
                )}
                {displayAssets.filter(a => getDisplayScopeType(a, form) === 'Admin')
                  .length > 0 && (
                  <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800">
                    Admin Asset Accountability
                  </span>
                )}
              </div>
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
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                  : displayedStatus === 'To receive'
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
                    : displayedStatus === 'Completed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                      : displayedStatus === 'Signed'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                        : displayedStatus === 'Disabled'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                          : displayedStatus === 'Declined'
                            ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                            : displayedStatus === 'Revoked'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
              }
            >
              {displayedStatus}
            </Badge>
            {statusPillVariant === 'activeDisabled' &&
              displayedStatus === 'Disabled' &&
              isReceived201 && (
                <Badge
                  variant="outline"
                  className="border-green-300 bg-green-50 text-green-900 font-medium dark:border-green-800 dark:bg-green-900/30 dark:text-green-200"
                >
                  Received • 201 file
                </Badge>
              )}
            {form.formOrigin === 'processor_return' && (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-900 font-medium dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
              >
                Temporary
              </Badge>
            )}
            {showPendingReceiverSignatureBadge && form.status === 'Pending' && (
              <Badge
                variant="outline"
                className="border-orange-300 bg-orange-50 text-orange-900 font-medium dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
              >
                Pending Receiver Signature
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-1">
        {hasChecklist ? (
          <Tabs
            value={activeCardTab}
            onValueChange={v =>
              setActiveCardTab(v as 'accountability' | 'checklist' | 'timeline')
            }
            className="w-full"
          >
            <TabsList
              className={segmentTabsListClassName + ' grid grid-cols-3 mb-4'}
            >
              <TabsTrigger
                value="accountability"
                className={segmentTabsTriggerClassName}
              >
                Accountability
              </TabsTrigger>
              <TabsTrigger
                value="checklist"
                className={segmentTabsTriggerClassName}
              >
                Checklist
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className={segmentTabsTriggerClassName}
              >
                Timeline
              </TabsTrigger>
            </TabsList>

            <TabsContent value="accountability" className="space-y-3">
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
                <div className="flex-1">
                  <FormAssetSection
                    tangibleAssets={tangibleAssets}
                    intangibleAssets={intangibleDisplayAssets}
                    intangibleAssetsLoading={intangibleAssetsLoading}
                  />
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
                      Issued by: {form.issuer.first_name}{' '}
                      {form.issuer.last_name}
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
                    {form.created_at &&
                    !isNaN(new Date(form.created_at).getTime())
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
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {[1, 2, 3].map(i => (
                      <Shimmer key={i} className="h-8 w-28 rounded-lg" />
                    ))}
                  </div>
                  <div className="rounded-xl border p-4 space-y-3">
                    <Shimmer className="h-5 w-48 rounded" />
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map(j => (
                        <div key={j} className="flex items-center gap-3">
                          <Shimmer className="h-4 w-4 rounded" />
                          <Shimmer className="h-4 flex-1 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeChecklist ? (
                <div className="space-y-3">
                  {checklists.length > 1 && (
                    <Tabs
                      value={activeChecklistKey}
                      onValueChange={setActiveChecklistKey}
                      className="w-full"
                    >
                      <TabsList
                        className={
                          segmentTabsListClassName +
                          ' flex h-auto w-full flex-wrap justify-start gap-1'
                        }
                      >
                        {checklists.map(entry => (
                          <TabsTrigger
                            key={getChecklistTabKey(entry)}
                            value={getChecklistTabKey(entry)}
                            className={segmentTabsTriggerClassName + ' text-xs'}
                          >
                            {getChecklistAssetLabel(entry, form.assets)}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  )}
                  <ChecklistSummaryCard checklist={activeChecklist} />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No checklist data available
                </div>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <AccountabilityFormTimeline form={localForm} />
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs
            value={activeCardTab === 'checklist' ? 'accountability' : activeCardTab}
            onValueChange={v =>
              setActiveCardTab(v as 'accountability' | 'timeline')
            }
            className="w-full"
          >
            <TabsList
              className={segmentTabsListClassName + ' grid grid-cols-2 mb-4'}
            >
              <TabsTrigger
                value="accountability"
                className={segmentTabsTriggerClassName}
              >
                Accountability
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className={segmentTabsTriggerClassName}
              >
                Timeline
              </TabsTrigger>
            </TabsList>

            <TabsContent value="accountability" className="space-y-3">
            <div className="space-y-3">
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
              <div className="flex-1">
                <FormAssetSection
                  tangibleAssets={tangibleAssets}
                  intangibleAssets={intangibleDisplayAssets}
                  intangibleAssetsLoading={intangibleAssetsLoading}
                />
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
                  {form.created_at &&
                  !isNaN(new Date(form.created_at).getTime())
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
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <AccountabilityFormTimeline form={localForm} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      {/* Footer with Actions */}
      <div className="flex flex-col sm:flex-row gap-2 p-4 mt-auto border-t border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (activeCardTab === 'checklist' && activeChecklist) {
              setShowChecklistDialog(true);
            } else if (onView) {
              onView(form);
            } else {
              setShowPreviewModal(true);
            }
          }}
          className="w-full sm:flex-1 bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 shadow-sm"
        >
          <Eye className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">View</span>
          <span className="sm:hidden">View</span>
        </Button>

        {showFooterDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="w-full sm:flex-1 bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Download</span>
            <span className="sm:hidden">DL</span>
          </Button>
        )}

        {showReceiveButton && onReceive && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReceive(form)}
            className="w-full sm:flex-1 bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 shadow-sm"
          >
            <span className="hidden sm:inline">Receive</span>
            <span className="sm:hidden">Recv</span>
          </Button>
        )}

        {showCardSignButton && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeCardTab === 'checklist' && hasChecklist) {
                  setShowChecklistSignDialog(true);
                } else {
                  setShowConfirmDialog(true);
                }
              }}
              className="w-full sm:flex-1 bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Form</span>
              <span className="sm:hidden">Sign</span>
            </Button>

            {/* Confirmation Dialog */}
            <AlertDialog
              open={showConfirmDialog}
              onOpenChange={setShowConfirmDialog}
            >
              <AppAlertDialogFrame className="flex max-h-[90vh] !max-w-2xl flex-col overflow-hidden !gap-0 !border-0 !p-0">
                <AppAlertDialogGradientHeader title="Confirm Form Signing" />
                <div className="px-6 py-4 pb-2">
                  <p className="text-base text-gray-600">
                    Please review your accountability form below. By signing
                    this form, you agree to all the terms and conditions stated
                    in the document.
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                  <div className="mx-4 my-4 h-[600px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:mx-6">
                    <PDFViewer pdfUrl={pdfUrl} className="h-full w-full" />
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
                          const digitalInitials =
                            (currentUser as any)?.digitalSignature || '';

                          // Prepare acknowledgments with digital signature
                          const acknowledgmentsData = digitalInitials
                            ? {
                                ...form.acknowledgments,
                                digitalSignature: digitalInitials,
                                signedBy: currentUser?.id,
                                signedByName:
                                  `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim(),
                              }
                            : form.acknowledgments;

                          await onSign?.(form.id, acknowledgmentsData);

                          await refreshFormChecklists();

                          // Create updated form object for PDF generation
                          const updatedForm = {
                            ...form,
                            status: 'Signed' as const,
                            signed_at: new Date().toISOString(),
                            acknowledgments: digitalInitials
                              ? {
                                  ...form.acknowledgments,
                                  digitalSignature: digitalInitials,
                                  signedBy: currentUser?.id,
                                  signedByName:
                                    `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim(),
                                }
                              : form.acknowledgments,
                          };

                          // Update localForm state
                          setLocalForm(updatedForm);

                          // Generate PDF with updated form data directly
                          const generatePdf = async () => {
                            try {
                              // Check cache first
                              const cacheKey = generateCacheKey(
                                updatedForm,
                                currentUser,
                                intangibleAssets
                              );
                              const cachedPdf = pdfCache.get(cacheKey);

                              let pdfBlob: Blob;
                              if (cachedPdf) {
                                logger.debug('Using cached PDF after sign');
                                pdfBlob = cachedPdf;
                              } else {
                                pdfBlob = await generateAccountabilityFormPDF(
                                  updatedForm,
                                  currentUser,
                                  intangibleAssets
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

        {showFooterDecline && (
          <Button
            variant="outline"
            size="sm"
            onClick={openDeclineDialog}
            className="flex-1 border-red-300 text-red-700 hover:bg-red-50 shadow-sm"
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
          <div className="px-6 py-4 pb-2">
            <p className="text-sm text-muted-foreground">
              Declining will release the assets on this form so they can be
              assigned again. This cannot be undone.
            </p>
          </div>
          <AppDialogBody className="min-h-0 flex-1 overflow-auto !p-0">
            <div className="mx-4 h-[575px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:mx-6">
              <PDFViewer pdfUrl={pdfUrl} className="h-full w-full" />
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
                if (!r || !onDecline || showOtpDialog || isDeclining) return;

                setPendingActionType('decline');
                pendingActionRef.current = async () => {
                  try {
                    setIsDeclining(true);
                    await onDecline(form.id, r);
                    setDeclineReasonDraft('');
                    setLocalForm(prev => ({
                      ...prev,
                      status: 'Disabled',
                      declineReason: r,
                    }));
                  } catch {
                    /* toast from parent */
                  } finally {
                    setIsDeclining(false);
                  }
                };

                setShowDeclineDialog(false);
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
          if (pendingActionType === 'signChecklist') {
            toast.success(
              unsignedChecklistCount > 1
                ? `Signed ${unsignedChecklistCount} checklists successfully`
                : 'Checklist signed successfully'
            );
          }
          setPendingActionType(null);
          setShowConfirmDialog(false);
          setShowChecklistSignDialog(false);
          setAgreeTerms(false);
          setAgreeAgreement(false);
          setAgreeChecklist(false);
        }}
        onCancel={() => {
          pendingActionRef.current = null;
          setPendingActionType(null);
          setShowConfirmDialog(false);
          setShowChecklistSignDialog(false);
          setAgreeTerms(false);
          setAgreeAgreement(false);
          setAgreeChecklist(false);
          setShowDeclineDialog(false);
          setDeclineReasonDraft('');
        }}
        pendingActionRef={pendingActionRef}
        expirySeconds={otpExpiryFromSettings}
        title="OTP SMS Verification"
        description="OTP SMS Verification has been sent to your registered mobile number for accountability form signing."
        icon={<ShieldCheck className="h-6 w-6 text-blue-600" />}
        verifyButtonLabel={
          pendingActionType === 'decline' ? 'Verify & Decline' : 'Verify & Sign'
        }
        phoneNumber={currentUser?.contactNumber || undefined}
      />

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <AppDialogFrame className="max-w-4xl max-h-[90vh] overflow-hidden !flex !flex-col !gap-0 !border-0 !p-0">
          <AppDialogGradientHeader
            title={`${form.user.first_name} ${form.user.last_name} - ${form.formNumber}`}
            description="Asset Accountability Form Preview"
          />
          <AppDialogBody className="min-h-0 flex-1 overflow-auto !p-0 bg-gray-100">
            {isPdfGenerating ? (
              <div className="flex h-full w-full items-center justify-center text-gray-500 bg-gray-100">
                <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-lg shadow-md">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                  <p className="text-lg font-medium text-gray-700">
                    Generating PDF preview...
                  </p>
                  <p className="text-sm text-gray-500">
                    This may take a few seconds
                  </p>
                </div>
              </div>
            ) : (
              <PDFViewer pdfUrl={pdfUrl} className="w-full" />
            )}
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

      {/* Checklist sign dialog (profile documents — checklist tab) */}
      <AlertDialog
        open={showChecklistSignDialog}
        onOpenChange={open => {
          setShowChecklistSignDialog(open);
          if (!open) setAgreeChecklist(false);
        }}
      >
        <AppAlertDialogFrame className="flex max-h-[90vh] !max-w-2xl flex-col overflow-hidden !gap-0 !border-0 !p-0">
          <AppAlertDialogGradientHeader title="Confirm Checklist Signing" />
          <div className="px-6 py-4 pb-2">
            <p className="text-base text-gray-600">
              Please review your asset checklist below. By signing, you confirm
              the checklist information is correct.
              {unsignedChecklistCount > 1
                ? ` This will sign all ${unsignedChecklistCount} checklists linked to this form.`
                : ''}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {checklists.length > 1 && (
              <div className="px-6 pt-2">
                <Tabs
                  value={activeChecklistKey}
                  onValueChange={setActiveChecklistKey}
                  className="w-full"
                >
                  <TabsList
                    className={
                      segmentTabsListClassName +
                      ' flex h-auto w-full flex-wrap justify-start gap-1'
                    }
                  >
                    {checklists.map(entry => (
                      <TabsTrigger
                        key={getChecklistTabKey(entry)}
                        value={getChecklistTabKey(entry)}
                        className={segmentTabsTriggerClassName + ' text-xs'}
                      >
                        {getChecklistAssetLabel(entry, form.assets)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}
            <div className="mx-4 my-4 h-[600px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:mx-6">
              <PDFViewer pdfUrl={checklistPdfUrl} className="h-full w-full" />
            </div>
            <div className="space-y-4 px-6 py-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="agree-checklist"
                  checked={agreeChecklist}
                  onCheckedChange={checked =>
                    setAgreeChecklist(checked as boolean)
                  }
                  className="mt-1"
                />
                <label
                  htmlFor="agree-checklist"
                  className="text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I confirm the asset checklist details are correct
                </label>
              </div>
            </div>
          </div>
          <AppAlertDialogChromeFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowChecklistSignDialog(false);
                setAgreeChecklist(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setPendingActionType('signChecklist');
                pendingActionRef.current = async () => {
                  const digitalSignature =
                    localForm.acknowledgments?.digitalSignature ||
                    currentUser?.digitalSignature ||
                    '';
                  const response = await api.post<{
                    checklists?: FormChecklistEntry[];
                    signedCount?: number;
                  }>(`/accountability-forms/${form.id}/checklists/sign`, {
                    digitalSignature: digitalSignature || undefined,
                  });
                  if (response?.checklists?.length) {
                    setChecklists(response.checklists);
                    const first = response.checklists[0];
                    setActiveChecklistKey(getChecklistTabKey(first));
                  } else {
                    await refreshFormChecklists();
                  }
                };
                setShowOtpDialog(true);
              }}
              disabled={!agreeChecklist}
              className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Sign Form
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>

      {/* Checklist view dialog */}
      <Dialog open={showChecklistDialog} onOpenChange={setShowChecklistDialog}>
        <AppDialogFrame className="max-w-4xl max-h-[90vh] overflow-hidden !flex !flex-col !gap-0 !border-0 !p-0">
          <AppDialogGradientHeader
            title={`${activeChecklist?.employee_name || form.user.first_name + ' ' + form.user.last_name} - Asset Checklist${checklistAssetLabel ? ` (${checklistAssetLabel})` : ''}`}
            description="Asset Checklist Form Preview"
          />
          <AppDialogBody className="min-h-0 flex-1 overflow-auto !p-0">
            <PDFViewer pdfUrl={checklistPdfUrl} className="h-full w-full" />
          </AppDialogBody>
          <AppDialogChromeFooter className="justify-end gap-3">
            {canSignChecklist && (
              <Button
                size="sm"
                onClick={() => {
                  setShowChecklistDialog(false);
                  setShowChecklistSignDialog(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Sign Form
              </Button>
            )}
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
  /** Callback to notify parent when receive copy action completes */
  onReceiveCompleted?: () => void;
  /** When true, show an Asset Movement tab (return/transfer/replacement chain) alongside the PDF */
  showAssetMovement?: boolean;
  /** When true, show a Timeline tab (lifecycle + audit trail) alongside the PDF */
  showTimeline?: boolean;
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
  onReceiveCompleted,
  showAssetMovement = false,
  showTimeline = false,
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
  const [pendingActionType, setPendingActionType] = useState<
    'sign' | 'decline' | null
  >(null);
  const [pendingDigitalInitials, setPendingDigitalInitials] = useState<
    string | null
  >(null);
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);
  const pendingReceiveActionRef = useRef<(() => Promise<void>) | null>(null);
  const [intangibleAssets, setIntangibleAssets] = useState<any[]>([]);
  const [intangibleAssetsLoading, setIntangibleAssetsLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<
    'form' | 'movement' | 'timeline'
  >('form');

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

  // Fetch intangible assets currently assigned to the form's user
  useEffect(() => {
    const fetchIntangibleAssets = async () => {
      try {
        setIntangibleAssetsLoading(true);
        if (!intangibleAssetsFetchPromise) {
          intangibleAssetsFetchPromise = api
            .get('/intangible-assets')
            .finally(() => {
              intangibleAssetsFetchPromise = null;
            });
        }
        const response = await intangibleAssetsFetchPromise;
        setIntangibleAssets(getFormAssignedIntangibleAssets(response, form));
      } catch (error) {
        console.error('Failed to fetch intangible assets:', error);
        setIntangibleAssets([]);
      } finally {
        setIntangibleAssetsLoading(false);
      }
    };
    fetchIntangibleAssets();
  }, [form.id, form.user.id]);

  useEffect(() => {
    const generatePdf = async () => {
      try {
        // Check cache first
        const cacheKey = generateCacheKey(
          localForm,
          currentUser,
          intangibleAssets
        );
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
          currentUser,
          intangibleAssets
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
  }, [localForm, currentUser, intangibleAssets]);

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
      : 'flex w-full h-[85vh] flex-1 flex-col overflow-auto';
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

  const previewPaneClass = headerInParentChrome
    ? 'h-[70vh] w-full min-w-0 overflow-auto border-0 bg-gray-100'
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
              <div className="px-6 py-4 pb-2">
                <p className="text-base text-gray-600">
                  Please review your accountability form below. By signing this
                  form, you agree to all the terms and conditions stated in the
                  document.
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <div className="mx-4 my-4 h-[500px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:mx-6">
                  <PDFViewer pdfUrl={pdfUrl} className="h-full w-full" />
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
            <div className="px-6 py-4 pb-2">
              <p className="text-sm text-muted-foreground">
                Declining will release the assets on this form so they can be
                assigned again. This cannot be undone.
              </p>
            </div>
            <AppDialogBody className="min-h-0 flex-1 overflow-auto !p-0">
              <div className="mx-4 h-[420px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:mx-6">
                <PDFViewer pdfUrl={pdfUrl} className="h-full w-full" />
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
                  if (!r || !onDecline || showOtpDialog || isDeclining) return;

                  setPendingActionType('decline');
                  pendingActionRef.current = async () => {
                    try {
                      setIsDeclining(true);
                      await onDecline(form.id, r);
                      setDeclineReasonDraft('');
                      setLocalForm(prev => ({
                        ...prev,
                        status: 'Disabled',
                        declineReason: r,
                      }));
                    } catch {
                      /* toast from parent */
                    } finally {
                      setIsDeclining(false);
                    }
                  };

                  setShowDeclineDialog(false);
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
        verifyButtonLabel={
          pendingActionType === 'decline' ? 'Verify & Decline' : 'Verify & Sign'
        }
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
                        receivedCopy201FileSignedAt: new Date().toISOString(),
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
                  I am receiving this copy as an official accountability and for
                  safe keeping of 201 file of the user.
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
                    const digitalInitials =
                      (currentUser as any)?.digitalSignature || '';
                    setPendingDigitalInitials(digitalInitials);
                    pendingReceiveActionRef.current = async () => {
                      await api.post(
                        `/accountability-forms/${form.id}/sign-received-copy`,
                        {
                          digitalInitials,
                        }
                      );
                      toast.success('Copy received successfully');
                      setLocalForm(prev => ({
                        ...prev,
                        receivedCopy201FileSignature: digitalInitials,
                        receivedCopy201FileSignedAt: new Date().toISOString(),
                        receivedCopy201FileSignedById: currentUser?.id,
                        receivedCopy201FileSignedByName:
                          `${firstName} ${lastName}`.trim(),
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

      {!(headerInParentChrome && !hrViewMode) &&
        localForm.status === 'Declined' && (
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
          {showAssetMovement || showTimeline ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <Tabs
                value={activeDetailTab}
                onValueChange={tab =>
                  setActiveDetailTab(tab as typeof activeDetailTab)
                }
                className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
              >
                <TabsList
                  className={`mb-3 grid w-full ${
                    showAssetMovement && showTimeline
                      ? 'grid-cols-3'
                      : 'grid-cols-2'
                  } ${segmentTabsListClassName}`}
                >
                  <TabsTrigger value="form" className={cn(segmentTabsTriggerClassName, 'flex h-10 items-center justify-center gap-2')}>
                    <FileText className="h-4 w-4 shrink-0" />
                    Form
                  </TabsTrigger>
                  {showAssetMovement && (
                    <TabsTrigger value="movement" className={cn(segmentTabsTriggerClassName, 'flex h-10 items-center justify-center gap-2')}>
                      <GitBranch className="h-4 w-4 shrink-0" />
                      Asset Movement
                    </TabsTrigger>
                  )}
                  {showTimeline && (
                    <TabsTrigger value="timeline" className={cn(segmentTabsTriggerClassName, 'flex h-10 items-center justify-center gap-2')}>
                      <History className="h-4 w-4 shrink-0" />
                      Timeline
                    </TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="form" className="mt-0 min-h-0 flex-1 px-4 sm:px-6">
                  <div className="flex h-[70vh] flex-col overflow-hidden">
                    <PDFViewer pdfUrl={pdfUrl} className="h-full w-full" />
                  </div>
                </TabsContent>
                {showAssetMovement && (
                  <TabsContent value="movement" className="mt-0 min-h-0 flex-1 overflow-auto px-4 sm:px-6">
                    <AssetMovementTab formId={form.id} formStatus={localForm.status} />
                  </TabsContent>
                )}
                {showTimeline && (
                  <TabsContent value="timeline" className="mt-0 min-h-0 flex-1 overflow-auto px-4 sm:px-6">
                    <AccountabilityFormTimeline form={localForm} />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          ) : (
            <div className="flex h-[70vh] flex-1 flex-col overflow-hidden">
              <PDFViewer pdfUrl={pdfUrl} className="h-full w-full" />
            </div>
          )}
        </div>
      ) : showAssetMovement || showTimeline ? (
        <div className={previewClassName}>
          <Tabs
            value={activeDetailTab}
            onValueChange={tab =>
              setActiveDetailTab(tab as typeof activeDetailTab)
            }
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList
              className={`mb-3 grid w-full ${
                showAssetMovement && showTimeline
                  ? 'grid-cols-3'
                  : 'grid-cols-2'
              } ${segmentTabsListClassName}`}
            >
              <TabsTrigger value="form" className={cn(segmentTabsTriggerClassName, 'flex h-10 items-center justify-center gap-2')}>
                <FileText className="h-4 w-4 shrink-0" />
                Form
              </TabsTrigger>
              {showAssetMovement && (
                <TabsTrigger value="movement" className={cn(segmentTabsTriggerClassName, 'flex h-10 items-center justify-center gap-2')}>
                  <GitBranch className="h-4 w-4 shrink-0" />
                  Asset Movement
                </TabsTrigger>
              )}
              {showTimeline && (
                <TabsTrigger value="timeline" className={cn(segmentTabsTriggerClassName, 'flex h-10 items-center justify-center gap-2')}>
                  <History className="h-4 w-4 shrink-0" />
                  Timeline
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="form" className="mt-0 min-h-0 flex-1 px-4 sm:px-6">
              <PDFViewer pdfUrl={pdfUrl} className="h-full w-full" />
            </TabsContent>
            {showAssetMovement && (
              <TabsContent value="movement" className="mt-0 min-h-0 flex-1 overflow-auto px-4 sm:px-6">
                <AssetMovementTab formId={form.id} formStatus={localForm.status} />
              </TabsContent>
            )}
            {showTimeline && (
              <TabsContent value="timeline" className="mt-0 min-h-0 flex-1 overflow-auto px-4 sm:px-6">
                <AccountabilityFormTimeline form={localForm} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      ) : (
        <div className={previewClassName}>
          <PDFViewer pdfUrl={pdfUrl} className="h-full w-full" />
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
          onReceiveCompleted?.();
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

/**
 * ClearanceFormCard — minimal card for an Asset Clearance Certificate
 * (formOrigin === 'clearance'). Reuses the company branding of the
 * accountability form but exposes only View / Download (no signing,
 * declining, or HR-receive actions).
 */
export function ClearanceFormCard({
  form,
  onView,
  onDownload,
}: {
  form: AccountabilityForm;
  onView?: (form: AccountabilityForm) => void;
  onDownload?: (form: AccountabilityForm) => void;
}) {
  const scope = form.clearanceScope ?? 'Unified';
  const isIT = scope === 'IT';
  const scopeLabel =
    scope === 'Unified' ? 'Unified Clearance' : isIT ? 'IT Clearance' : 'Admin Clearance';
  const ScopeIcon = isIT ? ShieldCheck : ShieldCheck;
  const clearedDate = form.clearedAt
    ? new Date(form.clearedAt).toLocaleDateString()
    : new Date(form.created_at).toLocaleDateString();
  const reasonLabel =
    form.clearanceReason === 'transfer'
      ? 'Generated from company/department transfer'
      : 'Generated from asset return';

  return (
    <Card className="shadow-md hover:shadow-xl transition-all duration-200 border-slate-200 bg-white flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 shadow-sm rounded-xl ${
                isIT
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                  : 'bg-gradient-to-br from-amber-500 to-amber-600'
              }`}
            >
              <ScopeIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isIT ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {scopeLabel}
              </p>
              <CardTitle className="text-lg">{form.formNumber}</CardTitle>
              <p className="text-sm text-gray-500">Issued {clearedDate}</p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={
              isIT
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
            }
          >
            Cleared
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">
              {form.user.first_name} {form.user.last_name}
            </p>
            <p className="text-xs text-gray-500">{reasonLabel}</p>
          </div>
        </div>
        {form.referenceDisabledFormNumbers &&
          form.referenceDisabledFormNumbers.length > 0 && (
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Disabled Form(s)
                </p>
                <p className="text-sm text-gray-700 break-words">
                  {form.referenceDisabledFormNumbers.join(', ')}
                </p>
              </div>
            </div>
          )}
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Scope
            </p>
            <p className="text-sm text-gray-700">
              {scope === 'Unified' ? 'Unified clearance' : `${scope} Department`} — 0 assets remaining
            </p>
          </div>
        </div>
      </CardContent>
      <div className="flex gap-2 p-4 mt-auto border-t border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onView?.(form)}
          className={`flex-1 text-white border-transparent shadow-sm ${
            isIT
              ? 'bg-emerald-600 hover:bg-white hover:text-emerald-600 hover:border-emerald-600'
              : 'bg-amber-600 hover:bg-white hover:text-amber-600 hover:border-amber-600'
          }`}
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDownload?.(form)}
          className={`flex-1 text-white border-transparent shadow-sm ${
            isIT
              ? 'bg-emerald-600 hover:bg-white hover:text-emerald-600 hover:border-emerald-600'
              : 'bg-amber-600 hover:bg-white hover:text-amber-600 hover:border-amber-600'
          }`}
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    </Card>
  );
}

export default AccountabilityFormCard;

import { jsPDF } from 'jspdf';
import {
  classifyDepartmentScopeByName,
  type ClientAssetScopeType,
} from '@/lib/assetScope';
import {
  addSignatureToPDF,
  autoTable,
  fetchActiveCompanyForAssetReturnForm,
  pdfLogger as logger,
} from './shared';

export interface AssetReturnData {
  assignmentID: string;
  assets: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    type: string;
    serialNo: string;
    brand?: string;
    modelNo?: string;
    /** When multiple assets in one form, condition/notes can be per asset */
    returnCondition?: string;
    returnNotes?: string;
  }>;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    employeeNumber?: string;
    position?: string;
  };
  department: {
    id: string;
    name: string;
  } | null;
  /** Returner's department — shown on "Department/Company:" (separate from department used for IT/Admin form scope) */
  requestorDepartment?: { id: string; name: string } | null;
  location: {
    id: string;
    name: string;
    floor_unit: string;
    building: string;
  } | null;
  assigned_date: string;
  expected_return_date: string | null;
  actual_return_date: string;
  assignment_notes: string | null;
  status: string;
  assigned_by: {
    id: string;
    first_name: string;
    last_name: string;
  };
  returnCondition: string;
  returnNotes: string;
  /** Actual return form number (e.g. RET-YYYYMMDD-0001) for display on PDF */
  form_number?: string | null;
  /** When form is signed: ISO date string for date/time in Returner cell */
  signed_at?: string | null;
  /** When form is signed: base64 data URL of signer's digital signature image */
  digital_signature?: string | null;
  /** Process user (IT staff) signature: ISO date string */
  process_signed_at?: string | null;
  /** Process user (IT staff) digital signature image (base64 data URL) */
  process_digital_signature?: string | null;
  /** Process user display name for PDF (e.g. from processed_by) */
  process_user_name?: string | null;
  /** Return type for PDF checkbox: 'Returned' | 'Offboarding' | 'Returned,Offboarding' */
  returnType?: string | null;
  /** Received by for PDF checkbox: 'IT Staff' | 'IT Officer' | 'IT Manager' | 'IT helpdesk' (case-insensitive) */
  receivedBy?: string | null;
  /** When set (new flow), PDF shows this job title instead of Received-by checkboxes */
  processorPosition?: string | null;
  /** Dept Head (Returner's Department Head) signature date/time */
  dept_head_signed_at?: string | null;
  /** Dept Head digital signature image (base64 data URL) */
  dept_head_digital_signature?: string | null;
  /** Dept Head display name for PDF */
  dept_head_user_name?: string | null;
  /** IT Manager / IT Department Head signature date/time */
  it_manager_signed_at?: string | null;
  /** IT Manager digital signature image (base64 data URL) */
  it_manager_digital_signature?: string | null;
  /** IT Manager display name for PDF */
  it_manager_user_name?: string | null;
  /** When true, show the processor (IT Staff) block; when false, hide it until Dept Head has signed */
  showProcessorSignatureBlock?: boolean;
}

export const generateAssetReturnPDF = async (
  returnData: AssetReturnData
): Promise<Blob> => {
  // 8.5 x 13 inches is approximately 215.9 mm x 330.2 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [215.9, 330.2], // 8.5 x 13 inches in millimeters
  });

  // Set document metadata
  doc.setProperties({
    title: `Asset Return Form - ${returnData.assets[0]?.name || 'Asset'}`,
    subject: 'Asset Return Form',
    author: 'Asset Management System',
    creator: 'Asset Management System',
  });

  // Fetch active company (user's company) for logo
  const activeCompany = await fetchActiveCompanyForAssetReturnForm();

  const formNumber = returnData.form_number || 'Return Form';

  const pageMargin = 15;
  const tableWidth = 215.9 - pageMargin * 2;
  const tableLineWidth = 0.35;
  const headerBoxHeight = 40;
  const headerBoxY = 8;

  // Single header box (same width as table) containing logo, FOR INTERNAL USE ONLY, form number, title, department
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(tableLineWidth);
  doc.setFillColor(255, 255, 255);
  doc.rect(pageMargin, headerBoxY, tableWidth, headerBoxHeight, 'FD');

  // Company logo in top left inside the box
  if (activeCompany?.logo_url) {
    try {
      const logoUrl =
        activeCompany.logo_url.startsWith('/') && typeof window !== 'undefined'
          ? `${window.location.origin}${activeCompany.logo_url}`
          : activeCompany.logo_url;
      const response = await fetch(logoUrl);
      if (response.ok) {
        const blob = await response.blob();
        const format =
          blob.type?.includes('jpeg') || blob.type?.includes('jpg')
            ? 'JPEG'
            : 'PNG';
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        await new Promise<void>(resolve => {
          const img = new Image();
          img.onload = () => {
            const pixelsToMm = 0.264583;
            let w = img.width * pixelsToMm;
            let h = img.height * pixelsToMm;
            const maxW = 72;
            const maxH = 38;
            if (w > maxW) {
              const s = maxW / w;
              w = maxW;
              h *= s;
            }
            if (h > maxH) {
              const s = maxH / h;
              h = maxH;
              w *= s;
            }
            doc.addImage(dataUrl, format, pageMargin, headerBoxY + 2, w, h);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = dataUrl;
        });
      }
    } catch (e) {
      logger.debug('Logo not found on first page, continuing without it');
    }
  }

  // FOR INTERNAL USE ONLY box and form number box (positioned left of right edge)
  const internalBoxW = 55;
  const internalBoxGapFromRight = 2;
  const internalBoxX =
    pageMargin + tableWidth - internalBoxGapFromRight - internalBoxW;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(tableLineWidth);
  doc.setFillColor(255, 255, 255);
  doc.rect(internalBoxX, headerBoxY + 2, internalBoxW, 8, 'FD');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(
    'FOR INTERNAL USE ONLY',
    internalBoxX + internalBoxW / 2,
    headerBoxY + 8,
    { align: 'center' }
  );
  const codeBoxH = 10;
  doc.setDrawColor(255, 0, 0);
  doc.setLineWidth(tableLineWidth);
  doc.setFillColor(255, 255, 255);
  doc.rect(internalBoxX, headerBoxY + 12, internalBoxW, codeBoxH, 'FD');
  doc.setTextColor(255, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(formNumber, internalBoxX + internalBoxW / 2, headerBoxY + 19, {
    align: 'center',
  });
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  const headerCenterX = pageMargin + tableWidth / 2;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSET RETURN FORM', headerCenterX, 35, { align: 'center' });

  // Determine IT/Admin scope based primarily on department name, falling back to asset category when needed
  let scope: ClientAssetScopeType = classifyDepartmentScopeByName(
    returnData.department?.name
  );
  if (scope === 'Other' && returnData.assets[0]?.category) {
    scope = classifyDepartmentScopeByName(returnData.assets[0].category);
  }
  const isAdminScope = scope === 'Admin';

  const departmentName = isAdminScope
    ? 'Administration Department'
    : 'Information Technology Department';

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(departmentName, headerCenterX, 41, { align: 'center' });

  const startY = headerBoxY + headerBoxHeight;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const currentUserName =
    `${returnData.user.first_name || ''} ${returnData.user.last_name || ''}`.trim();
  const dateFiled = returnData.actual_return_date
    ? new Date(returnData.actual_return_date).toLocaleDateString()
    : '—';
  const designation = returnData.user.position ?? '—';
  const deptCompany =
    (returnData.requestorDepartment?.name || '').trim() ||
    '—';
  const receivedByLabels = isAdminScope
    ? ['Admin Staff', 'Admin Officer', 'Admin Manager', 'Admin Helpdesk']
    : ['IT Staff', 'IT Officer', 'IT Manager', 'IT helpdesk'];
  const returnTypeLabels = ['Returned', 'Offboarding'];

  /** Condition is recorded when IT processes the return; keep PDF column blank until then. */
  const showReturnConditionOnPdf = !!returnData.process_signed_at?.trim();
  const assetRows = returnData.assets.map(asset => [
    asset.name || '—',
    asset.code || '—',
    showReturnConditionOnPdf
      ? (
          asset.returnCondition ??
          returnData.returnCondition ??
          ''
        ).trim() || '—'
      : '',
  ]);
  while (assetRows.length < 10) {
    assetRows.push(['', '', '']);
  }

  const halfWidth = tableWidth / 2;
  const tableMargin = { left: pageMargin, right: pageMargin };

  // Table 1: Current user | Date filed only - 2 equal columns
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(tableLineWidth);
  autoTable(doc, {
    startY,
    margin: tableMargin,
    body: [['Current user: ' + currentUserName, 'Date filed: ' + dateFiled]],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: halfWidth },
      1: { cellWidth: halfWidth },
    },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
  });

  // Table 2a: Designation through Return Type - col0 small (Received by:, Return Type: labels)
  const sectionAStartY = (doc as any).lastAutoTable.finalY;
  const labelColWidth = 38;
  const labelTableCol1Width = (tableWidth - labelColWidth) / 2;

  const processorPositionText = (returnData.processorPosition ?? '').trim();
  const tableBodyLabels: (string | { content: string; colSpan: number })[][] = [
    [{ content: 'Designation: ' + designation, colSpan: 3 }],
    [{ content: 'Department/Company: ' + deptCompany, colSpan: 3 }],
    processorPositionText
      ? [
          {
            content: 'Processor position: ' + processorPositionText,
            colSpan: 3,
          },
        ]
      : ['Received by:', { content: '', colSpan: 2 }],
    [{ content: 'Section A: Return Details', colSpan: 3 }],
    ['Return Type:', { content: '', colSpan: 2 }],
  ];

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(tableLineWidth);
  autoTable(doc, {
    startY: sectionAStartY,
    margin: tableMargin,
    body: tableBodyLabels,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: labelColWidth },
      1: { cellWidth: labelTableCol1Width },
      2: { cellWidth: labelTableCol1Width },
    },
    didParseCell: data => {
      if (data.row.index === 3) {
        data.cell.styles.fillColor = [199, 164, 100];
        data.cell.styles.textColor = [0, 0, 0];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'center';
      }
      if (
        (data.row.index === 2 || data.row.index === 4) &&
        data.column.index >= 1
      ) {
        data.cell.styles.cellPadding = 3;
      }
    },
    didDrawCell: data => {
      const rowIndex = data.row.index;
      const isReceivedBy =
        !processorPositionText && rowIndex === 2 && data.column.index >= 1;
      const isReturnType = rowIndex === 4 && data.column.index >= 1;
      if (!isReceivedBy && !isReturnType) return;
      const cell = data.cell;
      const boxSize = 3;
      const gapBetweenBoxAndLabel = 2;
      const gapBetweenGroups = 6;
      const labels = isReceivedBy ? receivedByLabels : returnTypeLabels;
      const returnTypeVal = returnData.returnType ?? '';
      const receivedByVal = (returnData.receivedBy ?? '').toLowerCase();
      doc.setDrawColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      let x = cell.x + 4;
      const textY = cell.y + (cell.height + 2) / 2;
      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        const boxY = cell.y + (cell.height - boxSize) / 2;
        doc.rect(x, boxY, boxSize, boxSize, 'S');
        const shouldCheck = isReturnType
          ? (label === 'Returned' && returnTypeVal.includes('Returned')) ||
            (label === 'Offboarding' && returnTypeVal.includes('Offboarding'))
          : receivedByVal === label.toLowerCase();
        if (shouldCheck) {
          const cx = x + boxSize / 2;
          const cy = boxY + boxSize / 2;
          const s = boxSize * 0.35;
          doc.line(cx - s, cy, cx - s * 0.25, cy + s * 0.8);
          doc.line(cx - s * 0.25, cy + s * 0.8, cx + s, cy - s);
        }
        doc.text(label, x + boxSize + gapBetweenBoxAndLabel, textY);
        const labelWidth = doc.getTextWidth(label);
        x += boxSize + gapBetweenBoxAndLabel + labelWidth + gapBetweenGroups;
      }
    },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
  });

  // Table 2b: Item | Asset code | Condition - Item and Asset code equal (larger), Condition small
  const sectionATableStartY = (doc as any).lastAutoTable.finalY;
  const conditionWidth = 35;
  const itemAssetWidth = (tableWidth - conditionWidth) / 2;

  const tableBodyItemAssetCondition: (
    | string
    | { content: string; colSpan: number }
  )[][] = [['Item', 'Asset code', 'Condition'], ...assetRows];

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(tableLineWidth);
  autoTable(doc, {
    startY: sectionATableStartY,
    margin: tableMargin,
    body: tableBodyItemAssetCondition,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: itemAssetWidth },
      1: { cellWidth: itemAssetWidth },
      2: { cellWidth: conditionWidth },
    },
    didParseCell: data => {
      if (data.row.index === 0) {
        data.cell.styles.fillColor = [199, 164, 100];
        data.cell.styles.textColor = [0, 0, 0];
      }
    },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
  });

  // Table 3: Section B - 2 equal columns; row 1 col 1 = process user signature, row 3 col 2 = Returner signature
  const sectionBStartY = (doc as any).lastAutoTable.finalY;
  const sectionBHalfWidth = tableWidth / 2;
  const hasReturnerSignature = !!returnData.signed_at;
  const hasProcessSignature = !!returnData.process_signed_at;
  const hasDeptHeadSignature = !!returnData.dept_head_signed_at;
  const hasItManagerSignature = !!returnData.it_manager_signed_at;
  const showProcessorSignatureBlock = !!returnData.showProcessorSignatureBlock;
  const sectionBManagerLabel = isAdminScope
    ? 'Admin Manager / Admin Head'
    : 'IT Manager / IT Department Head';
  const sectionBStaffLabel = isAdminScope
    ? 'Admin Staff / Admin Inventory Manager'
    : 'IT Staff / IT Inventory Manager';
  const tableBodySectionB: (string | { content: string; colSpan: number })[][] =
    [
      [{ content: 'Section B: Approvals', colSpan: 2 }],
      ['', ''],
      [sectionBManagerLabel, sectionBStaffLabel],
      ['', ''], // row 3: empty row above Returner; we draw signature block in column 2 when signed
      ["Returner's Department Head", 'Returner'],
    ];

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(tableLineWidth);
  autoTable(doc, {
    startY: sectionBStartY,
    margin: tableMargin,
    body: tableBodySectionB,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: sectionBHalfWidth },
      1: { cellWidth: sectionBHalfWidth },
    },
    didParseCell: data => {
      if (data.row.index === 0) {
        data.cell.styles.fillColor = [199, 164, 100];
        data.cell.styles.textColor = [0, 0, 0];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'center';
      }
      // Uniform height for every approval signature row so layout stays even when unsigned
      const signatureRowHeight = 32;
      if (data.row.index === 1 || data.row.index === 3) {
        data.cell.styles.minCellHeight = signatureRowHeight;
      }
    },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
    didDrawCell: data => {
      const cell = data.cell;
      const padding = 3;
      const paddingTop = 1;
      const xMin = cell.x + padding;
      const xMax = cell.x + cell.width - padding;
      const yMin = cell.y + paddingTop;
      const yMax = cell.y + cell.height - padding;
      const contentWidth = Math.max(20, xMax - xMin);
      const contentHeight = Math.max(10, yMax - yMin);

      // Row 1, column 0: IT Manager / IT Department Head signature
      if (
        hasItManagerSignature &&
        data.row.index === 1 &&
        data.column.index === 0
      ) {
        const yTop = yMin;
        const dateTimeReserved = 20;
        const gap = 2;
        const maxSigWidth = contentWidth - dateTimeReserved - gap;
        const sigWidthClamped = Math.min(88, Math.max(30, maxSigWidth));
        const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
        const xLeft = xMin;
        const dateTimeX = xLeft + sigWidthClamped + gap;
        const nameY = yTop + sigHeight - 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        const itManagerName = returnData.it_manager_user_name || '';
        if (itManagerName) {
          const nameMaxWidth = Math.max(15, contentWidth - 6);
          const nameLines = doc.splitTextToSize(itManagerName, nameMaxWidth);
          doc.text(nameLines, xMin, nameY);
        }

        const rawIt = returnData.it_manager_signed_at?.trim() ?? '';
        const itSignedDate = rawIt
          ? new Date(
              rawIt.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(rawIt)
                ? rawIt
                : rawIt.replace(' ', 'T') + 'Z'
            )
          : new Date();
        const dateStr = itSignedDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        const timeStr = itSignedDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        const dateTimeXClamped = Math.min(dateTimeX, xMax - 18);
        doc.text(dateStr, dateTimeXClamped, yTop + 4);
        doc.text(timeStr, dateTimeXClamped, yTop + 9);
        return;
      }

      // Row 1, column 1: process user (IT staff) - only draw when showProcessorSignatureBlock (after Dept Head has signed)
      if (
        showProcessorSignatureBlock &&
        data.row.index === 1 &&
        data.column.index === 1
      ) {
        const yTop = yMin;
        const dateTimeReserved = 20;
        const gap = 2;
        const maxSigWidth = contentWidth - dateTimeReserved - gap;
        const sigWidthClamped = Math.min(88, Math.max(30, maxSigWidth));
        const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
        const xLeft = xMin;
        const dateTimeX = xLeft + sigWidthClamped + gap;
        const nameY = yTop + sigHeight - 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        // Display digital initials above processor name if available
        if (returnData.process_digital_signature) {
          const initialsY = yTop + 10;
          const initialsX = xMin;
          const initialsWidth = Math.min(40, contentWidth - 6);
          const initialsHeight = 16;
          try {
            const imgData = returnData.process_digital_signature;
            if (imgData.startsWith('data:')) {
              doc.addImage(imgData, 'PNG', initialsX, initialsY, initialsWidth, initialsHeight);
            }
          } catch (err) {
            logger.error('Failed to add processor digital initials to PDF:', err);
          }
        }

        const processName = returnData.process_user_name || '';
        if (processName) {
          const nameMaxWidth = Math.max(15, contentWidth - 6);
          const nameLines = doc.splitTextToSize(processName, nameMaxWidth);
          const adjustedNameY = returnData.process_digital_signature ? nameY + 8 : nameY;
          doc.text(nameLines, xMin, adjustedNameY);
        }

        if (hasProcessSignature) {
          // process_signed_at is stored as UTC in DB (no timezone in string). Parse as UTC so local time displays correctly (e.g. 06:07 PM not 10:07 AM).
          const raw = returnData.process_signed_at?.trim() ?? '';
          const processSignedDate = raw
            ? new Date(
                raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw)
                  ? raw
                  : raw.replace(' ', 'T') + 'Z'
              )
            : new Date();
          const dateStr = processSignedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          const timeStr = processSignedDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          const dateTimeXClamped = Math.min(dateTimeX, xMax - 18);
          doc.text(dateStr, dateTimeXClamped, yTop + 4);
          doc.text(timeStr, dateTimeXClamped, yTop + 9);
        }
        return;
      }

      // Row 3, column 0: Returner's Department Head signature, date, time, name
      if (
        hasDeptHeadSignature &&
        data.row.index === 3 &&
        data.column.index === 0
      ) {
        const yTop = yMin;
        const dateTimeReserved = 20;
        const gap = 2;
        const maxSigWidth = contentWidth - dateTimeReserved - gap;
        const sigWidthClamped = Math.min(88, Math.max(30, maxSigWidth));
        const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
        const xLeft = xMin;
        const dateTimeX = xLeft + sigWidthClamped + gap;
        const nameY = yTop + sigHeight - 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        // Display digital initials above department head name if available
        if (returnData.dept_head_digital_signature) {
          // Position initials at same Y position as returner's initials (yTop + 10)
          const initialsY = yTop + 10;
          const initialsX = xMin;
          const initialsWidth = Math.min(40, contentWidth - 6);
          const initialsHeight = 16;
          // Add signature synchronously using doc.addImage for better reliability
          try {
            const imgData = returnData.dept_head_digital_signature;
            if (imgData.startsWith('data:')) {
              doc.addImage(imgData, 'PNG', initialsX, initialsY, initialsWidth, initialsHeight);
            }
          } catch (err) {
            logger.error('Failed to add department head digital initials to PDF:', err);
          }
        }

        const deptHeadName = returnData.dept_head_user_name || '';
        if (deptHeadName) {
          const nameMaxWidth = Math.max(15, contentWidth - 6);
          const nameLines = doc.splitTextToSize(deptHeadName, nameMaxWidth);
          const adjustedNameY = returnData.dept_head_digital_signature ? nameY + 8 : nameY;
          doc.text(nameLines, xMin, adjustedNameY);
        }

        const rawDept = returnData.dept_head_signed_at?.trim() ?? '';
        const deptSignedDate = rawDept
          ? new Date(
              rawDept.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(rawDept)
                ? rawDept
                : rawDept.replace(' ', 'T') + 'Z'
            )
          : new Date();
        const dateStr = deptSignedDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        const timeStr = deptSignedDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        const dateTimeXClamped = Math.min(dateTimeX, xMax - 18);
        doc.text(dateStr, dateTimeXClamped, yTop + 4);
        doc.text(timeStr, dateTimeXClamped, yTop + 9);
        return;
      }

      // Row 3, column 1: Returner signature, date, time, name
      if (
        !hasReturnerSignature ||
        data.row.index !== 3 ||
        data.column.index !== 1
      ) {
        return;
      }
      const yTop = yMin;
      const dateTimeReserved = 20;
      const gap = 2;
      const maxSigWidth = contentWidth - dateTimeReserved - gap;
      const sigWidthClamped = Math.min(88, Math.max(30, maxSigWidth));
      const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
      const xLeft = xMin;
      const dateTimeX = xLeft + sigWidthClamped + gap;
      const nameY = yTop + sigHeight - 6;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      // Display digital initials above user name if available
      if (returnData.digital_signature) {
        // Handle asynchronously without await since didDrawCell is not async
        addSignatureToPDF(doc, returnData.digital_signature, xMin, yTop + 10, Math.min(30, contentWidth - 6), 12).catch(err => {
          logger.error('Failed to add digital initials to PDF:', err);
          console.error('Failed to add digital initials to PDF:', err);
        });
      }

      const fullName = [returnData.user.first_name, returnData.user.last_name]
        .filter(Boolean)
        .join(' ');
      if (fullName) {
        const nameMaxWidth = Math.max(15, contentWidth - 6);
        const nameLines = doc.splitTextToSize(fullName, nameMaxWidth);
        // Adjust nameY position to account for digital initials
        const adjustedNameY = returnData.digital_signature ? nameY + 8 : nameY;
        doc.text(nameLines, xMin, adjustedNameY);
      }

      const signedDate = returnData.signed_at
        ? new Date(returnData.signed_at)
        : new Date();
      const dateStr = signedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const timeStr = signedDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const dateTimeXClamped = Math.min(dateTimeX, xMax - 18);
      doc.text(dateStr, dateTimeXClamped, yTop + 4);
      doc.text(timeStr, dateTimeXClamped, yTop + 9);
    },
  });

  // Document No under the table
  const docNoY = (doc as any).lastAutoTable.finalY + 8;
  const docNoText = `Document No: ${returnData.form_number || `RET-${returnData.assets[0]?.code || 'ASSET'}`} ver1 01Jan2026`;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(docNoText, 215.9 - 15, docNoY, { align: 'right' });

  return new Blob([doc.output('blob')], { type: 'application/pdf' });
};

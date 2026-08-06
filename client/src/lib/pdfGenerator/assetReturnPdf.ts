import { jsPDF } from 'jspdf';
import {
  classifyDepartmentScopeByName,
  type ClientAssetScopeType,
} from '@/lib/assetScope';
import {
  addCompanyLogoToPDF,
  addSignatureToPDF,
  autoTable,
  getCompanyAccentColor,
  getBlackCodersFooterGradient,
  isBlackCoders,
  pdfLogger as logger,
  fetchActiveCompanyForAssetReturnForm,
  fetchCompanyBrandingByName,
  sortAssetsByLast5Digits,
  PDF_SIGNATURE_MAX_HEIGHT_MM,
  PDF_SIGNATURE_MAX_WIDTH_MM,
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
    companyName?: string | null;
    companyLogoUrl?: string | null;
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

  const companyName = returnData.user.companyName;
  let companyLogo = returnData.user.companyLogoUrl;
  if (companyName) {
    const matchedBranding = await fetchCompanyBrandingByName(companyName);
    if (matchedBranding?.logo_url) {
      companyLogo = matchedBranding.logo_url;
    }
  }
  if (!companyLogo) {
    const myCompany = await fetchActiveCompanyForAssetReturnForm();
    companyLogo = myCompany?.logo_url ?? null;
  }
  const accentColor = getCompanyAccentColor(companyName);
  const isBlackCodersCompany = isBlackCoders(companyName);
  const headerFillColor: [number, number, number] = isBlackCodersCompany ? [0, 0, 0] : [accentColor.r, accentColor.g, accentColor.b];
  const headerTextColor: [number, number, number] = [255, 255, 255];

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

  await addCompanyLogoToPDF(
    doc,
    companyLogo,
    pageMargin,
    headerBoxY + 2
  );

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
  doc.setFillColor(255, 255, 255);
  doc.rect(145, 20, 55, 8, 'FD');
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
  const sortedAssets = sortAssetsByLast5Digits(returnData.assets);
  const assetRows = sortedAssets.map(asset => [
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
  const minAssetTableRows = Math.max(sortedAssets.length, 4);
  while (assetRows.length < minAssetTableRows) {
    assetRows.push(['', '', '']);
  }

  const halfWidth = tableWidth / 2;
  const tableMargin = { left: pageMargin, right: pageMargin };

  // Table 1: Current user | Date filed only - 2 equal columns
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(tableLineWidth);
  const compactTableStyles = {
    fontSize: 9,
    cellPadding: 2,
    overflow: 'linebreak' as const,
  };

  autoTable(doc, {
    startY,
    margin: tableMargin,
    body: [['Current user: ' + currentUserName, 'Date filed: ' + dateFiled]],
    theme: 'grid',
    styles: compactTableStyles,
    rowPageBreak: 'avoid',
    pageBreak: 'avoid',
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
    styles: compactTableStyles,
    rowPageBreak: 'avoid',
    pageBreak: 'avoid',
    columnStyles: {
      0: { cellWidth: labelColWidth },
      1: { cellWidth: labelTableCol1Width },
      2: { cellWidth: labelTableCol1Width },
    },
    didParseCell: data => {
      if (data.row.index === 3) {
        data.cell.styles.fillColor = headerFillColor;
        data.cell.styles.textColor = headerTextColor;
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
    styles: compactTableStyles,
    rowPageBreak: 'avoid',
    pageBreak: 'avoid',
    columnStyles: {
      0: { cellWidth: itemAssetWidth },
      1: { cellWidth: itemAssetWidth },
      2: { cellWidth: conditionWidth },
    },
    didParseCell: data => {
      if (data.row.index === 0) {
        data.cell.styles.fillColor = headerFillColor;
        data.cell.styles.textColor = headerTextColor;
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
  const hasDeptHeadSignature = !!returnData.dept_head_signed_at;
  const hasItManagerSignature = !!returnData.it_manager_signed_at;
  const showProcessorSignatureBlock = !!returnData.showProcessorSignatureBlock;
  const processUserNameForCell = (returnData.process_user_name ?? '').trim();
  const approvalSignatureRowHeight = 40;
  const approvalSignatureDownOffsetMm = 8;
  const signatureAnchorBottomY = (nameY: number) =>
    nameY - 2 + approvalSignatureDownOffsetMm;
  type PendingReturnSignature = {
    data: string;
    x: number;
    y: number;
    maxWidth: number;
    maxHeight: number;
    anchorBottomY?: number;
    pageNumber: number;
  };
  const pendingReturnSignatures: PendingReturnSignature[] = [];
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
    styles: compactTableStyles,
    rowPageBreak: 'avoid',
    pageBreak: 'avoid',
    columnStyles: {
      0: { cellWidth: sectionBHalfWidth },
      1: { cellWidth: sectionBHalfWidth },
    },
    didParseCell: data => {
      if (data.row.index === 0) {
        data.cell.styles.fillColor = headerFillColor;
        data.cell.styles.textColor = headerTextColor;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'center';
      }
      if (data.row.index === 1 || data.row.index === 3) {
        data.cell.styles.minCellHeight = approvalSignatureRowHeight;
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

      // Row 1, column 0: IT Manager / IT Department Head (matches checklist IT manager cell)
      if (
        hasItManagerSignature &&
        data.row.index === 1 &&
        data.column.index === 0
      ) {
        const yTop = yMin;
        const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
        const nameY = yTop + sigHeight - 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        const itManagerName = (returnData.it_manager_user_name || '').trim();
        if (returnData.it_manager_digital_signature) {
          pendingReturnSignatures.push({
            data: returnData.it_manager_digital_signature,
            x: cell.x + 1 - 30,
            y: yTop + 25,
            anchorBottomY: signatureAnchorBottomY(nameY),
            maxWidth: PDF_SIGNATURE_MAX_WIDTH_MM,
            maxHeight: PDF_SIGNATURE_MAX_HEIGHT_MM,
            pageNumber: data.pageNumber,
          });
        }

        if (itManagerName) {
          const nameMaxWidth = Math.max(15, contentWidth - 6);
          const nameLines = doc.splitTextToSize(itManagerName, nameMaxWidth);
          doc.text(nameLines, xMin, nameY);
        }
      }

      // Row 1, column 1: IT Staff / IT Inventory Manager (matches checklist creator cell)
      if (
        showProcessorSignatureBlock &&
        processUserNameForCell &&
        data.row.index === 1 &&
        data.column.index === 1
      ) {
        const yTop = yMin;
        const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
        const nameY = yTop + sigHeight - 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        if (returnData.process_digital_signature) {
          pendingReturnSignatures.push({
            data: returnData.process_digital_signature,
            x: cell.x + 1 - 30,
            y: yTop + 25,
            anchorBottomY: signatureAnchorBottomY(nameY),
            maxWidth: PDF_SIGNATURE_MAX_WIDTH_MM,
            maxHeight: PDF_SIGNATURE_MAX_HEIGHT_MM,
            pageNumber: data.pageNumber,
          });
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const nameMaxWidth = Math.max(15, contentWidth - 6);
        const nameLines = doc.splitTextToSize(
          processUserNameForCell,
          nameMaxWidth
        );
        doc.text(nameLines, xMin, nameY);
      }

      // Row 3, column 0: Returner's Department Head (matches checklist dept-head cell)
      if (
        hasDeptHeadSignature &&
        data.row.index === 3 &&
        data.column.index === 0
      ) {
        const yTop = yMin;
        const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
        const nameY = yTop + sigHeight - 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        const deptHeadName = (returnData.dept_head_user_name || '').trim();
        if (returnData.dept_head_digital_signature) {
          pendingReturnSignatures.push({
            data: returnData.dept_head_digital_signature,
            x: cell.x + 1 - 30,
            y: yTop + 25,
            anchorBottomY: signatureAnchorBottomY(nameY),
            maxWidth: PDF_SIGNATURE_MAX_WIDTH_MM,
            maxHeight: PDF_SIGNATURE_MAX_HEIGHT_MM,
            pageNumber: data.pageNumber,
          });
        }

        if (deptHeadName) {
          const nameMaxWidth = Math.max(15, contentWidth - 6);
          const nameLines = doc.splitTextToSize(deptHeadName, nameMaxWidth);
          doc.text(nameLines, xMin, nameY);
        }
      }

      // Row 3, column 1: Returner (matches checklist employee cell)
      if (
        hasReturnerSignature &&
        data.row.index === 3 &&
        data.column.index === 1
      ) {
        const yTop = yMin;
        const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
        const nameY = yTop + sigHeight - 6;
        const fullName = [returnData.user.first_name, returnData.user.last_name]
          .filter(Boolean)
          .join(' ');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        if (returnData.digital_signature) {
          pendingReturnSignatures.push({
            data: returnData.digital_signature,
            x: cell.x + 1 - 30,
            y: yTop + 25,
            anchorBottomY: signatureAnchorBottomY(nameY),
            maxWidth: PDF_SIGNATURE_MAX_WIDTH_MM,
            maxHeight: PDF_SIGNATURE_MAX_HEIGHT_MM,
            pageNumber: data.pageNumber,
          });
        }

        if (fullName) {
          const nameMaxWidth = Math.max(15, contentWidth - 6);
          const nameLines = doc.splitTextToSize(fullName, nameMaxWidth);
          doc.text(nameLines, xMin, nameY);
        }
      }
    },
  });

  for (const sig of pendingReturnSignatures) {
    doc.setPage(sig.pageNumber);
    await addSignatureToPDF(
      doc,
      sig.data,
      sig.x,
      sig.y,
      sig.maxWidth,
      sig.maxHeight,
      sig.anchorBottomY
    );
  }
  doc.setPage(1);

  // Document No under the table
  const docNoY = (doc as any).lastAutoTable.finalY + 8;
  const docNoText = `Document No: ${returnData.form_number || `RET-${returnData.assets[0]?.code || 'ASSET'}`} ver1 01Jan2026`;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(docNoText, 215.9 - 15, docNoY, { align: 'right' });

  // Footer bar with company accent color
  const footerY = 320;
  doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
  doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
  doc.setLineWidth(0.1);
  doc.rect(10, footerY, 195, 1, 'FD');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(6);
  doc.line(10, 324, 205, 324);

  return new Blob([doc.output('blob')], { type: 'application/pdf' });
};

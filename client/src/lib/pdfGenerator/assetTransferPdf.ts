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
  resolveCompanyBranding,
  sortAssetsByLast5Digits,
  PDF_SIGNATURE_MAX_HEIGHT_MM,
  PDF_SIGNATURE_MAX_WIDTH_MM,
} from './shared';

export interface AssetTransferData {
  form_number?: string | null;
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
  assets: Array<{
    id: string;
    code: string;
    name: string;
    category?: string;
    type?: string;
    serialNo?: string;
    transferCondition?: string;
    transferNotes?: string;
    imageUrls?: string[];
  }>;
  department: { id: string; name: string } | null;
  location: {
    id: string;
    name: string;
    floor_unit?: string;
    building?: string;
    room_name?: string;
  } | null;
  created_at: string;
  process_signed_at?: string | null;
  process_digital_signature?: string | null;
  process_user_name?: string | null;
  transferType?: string | null;
  receivedBy?: string | null;
  signed_at?: string | null;
  digital_signature?: string | null;
  new_assigned_user?: {
    first_name: string;
    last_name: string;
    email?: string;
    position?: string;
  } | null;
  new_department?: string | null;
  new_location?: string | null;
  new_room?: string | null;
  /** When true, show the processor (IT Staff) block; when false, hide it until Dept Head has signed */
  showProcessorSignatureBlock?: boolean;
  dept_head_signed_at?: string | null;
  dept_head_digital_signature?: string | null;
  dept_head_user_name?: string | null;
  it_manager_signed_at?: string | null;
  it_manager_digital_signature?: string | null;
  it_manager_user_name?: string | null;
}

export const generateAssetTransferPDF = async (
  transferData: AssetTransferData
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [215.9, 330.2],
  });

  doc.setProperties({
    title: `Asset Transfer Form - ${transferData.assets[0]?.name || 'Asset'}`,
    subject: 'Asset Transfer Form',
    author: 'Asset Management System',
    creator: 'Asset Management System',
  });

  const companyBranding = await resolveCompanyBranding({
    name: transferData.user.companyName,
    logo_url: transferData.user.companyLogoUrl,
  });
  const accentColor = getCompanyAccentColor(companyBranding?.name);
  const isBlackCodersCompany = isBlackCoders(companyBranding?.name);
  const headerFillColor: [number, number, number] = isBlackCodersCompany ? [0, 0, 0] : [accentColor.r, accentColor.g, accentColor.b];
  const headerTextColor: [number, number, number] = [255, 255, 255];
  const formNumber = transferData.form_number || 'Transfer Form';
  const pageMargin = 15;
  const tableWidth = 215.9 - pageMargin * 2;
  const tableLineWidth = 0.35;
  const headerBoxHeight = 40;
  const headerBoxY = 8;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(tableLineWidth);
  doc.setFillColor(255, 255, 255);
  doc.rect(pageMargin, headerBoxY, tableWidth, headerBoxHeight, 'FD');

  await addCompanyLogoToPDF(
    doc,
    companyBranding?.logo_url,
    pageMargin,
    headerBoxY + 2
  );

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
  doc.text('ASSET TRANSFER FORM', headerCenterX, 35, { align: 'center' });

  // Determine IT/Admin scope based primarily on department name, falling back to asset category when needed
  let transferScope: ClientAssetScopeType = classifyDepartmentScopeByName(
    transferData.department?.name
  );
  if (transferScope === 'Other' && transferData.assets[0]?.category) {
    transferScope = classifyDepartmentScopeByName(
      transferData.assets[0].category
    );
  }
  const isAdminScopeTransfer = transferScope === 'Admin';

  const departmentName = isAdminScopeTransfer
    ? 'Administration Department'
    : 'Information Technology Department';

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(departmentName, headerCenterX, 41, {
    align: 'center',
  });

  const startY = headerBoxY + headerBoxHeight;
  const transferrerName =
    `${transferData.user.first_name || ''} ${transferData.user.last_name || ''}`.trim();
  const dateFiled = transferData.created_at
    ? new Date(transferData.created_at).toLocaleDateString()
    : '—';
  const designation = transferData.user.position ?? '—';
  const deptCompany = transferData.department?.name || '—';
  const transfereeName = transferData.new_assigned_user
    ? `${transferData.new_assigned_user.first_name || ''} ${transferData.new_assigned_user.last_name || ''}`.trim() ||
      '—'
    : '—';
  const transfereeDesignation = transferData.new_assigned_user?.position ?? '—';
  const transfereeDept = transferData.new_department ?? '—';
  const receivedByLabels = isAdminScopeTransfer
    ? ['Admin Staff', 'Admin Officer', 'Admin Manager', 'Admin Helpdesk']
    : ['IT Staff', 'IT Officer', 'IT Manager', 'IT helpdesk'];
  const transferTypeLabels = ['Transfer', 'Transfer Offboarding'];

  const sortedAssets = sortAssetsByLast5Digits(transferData.assets);
  const assetRows = sortedAssets.map(asset => [
    asset.name || '—',
    asset.code || '—',
    asset.transferCondition ?? '—',
  ]);
  while (assetRows.length < 10) {
    assetRows.push(['', '', '']);
  }

  const halfWidth = tableWidth / 2;
  const tableMargin = { left: pageMargin, right: pageMargin };

  autoTable(doc, {
    startY,
    margin: tableMargin,
    body: [['Transferrer: ' + transferrerName, 'Date filed: ' + dateFiled]],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: halfWidth }, 1: { cellWidth: halfWidth } },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
  });

  const sectionAStartY = (doc as any).lastAutoTable.finalY;
  const labelColWidth = 38;
  const labelTableCol1Width = (tableWidth - labelColWidth) / 2;

  const tableBodyLabels: (string | { content: string; colSpan: number })[][] = [
    [{ content: 'Designation: ' + designation, colSpan: 3 }],
    [{ content: 'Department/Company: ' + deptCompany, colSpan: 3 }],
    ['Received by:', { content: '', colSpan: 2 }],
    [{ content: 'Section A: Transfer Details', colSpan: 3 }],
    ['Transfer Type:', { content: '', colSpan: 2 }],
    ['Transfer to:', { content: transfereeName, colSpan: 2 }],
    ['Designation:', { content: transfereeDesignation, colSpan: 2 }],
    ['Department Company:', { content: transfereeDept, colSpan: 2 }],
  ];

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
        data.cell.styles.fillColor = headerFillColor;
        data.cell.styles.textColor = headerTextColor;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'center';
      }
    },
    didDrawCell: data => {
      const rowIndex = data.row.index;
      const isReceivedBy = rowIndex === 2 && data.column.index >= 1;
      const isTransferType = rowIndex === 4 && data.column.index >= 1;
      if (!isReceivedBy && !isTransferType) return;
      const cell = data.cell;
      const boxSize = 3;
      const gapBetweenBoxAndLabel = 2;
      const gapBetweenGroups = 6;
      const labels = isReceivedBy ? receivedByLabels : transferTypeLabels;
      const transferTypeVal = (transferData.transferType ?? '').toLowerCase();
      const receivedByVal = (transferData.receivedBy ?? '').toLowerCase();
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
        const shouldCheck = isTransferType
          ? transferTypeVal.trim() === label.toLowerCase().trim()
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

  const sectionATableStartY = (doc as any).lastAutoTable.finalY;
  const conditionWidth = 28;
  const itemWidth = (tableWidth - conditionWidth) / 2;

  const tableBodyItemCondition: (
    | string
    | { content: string; colSpan: number }
  )[][] = [['Item', 'Asset code', 'Condition'], ...assetRows];

  autoTable(doc, {
    startY: sectionATableStartY,
    margin: tableMargin,
    body: tableBodyItemCondition,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: itemWidth },
      1: { cellWidth: itemWidth },
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

  const sectionBStartY = (doc as any).lastAutoTable.finalY;
  const sectionBHalfWidth = tableWidth / 2;
  const hasTransferrerSignature = !!transferData.signed_at;
  const hasProcessSignature = !!transferData.process_signed_at;
  const hasDeptHeadSignature = !!transferData.dept_head_signed_at;
  const hasItManagerSignature = !!transferData.it_manager_signed_at;
  const showProcessorSignatureBlock =
    !!transferData.showProcessorSignatureBlock;
  const processUserNameForCell = (transferData.process_user_name ?? '').trim();
  const processInitial = processUserNameForCell
    ? processUserNameForCell.charAt(0).toUpperCase()
    : '';
  const approvalSignatureDownOffsetMm = 8;
  const signatureAnchorBottomY = (nameY: number) =>
    nameY - 2 + approvalSignatureDownOffsetMm;
  type PendingTransferSignature = {
    data: string;
    x: number;
    y: number;
    maxWidth: number;
    maxHeight: number;
    anchorBottomY?: number;
    pageNumber: number;
  };
  const pendingTransferSignatures: PendingTransferSignature[] = [];

  const sectionBManagerLabel = isAdminScopeTransfer
    ? 'Admin Manager / Admin Head'
    : 'IT Manager / IT Department Head';
  const sectionBStaffLabel = isAdminScopeTransfer
    ? 'Admin Staff / Admin Inventory Manager'
    : 'IT Staff / IT Inventory Manager';

  const tableBodySectionB: (string | { content: string; colSpan: number })[][] =
    [
      [{ content: 'Section B: Approvals', colSpan: 2 }],
      ['', ''],
      [sectionBManagerLabel, sectionBStaffLabel],
      ['', ''],
      ['Transferrer Department Head', 'Transferrer'],
    ];

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
        data.cell.styles.fillColor = headerFillColor;
        data.cell.styles.textColor = headerTextColor;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'center';
      }
      // Uniform height for every approval signature row so layout matches unsigned vs signed (same as return form Section B)
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

      // Row 1, column 0: IT Manager / IT Department Head
      if (
        hasItManagerSignature &&
        data.row.index === 1 &&
        data.column.index === 0
      ) {
        const yTop = yMin;
        const dateTimeReserved = 20;
        const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
        const dateTimeX = xMax - dateTimeReserved;
        const nameY = yTop + sigHeight - 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        const itManagerName = (transferData.it_manager_user_name || '').trim();
        if (transferData.it_manager_digital_signature) {
          pendingTransferSignatures.push({
            data: transferData.it_manager_digital_signature,
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

        const rawIt = transferData.it_manager_signed_at?.trim() ?? '';
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
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(dateStr, dateTimeX, yTop + 4);
        doc.text(timeStr, dateTimeX, yTop + 9);
        return;
      }

      // Row 1, column 1: IT Staff / IT Inventory Manager (matches return form processor cell)
      if (
        showProcessorSignatureBlock &&
        (processUserNameForCell || transferData.process_digital_signature) &&
        data.row.index === 1 &&
        data.column.index === 1
      ) {
        const yTop = yMin;
        const dateTimeReserved = 20;
        const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
        const dateTimeX = xMax - dateTimeReserved;
        const nameY = yTop + sigHeight - 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        if (transferData.process_digital_signature) {
          pendingTransferSignatures.push({
            data: transferData.process_digital_signature,
            x: cell.x + 1 - 30,
            y: yTop + 25,
            anchorBottomY: signatureAnchorBottomY(nameY),
            maxWidth: PDF_SIGNATURE_MAX_WIDTH_MM,
            maxHeight: PDF_SIGNATURE_MAX_HEIGHT_MM,
            pageNumber: data.pageNumber,
          });
        } else if (processInitial) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(
            processInitial,
            xMin,
            yTop + 10 + approvalSignatureDownOffsetMm
          );
        }

        if (processUserNameForCell) {
          const nameMaxWidth = Math.max(15, contentWidth - 6);
          const nameLines = doc.splitTextToSize(
            processUserNameForCell,
            nameMaxWidth
          );
          doc.text(nameLines, xMin, nameY);
        }

        if (hasProcessSignature) {
          const raw = transferData.process_signed_at?.trim() ?? '';
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
          doc.text(dateStr, dateTimeX, yTop + 4);
          doc.text(timeStr, dateTimeX, yTop + 9);
        }
        return;
      }

      // Row 3, column 0: Transferrer Department Head (matches return form dept-head cell)
      if (
        hasDeptHeadSignature &&
        data.row.index === 3 &&
        data.column.index === 0
      ) {
        const yTop = yMin;
        const dateTimeReserved = 20;
        const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
        const dateTimeX = xMax - dateTimeReserved;
        const nameY = yTop + sigHeight - 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        const deptHeadName = (transferData.dept_head_user_name || '').trim();
        if (transferData.dept_head_digital_signature) {
          pendingTransferSignatures.push({
            data: transferData.dept_head_digital_signature,
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

        const rawDept = transferData.dept_head_signed_at?.trim() ?? '';
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
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(dateStr, dateTimeX, yTop + 4);
        doc.text(timeStr, dateTimeX, yTop + 9);
        return;
      }

      // Row 3, column 1: Transferrer (matches return form returner cell)
      if (
        hasTransferrerSignature &&
        data.row.index === 3 &&
        data.column.index === 1
      ) {
        const yTop = yMin;
        const dateTimeReserved = 20;
        const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
        const dateTimeX = xMax - dateTimeReserved;
        const nameY = yTop + sigHeight - 6;
        const fullName = [
          transferData.user.first_name,
          transferData.user.last_name,
        ]
          .filter(Boolean)
          .join(' ');
        const transferrerInitial = fullName
          ? fullName.charAt(0).toUpperCase()
          : '';

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        if (transferData.digital_signature) {
          pendingTransferSignatures.push({
            data: transferData.digital_signature,
            x: cell.x + 1 - 30,
            y: yTop + 25,
            anchorBottomY: signatureAnchorBottomY(nameY),
            maxWidth: PDF_SIGNATURE_MAX_WIDTH_MM,
            maxHeight: PDF_SIGNATURE_MAX_HEIGHT_MM,
            pageNumber: data.pageNumber,
          });
        } else if (transferrerInitial) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(
            transferrerInitial,
            xMin,
            yTop + 10 + approvalSignatureDownOffsetMm
          );
        }

        if (fullName) {
          const nameMaxWidth = Math.max(15, contentWidth - 6);
          const nameLines = doc.splitTextToSize(fullName, nameMaxWidth);
          doc.text(nameLines, xMin, nameY);
        }

        const rawSigned = transferData.signed_at?.trim() ?? '';
        const signedDate = rawSigned
          ? new Date(
              rawSigned.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(rawSigned)
                ? rawSigned
                : rawSigned.replace(' ', 'T') + 'Z'
            )
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
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(dateStr, dateTimeX, yTop + 4);
        doc.text(timeStr, dateTimeX, yTop + 9);
      }
    },
  });

  for (const sig of pendingTransferSignatures) {
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

  const docNoY = (doc as any).lastAutoTable.finalY + 8;
  const docNoText = `Document No: ${transferData.form_number || 'TRF'} ver1 01Jan2026`;
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

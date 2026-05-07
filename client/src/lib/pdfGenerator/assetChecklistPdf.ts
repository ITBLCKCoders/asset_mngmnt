import { jsPDF } from 'jspdf';
import {
  addCompanyLogoToPDF,
  autoTable,
  getCompanyAccentColor,
  getBlackCodersFooterGradient,
  isBlackCoders,
  resolveCompanyBranding,
  sortAssetsByLast5Digits,
} from './shared';

export interface AssetChecklistData {
  id: string;
  form_number?: string | null;
  assignment_id: string;
  employee_id: string;
  employee_name: string;
  employee_designation?: string | null;
  employee_department?: string | null;
  employee_company?: string | null;
  type_onboarding: boolean;
  type_offboarding: boolean;
  received_by?: string | null;
  checklist_data: any;
  remarks?: string | null;
  created_at: string;
  created_by?: string | null;
  creator_name?: string | null;
  creator_digital_signature?: string | null;
  asset_label?: string;
  employee_company_logo_url?: string | null;
}

export const generateAssetChecklistPDF = async (
  checklistData: AssetChecklistData
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [215.9, 330.2], // 8.5 x 13 inches in millimeters
  });

  doc.setProperties({
    title: `Asset Checklist - ${checklistData.employee_name}`,
    subject: 'Asset Checklist Form',
    author: 'Asset Management System',
    creator: 'Asset Management System',
  });

  const pageMargin = 15;
  const tableWidth = 215.9 - pageMargin * 2;
  const tableLineWidth = 0.35;
  const headerBoxHeight = 40;
  const headerBoxY = 8;
  const companyBranding = await resolveCompanyBranding({
    name: checklistData.employee_company,
    logo_url: checklistData.employee_company_logo_url,
  });
  const accentColor = getCompanyAccentColor(companyBranding?.name);
  const isBlackCodersCompany = isBlackCoders(companyBranding?.name);
  const headerFillColor: [number, number, number] = isBlackCodersCompany ? [0, 0, 0] : [accentColor.r, accentColor.g, accentColor.b];
  const headerTextColor: [number, number, number] = [255, 255, 255];

  // Header box
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

  // FOR INTERNAL USE ONLY box and form number box
  const internalBoxW = 55;
  const internalBoxGapFromRight = 2;
  const internalBoxX = pageMargin + tableWidth - internalBoxGapFromRight - internalBoxW;
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(tableLineWidth);
  doc.setFillColor(255, 255, 255);
  doc.rect(internalBoxX, headerBoxY + 2, internalBoxW, 8, 'FD');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('FOR INTERNAL USE ONLY', internalBoxX + internalBoxW / 2, headerBoxY + 8, { align: 'center' });
  
  const codeBoxH = 10;
  doc.setDrawColor(255, 0, 0);
  doc.setLineWidth(tableLineWidth);
  doc.setFillColor(255, 255, 255);
  doc.rect(internalBoxX, headerBoxY + 12, internalBoxW, codeBoxH, 'FD');
  doc.setTextColor(255, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const formNumber = checklistData.form_number || `CHK-${checklistData.assignment_id}`;
  doc.text(formNumber, internalBoxX + internalBoxW / 2, headerBoxY + 19, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  const headerCenterX = pageMargin + tableWidth / 2;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSET CHECKLIST', headerCenterX, 35, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Information Technology Department', headerCenterX, 41, { align: 'center' });

  const startY = headerBoxY + headerBoxHeight;

  // Table 1: Type and Date
  const halfWidth = tableWidth / 2;
  const tableMargin = { left: pageMargin, right: pageMargin };

  const dateFiled = checklistData.created_at
    ? new Date(checklistData.created_at).toLocaleDateString()
    : '—';

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(tableLineWidth);
  autoTable(doc, {
    startY,
    margin: tableMargin,
    body: [['Type: ' + (checklistData.type_onboarding ? 'Onboarding ' : '') + (checklistData.type_offboarding ? 'Offboarding' : ''), 'Date: ' + dateFiled]],
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

  // Table 2: Employee information
  const sectionAStartY = (doc as any).lastAutoTable.finalY;
  const employeeInfoColWidth = tableWidth / 2;

  const tableBodyLabels = [
    ['Employee: ' + checklistData.employee_name, 'Designation: ' + (checklistData.employee_designation || '—')],
    [{ content: 'Department / Company: ' + (checklistData.employee_department || '—'), colSpan: 2 }],
    [{ content: 'Received by: ' + (checklistData.received_by || '—'), colSpan: 2 }],
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
      0: { cellWidth: employeeInfoColWidth },
      1: { cellWidth: employeeInfoColWidth },
    },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
  });

  // Table 3: Checklist items
  const sectionATableStartY = (doc as any).lastAutoTable.finalY;
  const sectionWidth = 62;
  const statusWidth = 42;
  const itemWidth = tableWidth - sectionWidth - statusWidth;
  const checklist = checklistData.checklist_data || {};
  const statusText = (value: any) =>
    value === true ? '[x] Yes   [ ] No' : value === false ? '[ ] Yes   [x] No' : '[ ] Yes   [ ] No';
  const sectionDefinitions = [
    {
      label: 'Firmware & Hardware Validation',
      key: 'firmwareHardwareValidation',
      items: [
        ['updateBios', 'Update BIOS'],
        ['setBiosPassword', 'Set BIOS password'],
        ['enableSecureBoot', 'Enable Secure Boot'],
        ['enableTpm', 'Enable TPM'],
      ],
    },
    {
      label: 'OS Preparation & Cleanup',
      key: 'osPreparationCleanup',
      items: [
        ['removeBloatware', 'Remove bloatware'],
        ['updateWindows', 'Update Windows'],
        ['installDrivers', 'Install drivers'],
      ],
    },
    {
      label: 'Endpoint Protection',
      key: 'endpointProtection',
      items: [
        ['disableUsbStorage', 'Disable USB storage'],
        ['enableBitLocker', 'Enable BitLocker'],
        ['installAntivirusEset', 'Install antivirus ESET'],
        ['enableRealTimeProtection', 'Enable real-time protection'],
      ],
    },
    {
      label: 'User & Access Control',
      key: 'userAccessControl',
      items: [
        ['createItAdminAndStandardUser', 'Create IT admin and standard user'],
        ['disableGuestAccounts', 'Disable guest accounts'],
      ],
    },
    {
      label: 'Application Control',
      key: 'applicationControl',
      items: [['installApprovedSoftwareOnly', 'Install approved software only']],
    },
    {
      label: 'System Identity & Naming',
      key: 'systemIdentityNaming',
      items: [
        ['applyDeviceNamingStandard', 'Apply device naming standard'],
        ['recordSpecsSerialsMacUserBitlockerKeyWarranty', 'Record specs, serials, MAC, user, BitLocker key, warranty'],
      ],
    },
    {
      label: 'Microsoft 365 Setup',
      key: 'microsoft365Setup',
      items: [
        ['installM365', 'Install M365'],
        ['loginUser', 'Login user'],
      ],
    },
    {
      label: 'Network Configuration',
      key: 'networkConfiguration',
      items: [
        ['connectToNetwork', 'Connect to network'],
        ['registerMacOnFirewall', 'Register MAC on firewall'],
      ],
    },
    {
      label: 'Patch & Update Management',
      key: 'patchUpdateManagement',
      items: [
        ['enableUpdates', 'Enable updates'],
        ['applyUpdatePolicy', 'Apply update policy'],
      ],
    },
  ];
  const checklistRows: any[] = [
    [{ content: 'Section A: Checklist', colSpan: 3 }],
    [{ content: 'Item', colSpan: 2 }, 'Status'],
    ['Asset:', { content: checklistData.asset_label || '—', colSpan: 2 }],
  ];

  sectionDefinitions.forEach(section => {
    section.items.forEach(([itemKey, itemLabel], itemIndex) => {
      const row: any[] = [];
      if (itemIndex === 0) {
        row.push({ content: section.label, rowSpan: section.items.length });
      }
      row.push(itemLabel, statusText(checklist?.[section.key]?.[itemKey]));
      checklistRows.push(row);
    });
  });

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(tableLineWidth);
  autoTable(doc, {
    startY: sectionATableStartY,
    margin: tableMargin,
    body: checklistRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: sectionWidth },
      1: { cellWidth: itemWidth },
      2: { cellWidth: statusWidth },
    },
    didParseCell: data => {
      if (data.row.index === 0) {
        data.cell.styles.fillColor = headerFillColor;
        data.cell.styles.textColor = headerTextColor;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'center';
      }
      if (data.row.index === 1) {
        data.cell.styles.fillColor = [235, 235, 235];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'center';
      }
      if (data.column.index === 0 && data.row.index > 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.valign = 'middle';
      }
    },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
  });

  // Table 4: Remarks
  const remarksStartY = (doc as any).lastAutoTable.finalY;
  const remarksRows = [
    [{ content: 'Section B: Remarks', colSpan: 2 }],
    [{ content: checklistData.remarks || 'No remarks', colSpan: 2, styles: { minCellHeight: 40 } }],
  ];

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(tableLineWidth);
  autoTable(doc, {
    startY: remarksStartY,
    margin: tableMargin,
    body: remarksRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: tableWidth / 2 },
      1: { cellWidth: tableWidth / 2 },
    },
    didParseCell: data => {
      if (data.row.index === 0) {
        data.cell.styles.fillColor = headerFillColor;
        data.cell.styles.textColor = headerTextColor;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'center';
      }
    },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
  });

  // Table 5: Approvals (Section C)
  const approvalsStartY = (doc as any).lastAutoTable.finalY;
  const approvalHalfWidth = tableWidth / 2;
  
  const creatorName = checklistData.creator_name || '';
  const creatorDigitalSignature = checklistData.creator_digital_signature || '';
  const creatorInitial = creatorName ? creatorName.charAt(0).toUpperCase() : '';
  const createdDate = checklistData.created_at
    ? new Date(checklistData.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '';
  const createdTime = checklistData.created_at
    ? new Date(checklistData.created_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';
  
  const approvalRows = [
    [{ content: 'Section C: Approvals', colSpan: 2 }],
    ['', ''],
    ['IT Manager / IT Department Head', 'IT Staff / IT Inventory Manager'],
    ['', ''],
    ["Employee's Department Head", 'Employee'],
  ];

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(tableLineWidth);
  autoTable(doc, {
    startY: approvalsStartY,
    margin: tableMargin,
    body: approvalRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: approvalHalfWidth },
      1: { cellWidth: approvalHalfWidth },
    },
    didParseCell: data => {
      if (data.row.index === 0) {
        data.cell.styles.fillColor = headerFillColor;
        data.cell.styles.textColor = headerTextColor;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'center';
      }
      if (data.row.index === 1 || data.row.index === 3) {
        data.cell.styles.minCellHeight = 32;
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

      // Row 1, column 1: IT Staff / IT Inventory Manager (creator signature)
      if (creatorName && data.row.index === 1 && data.column.index === 1) {
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

        // Display digital signature image at the top, or typed initial as fallback
        if (creatorDigitalSignature && creatorDigitalSignature.startsWith('data:')) {
          // Drawn signature (image)
          const initialsY = yTop + 10;
          const initialsX = xMin;
          const initialsWidth = Math.min(40, contentWidth - 6);
          const initialsHeight = 16;
          try {
            doc.addImage(creatorDigitalSignature, 'PNG', initialsX, initialsY, initialsWidth, initialsHeight);
          } catch (err) {
            console.error('Failed to add creator digital signature to PDF:', err);
          }
        } else if (creatorDigitalSignature) {
          // Typed initial (text stored in digital_signature field)
          const initialsY = yTop + 10;
          const initialsX = xMin;
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(creatorDigitalSignature, initialsX, initialsY);
        } else if (creatorInitial) {
          // Fallback to calculated initial from name
          const initialsY = yTop + 10;
          const initialsX = xMin;
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(creatorInitial, initialsX, initialsY);
        }

        // Display creator name at the bottom
        if (creatorName) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          const nameMaxWidth = Math.max(15, contentWidth - 6);
          const nameLines = doc.splitTextToSize(creatorName, nameMaxWidth);
          const adjustedNameY = (creatorDigitalSignature || creatorInitial) ? nameY + 8 : nameY;
          doc.text(nameLines, xMin, adjustedNameY);
        }

        // Display date and time on the right
        if (createdDate && createdTime) {
          const dateTimeXClamped = Math.min(dateTimeX, xMax - 18);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(createdDate, dateTimeXClamped, yTop + 4);
          doc.text(createdTime, dateTimeXClamped, yTop + 9);
        }
      }
    },
  });

  // Document No
  const docNoY = (doc as any).lastAutoTable.finalY + 8;
  const docNoText = `Document No: ${formNumber} ver1 01Jan2026`;
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

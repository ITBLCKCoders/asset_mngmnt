import { jsPDF } from 'jspdf';
import {
  autoTable,
  fetchActiveCompanyForAssetReturnForm,
  pdfLogger as logger,
} from './shared';

export interface AssetChecklistData {
  id: string;
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
  asset_label?: string;
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
  const activeCompany = await fetchActiveCompanyForAssetReturnForm();

  // Header box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(tableLineWidth);
  doc.setFillColor(255, 255, 255);
  doc.rect(pageMargin, headerBoxY, tableWidth, headerBoxHeight, 'FD');

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
          blob.type === 'image/png'
            ? 'PNG'
            : blob.type === 'image/webp'
              ? 'WEBP'
              : 'JPEG';
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        doc.addImage(dataUrl, format, pageMargin + 4, headerBoxY + 7, 28, 26);
      }
    } catch {
      logger.debug('Logo not found on checklist form, continuing without it');
    }
  }

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
  doc.text(`CHK-${checklistData.assignment_id}`, internalBoxX + internalBoxW / 2, headerBoxY + 19, { align: 'center' });
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
  const labelColWidth = 38;
  const labelTableCol1Width = (tableWidth - labelColWidth) / 2;

  const tableBodyLabels = [
    [{ content: 'Employee: ' + checklistData.employee_name, colSpan: 3 }],
    [{ content: 'Name: ' + checklistData.employee_name, colSpan: 3 }],
    [{ content: 'Designation: ' + (checklistData.employee_designation || '—'), colSpan: 3 }],
    [{ content: 'Department / Company: ' + (checklistData.employee_department || '—'), colSpan: 3 }],
    [{ content: 'Received by: ' + (checklistData.received_by || '—'), colSpan: 3 }],
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
        data.cell.styles.fillColor = [199, 164, 100];
        data.cell.styles.textColor = [0, 0, 0];
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
        data.cell.styles.fillColor = [199, 164, 100];
        data.cell.styles.textColor = [0, 0, 0];
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
  const approvalRows = [
    [{ content: 'Section C: Approvals', colSpan: 2 }],
    ['', ''],
    ['IT Manager / IT Department Head', 'IT Staff / IT Inventory Manager'],
    ['', ''],
    ['', ''],
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
      0: { cellWidth: tableWidth / 2 },
      1: { cellWidth: tableWidth / 2 },
    },
    didParseCell: data => {
      if (data.row.index === 0) {
        data.cell.styles.fillColor = [199, 164, 100];
        data.cell.styles.textColor = [0, 0, 0];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'center';
      }
      if (data.row.index === 2) {
        data.cell.styles.minCellHeight = 32;
      }
    },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
  });

  // Document No
  const docNoY = (doc as any).lastAutoTable.finalY + 8;
  const docNoText = `Document No: CHK-${checklistData.assignment_id} ver1 01Jan2026`;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(docNoText, 215.9 - 15, docNoY, { align: 'right' });

  return new Blob([doc.output('blob')], { type: 'application/pdf' });
};

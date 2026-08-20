import { jsPDF } from 'jspdf';
import {
  addCompanyLogoToPDF,
  addSignatureToPDF,
  autoTable,
  PDF_SIGNATURE_MAX_HEIGHT_MM,
  PDF_SIGNATURE_MAX_WIDTH_MM,
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
  employee_signed_at?: string | null;
  employee_digital_signature?: string | null;
  dept_head_signed_at?: string | null;
  dept_head_signed_by?: string | null;
  dept_head_digital_signature?: string | null;
  dept_head_name?: string | null;
  dept_head_position?: string | null;
  sub_approver_1_signed_at?: string | null;
  sub_approver_1_signed_by?: string | null;
  sub_approver_1_digital_signature?: string | null;
  sub_approver_1_name?: string | null;
  sub_approver_1_position?: string | null;
  it_manager_signed_at?: string | null;
  it_manager_signed_by?: string | null;
  it_manager_digital_signature?: string | null;
  it_manager_name?: string | null;
  it_manager_position?: string | null;
  asset_label?: string;
  employee_company_logo_url?: string | null;
  asset?: {
    id: string;
    code?: string | null;
    name?: string | null;
  } | null;
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
  const onboardingSectionDefinitions: {
    label: string;
    key: string;
    items: [string, string][];
  }[] = [
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

  const offboardingSectionDefinitions: {
    label: string;
    key: string;
    items: [string, string][];
  }[] = [
    {
      label: 'Device Inventory & Verification',
      key: 'deviceInventoryVerification',
      items: [
        ['verifyAssetTagSerial', 'Verify asset tag / serial number matches records'],
        ['inspectPhysicalCondition', 'Inspect physical condition (screen, keyboard, chassis, ports)'],
        ['checkAccessories', 'Check for accessories: charger, bag, mouse, others'],
        ['confirmDeviceFunctional', 'Confirm device is powered on and functional'],
      ],
    },
    {
      label: 'Data & Account Handover',
      key: 'dataAccountHandover',
      items: [
        ['verifyBackup', 'Verify user has backed up personal/work files'],
        ['confirmSignOutM365', 'Confirm sign-out from Microsoft 365 / Outlook'],
        ['removePersonalAccounts', 'Remove personal accounts (OneDrive, email, browser profiles)'],
        ['clearBrowserData', 'Clear browser saved passwords and history'],
        ['signOutThirdPartyApps', 'Sign out from all third-party apps (Zoom, Teams, etc.)'],
      ],
    },
    {
      label: 'Security and Access Revocation',
      key: 'securityAccessRevocation',
      items: [
        ['disableDeleteLocalAccount', 'Disable or delete user local account'],
        ['revokeM365License', 'Revoke M365 license / disable Azure AD account'],
        ['removeDeviceFromNetwork', 'Remove device from company network / firewall MAC list'],
        ['rotateBitLockerKey', 'Rotate BitLocker Recovery Key after return'],
        ['deactivateVpnCredentials', 'Confirm VPN credentials are deactivated'],
        ['performFactoryReset', 'Perform Windows factory reset or re-image device'],
        ['applyOsUpdates', 'Re-apply OS updates after reset'],
        ['verifyBiosSecureBoot', 'Verify BIOS password and Secure Boot still enabled'],
        ['confirmBitLockerReEnabled', 'Confirm BitLocker re-enabled post-reset'],
        ['removeDeviceNaming', 'Remove device name from naming registry (CMTH-LPTP-xxxx)'],
        ['updateCmdbAssetTracker', 'Update CMDB / asset tracker (mark as returned)'],
        ['recordReturnDateCondition', 'Record return date, condition, and receiving IT staff'],
        ['archiveBitLockerKey', 'Archive BitLocker Recovery Key or mark as reset'],
        ['updateNetworkFirewallRecords', 'Update network/firewall records to remove MAC address'],
      ],
    },
  ];

  const isOffboardingChecklist = checklistData.type_offboarding === true;
  const sectionDefinitions = isOffboardingChecklist ? offboardingSectionDefinitions : onboardingSectionDefinitions;
  const sectionLabel = isOffboardingChecklist ? 'Section A: Return & Offboarding Checklist' : 'Section A: Checklist';

  const checklistRows: any[] = [
    [{ content: sectionLabel, colSpan: 3 }],
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

  /** Fixed approval row height — digital signature is drawn last and may overlap */
  const approvalSignatureRowHeight = 40;
  /** Push digital signatures lower within each approval cell (mm) */
  const approvalSignatureDownOffsetMm = 8;
  const signatureAnchorBottomY = (nameY: number) =>
    nameY - 2 + approvalSignatureDownOffsetMm;

  const employeeName = checklistData.employee_name || '';
  const employeeDigitalSignature =
    checklistData.employee_digital_signature || '';
  const employeeInitial = employeeName
    ? employeeName.charAt(0).toUpperCase()
    : '';
  const employeeSignedDate = checklistData.employee_signed_at
    ? new Date(checklistData.employee_signed_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '';
  const employeeSignedTime = checklistData.employee_signed_at
    ? new Date(checklistData.employee_signed_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const deptHeadName = checklistData.dept_head_name || '';
  const deptHeadDigitalSignature =
    checklistData.dept_head_digital_signature || '';
  const deptHeadInitial = deptHeadName
    ? deptHeadName.charAt(0).toUpperCase()
    : '';
  const subApprover1Signed = !!checklistData.sub_approver_1_signed_at;
  const displayDeptHeadName = subApprover1Signed
    ? (checklistData.sub_approver_1_name || '') || deptHeadName
    : deptHeadName;
  const displayDeptHeadPosition = subApprover1Signed
    ? (checklistData.sub_approver_1_position || '').trim()
    : (checklistData.dept_head_position || '').trim();
  const displayDeptHeadDigitalSignature = subApprover1Signed
    ? (checklistData.sub_approver_1_digital_signature || '') ||
      deptHeadDigitalSignature
    : deptHeadDigitalSignature;
  const displayDeptHeadSignedAt = subApprover1Signed
    ? checklistData.sub_approver_1_signed_at
    : checklistData.dept_head_signed_at;
  const deptHeadSignedDate = displayDeptHeadSignedAt
    ? new Date(displayDeptHeadSignedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '';
  const deptHeadSignedTime = displayDeptHeadSignedAt
    ? new Date(displayDeptHeadSignedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const itManagerName = checklistData.it_manager_name || '';
  const itManagerDigitalSignature =
    checklistData.it_manager_digital_signature || '';
  const itManagerInitial = itManagerName
    ? itManagerName.charAt(0).toUpperCase()
    : '';
  const itManagerSignedDate = checklistData.it_manager_signed_at
    ? new Date(checklistData.it_manager_signed_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '';
  const itManagerSignedTime = checklistData.it_manager_signed_at
    ? new Date(checklistData.it_manager_signed_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  type PendingChecklistSignature = {
    data: string;
    x: number;
    y: number;
    maxWidth: number;
    maxHeight: number;
    anchorBottomY?: number;
  };
  const pendingSignatures: PendingChecklistSignature[] = [];

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

      // Row 1, column 0: IT Manager / IT Department Head
      if (data.row.index === 1 && data.column.index === 0) {
        const yTop = yMin;
        const dateTimeReserved = 20;
        const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
        const dateTimeX = xMax - dateTimeReserved;
        const nameY = yTop + sigHeight - 6;
        const displayItManagerName = itManagerName || '';

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        if (itManagerDigitalSignature) {
          pendingSignatures.push({
            data: itManagerDigitalSignature,
            x: cell.x + 1 - 30,
            y: yTop + 25,
            anchorBottomY: signatureAnchorBottomY(nameY),
            maxWidth: PDF_SIGNATURE_MAX_WIDTH_MM,
            maxHeight: PDF_SIGNATURE_MAX_HEIGHT_MM,
          });
        } else if (itManagerInitial) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(itManagerInitial, xMin, yTop + 10 + approvalSignatureDownOffsetMm);
        }

        if (displayItManagerName) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          const nameMaxWidth = Math.max(15, contentWidth - 6);
          const nameLines = doc.splitTextToSize(
            displayItManagerName,
            nameMaxWidth
          );
          doc.text(nameLines, xMin, nameY);
          // IT Manager position
          const itManagerPosition = (checklistData.it_manager_position || '').trim();
          if (itManagerPosition) {
            doc.setFontSize(6.5);
            const positionLines = doc.splitTextToSize(
              itManagerPosition,
              nameMaxWidth
            );
            doc.text(positionLines, xMin, nameY + 3.5);
          }
        }

        if (itManagerSignedDate && itManagerSignedTime) {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(itManagerSignedDate, dateTimeX, yTop + 4);
          doc.text(itManagerSignedTime, dateTimeX, yTop + 9);
        }
      }

      // Row 1, column 1: IT Staff / IT Inventory Manager (name/date only; signature overlays later)
      if (creatorName && data.row.index === 1 && data.column.index === 1) {
        const yTop = yMin;
        const dateTimeReserved = 20;
        const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
        const dateTimeX = xMax - dateTimeReserved;
        const nameY = yTop + sigHeight - 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        if (creatorDigitalSignature) {
          pendingSignatures.push({
            data: creatorDigitalSignature,
            x: cell.x + 1 - 30,
            y: yTop + 25,
            anchorBottomY: signatureAnchorBottomY(nameY),
            maxWidth: PDF_SIGNATURE_MAX_WIDTH_MM,
            maxHeight: PDF_SIGNATURE_MAX_HEIGHT_MM,
          });
        } else if (creatorInitial) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(creatorInitial, xMin, yTop + 10 + approvalSignatureDownOffsetMm);
        }

        if (creatorName) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          const nameMaxWidth = Math.max(15, contentWidth - 6);
          const nameLines = doc.splitTextToSize(creatorName, nameMaxWidth);
          doc.text(nameLines, xMin, nameY);
        }

        if (createdDate && createdTime) {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(createdDate, dateTimeX, yTop + 4);
          doc.text(createdTime, dateTimeX, yTop + 9);
        }
      }

      // Row 3, column 0: Employee's Department Head
      if (data.row.index === 3 && data.column.index === 0) {
        const yTop = yMin;
        const dateTimeReserved = 20;
        const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
        const dateTimeX = xMax - dateTimeReserved;
        const nameY = yTop + sigHeight - 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        if (displayDeptHeadDigitalSignature) {
          pendingSignatures.push({
            data: displayDeptHeadDigitalSignature,
            x: cell.x + 1 - 30,
            y: yTop + 25,
            anchorBottomY: signatureAnchorBottomY(nameY),
            maxWidth: PDF_SIGNATURE_MAX_WIDTH_MM,
            maxHeight: PDF_SIGNATURE_MAX_HEIGHT_MM,
          });
        } else if (deptHeadInitial) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(deptHeadInitial, xMin, yTop + 10 + approvalSignatureDownOffsetMm);
        }

        if (displayDeptHeadName) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          const nameMaxWidth = Math.max(15, contentWidth - 6);
          const nameLines = doc.splitTextToSize(displayDeptHeadName, nameMaxWidth);
          doc.text(nameLines, xMin, nameY);
          if (displayDeptHeadPosition) {
            doc.setFontSize(6.5);
            const positionLines = doc.splitTextToSize(
              displayDeptHeadPosition,
              nameMaxWidth
            );
            doc.text(positionLines, xMin, nameY + 3.5);
          }
        }

        if (subApprover1Signed) {
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'italic');
          doc.text('(Stand-in approver)', xMin, nameY + 7);
        }

        if (deptHeadSignedDate && deptHeadSignedTime) {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(deptHeadSignedDate, dateTimeX, yTop + 4);
          doc.text(deptHeadSignedTime, dateTimeX, yTop + 9);
        }
      }

      // Row 3, column 1: Employee (name/date only; signature overlays later)
      if (employeeName && data.row.index === 3 && data.column.index === 1) {
        const yTop = yMin;
        const dateTimeReserved = 20;
        const sigHeight = Math.min(50, Math.max(28, contentHeight - 2));
        const dateTimeX = xMax - dateTimeReserved;
        const nameY = yTop + sigHeight - 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        if (employeeDigitalSignature) {
          const isImageSignature =
            employeeDigitalSignature.startsWith('data:image/') ||
            employeeDigitalSignature.startsWith('http://') ||
            employeeDigitalSignature.startsWith('https://');
          if (isImageSignature) {
            pendingSignatures.push({
              data: employeeDigitalSignature,
              x: cell.x + 1 - 30,
              y: yTop + 25,
              anchorBottomY: signatureAnchorBottomY(nameY),
              maxWidth: PDF_SIGNATURE_MAX_WIDTH_MM,
              maxHeight: PDF_SIGNATURE_MAX_HEIGHT_MM,
            });
          } else if (employeeInitial && checklistData.employee_signed_at) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(employeeInitial, xMin, yTop + 10 + approvalSignatureDownOffsetMm);
          }
        } else if (employeeInitial && checklistData.employee_signed_at) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(employeeInitial, xMin, yTop + 10 + approvalSignatureDownOffsetMm);
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const nameMaxWidth = Math.max(15, contentWidth - 6);
        const nameLines = doc.splitTextToSize(employeeName, nameMaxWidth);
        doc.text(nameLines, xMin, nameY);

        if (employeeSignedDate && employeeSignedTime) {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(employeeSignedDate, dateTimeX, yTop + 4);
          doc.text(employeeSignedTime, dateTimeX, yTop + 9);
        }
      }
    },
  });

  // Stand-in approver note under the table
  if (checklistData.sub_approver_1_signed_at) {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text(
      'Stand-in approver note: The signee is a stand-in approver for the Department Head, who is currently not present.',
      tableMargin.left,
      (doc as any).lastAutoTable.finalY + 4,
      { maxWidth: tableWidth }
    );
    doc.setTextColor(0, 0, 0);
  }

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

  // Draw digital signatures last so they overlay table lines, names, and dates
  for (const sig of pendingSignatures) {
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

  return new Blob([doc.output('blob')], { type: 'application/pdf' });
};

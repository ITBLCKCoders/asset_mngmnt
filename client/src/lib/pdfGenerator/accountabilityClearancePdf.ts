import type { jsPDF } from 'jspdf';
import {
  addCompanyLogoToPDF,
  addSignatureToPDF,
  autoTable,
  getCompanyAccentColor,
  isBlackCoders,
} from './shared';
import type { AccountabilityForm } from '@/pages/assets/accountability/accountabilityFormTypes';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ClearancePdf');

/**
 * Generate the Asset Clearance Certificate PDF.
 *
 * Visual identity mirrors `generateAccountabilityFormPDF`:
 *  - 8.5 x 13 inch (215.9 x 330.2 mm) portrait jsPDF page
 *  - Company logo (top-left), `FOR INTERNAL USE ONLY` box, red form-number
 *    box (top-right) using the same coordinates
 *  - Department header line below the title
 *  - Company accent color (or red for Black Coders) for table headers and
 *    the footer bar; thin black line at the very bottom of page 1
 *  - Continuation header (logo + `FOR INTERNAL USE ONLY`) on every page 2+
 *
 * Body content is replaced with a clearance statement and metadata table —
 * there are no asset tables because a clearance form has zero assets.
 */
export const generateAccountabilityClearancePDF = async (
  form: AccountabilityForm,
  currentUser?: any
): Promise<Blob> => {
  const [{ jsPDF: JsPDFConstructor }] = await Promise.all([
    import('jspdf'),
  ]);

  const doc: jsPDF = new JsPDFConstructor({
    orientation: 'portrait',
    unit: 'mm',
    format: [215.9, 330.2],
  });

  const tableMargin = { left: 10, right: 10 };
  const tableWidth = 195.9;
  const issuerName = form.issuer
    ? `${form.issuer.first_name} ${form.issuer.last_name}`
    : 'Administrator';

  doc.setProperties({
    title: `${form.user.first_name} ${form.user.last_name} Clearance ${form.formNumber}`,
    subject: 'Asset Clearance Certificate',
    author: 'Asset Management System',
  });

  const companyLogoUrl = form.user.companyLogoUrl ?? undefined;
  const companyAccentColor = getCompanyAccentColor(form.user.company?.name);
  const isBlackCodersCompany = isBlackCoders(form.user.company?.name);
  const headerFillColor: [number, number, number] = isBlackCodersCompany
    ? [0, 0, 0]
    : [companyAccentColor.r, companyAccentColor.g, companyAccentColor.b];
  const headerTextColor: [number, number, number] = [255, 255, 255];

  // ── Page 1 header (mirrors accountability form) ──────────────────────
  await addCompanyLogoToPDF(doc, companyLogoUrl, 15, 8);

  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(255, 255, 255);
  doc.rect(145, 10, 55, 8, 'FD');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('FOR INTERNAL USE ONLY', 172.5, 16, { align: 'center' });

  doc.setDrawColor(255, 0, 0);
  doc.setFillColor(255, 255, 255);
  doc.rect(145, 20, 55, 8, 'FD');
  doc.setTextColor(255, 0, 0);
  doc.setFontSize(12);
  doc.text(form.formNumber, 172.5, 26, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Asset Clearance Certificate', 105, 40, { align: 'center' });

  // Department / scope subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const scope = form.clearanceScope ?? 'IT';
  const departmentName =
    scope === 'IT' ? 'IT Department' : 'Administration Department';
  doc.text(departmentName, 105, 50, { align: 'center' });

  // Employee Information table (same shape as accountability form)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  let y = 70;
  doc.text('Employee Information', 20, y);
  y += 6;
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
  y = (doc as any).lastAutoTable.finalY + 12;

  // Clearance Statement heading
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Clearance Statement', 20, y);
  y += 8;

  // Clearance statement body — same body, per-scope wording
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const employeeFullName = `${form.user.first_name} ${form.user.last_name}`;
  const employeeMeta = [
    form.user.employeeNumber ? `Employee ID ${form.user.employeeNumber}` : null,
    form.user.position ? `Designation ${form.user.position}` : null,
    form.user.department?.name
      ? `assigned to the ${form.user.department.name}`
      : null,
  ]
    .filter(Boolean)
    .join(', ');
  const companyName = form.user.company?.name || 'the Company';
  const referenceList =
    form.referenceDisabledFormNumbers && form.referenceDisabledFormNumbers.length > 0
      ? form.referenceDisabledFormNumbers.join(', ')
      : 'N/A';
  const clearedDate = form.clearedAt
    ? new Date(form.clearedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date(form.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
  const clearanceReasonText =
    form.clearanceReason === 'transfer' ? 'transferred' : 'returned';

  const statement = `This is to certify that ${employeeFullName}${
    employeeMeta ? ` (${employeeMeta})` : ''
  } has no outstanding company assets, accountabilities, or obligations with ${companyName} as of ${clearedDate}.

All properties covered by ${scope} Accountability Form(s) ${referenceList} have been duly ${clearanceReasonText} and verified. The corresponding accountability forms have been closed as Disabled, and a complete review of the asset registry — both tangible and intangible — confirms zero (0) active assignments remaining under the employee's name for the ${scope} scope.

The employee is hereby CLEARED of all asset accountability for the ${scope} scope and is free of any further liability pertaining to company property thereunder. This certificate is issued for HR 201-file, clearance, exit, and transfer purposes and may be presented as proof of settlement.`;

  const splitStatement = doc.splitTextToSize(statement, 170);
  doc.text(splitStatement, 20, y, { align: 'justify', maxWidth: 170 });
  y += splitStatement.length * 5 + 8;

  // Clearance metadata table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Clearance Details', 20, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    tableWidth,
    margin: tableMargin,
    head: [['Field', 'Value']],
    body: [
      ['Scope', scope],
      [
        'Reason',
        form.clearanceReason === 'transfer'
          ? 'Transfer between companies / departments'
          : 'Asset return / settlement',
      ],
      [
        'Reference Form(s) Disabled',
        form.referenceDisabledFormNumbers &&
        form.referenceDisabledFormNumbers.length > 0
          ? form.referenceDisabledFormNumbers.join(', ')
          : 'N/A',
      ],
      [
        'Tangible Assets Remaining (this scope)',
        '0',
      ],
      [
        'Intangible Assets Remaining (this scope)',
        '0',
      ],
      [
        'Other Active Accountability Forms (this scope)',
        '0',
      ],
      ['Clearance Date', clearedDate],
      ['Certificate No.', form.formNumber],
    ],
    theme: 'grid',
    styles: {
      fontSize: 12,
      cellPadding: 1,
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    headStyles: { fillColor: headerFillColor, textColor: headerTextColor },
    columnStyles: {
      0: { cellWidth: 75 },
      1: { cellWidth: 120.9 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // Acknowledgment
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Acknowledgment', 20, y);
  y += 6;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const ack = `I, ${employeeFullName}, acknowledge that this clearance certificate reflects the settlement of all asset accountabilities previously held under my name for the ${scope} scope, and that any future asset assignment for the same scope will be covered by a newly issued Accountability Form.`;
  const splitAck = doc.splitTextToSize(ack, 170);
  doc.text(splitAck, 20, y, { align: 'justify', maxWidth: 170 });
  y += splitAck.length * 5 + 6;

  // ── Footer (page 1) ─────────────────────────────────────────────────
  doc.setPage(1);
  const footerGoldY = 320;
  const footerLineY = 324;
  if (isBlackCodersCompany) {
    doc.setDrawColor(220, 38, 38);
    doc.setFillColor(220, 38, 38);
    doc.setLineWidth(0.1);
    doc.rect(10, footerGoldY, 195, 1, 'FD');
  } else {
    doc.setDrawColor(
      companyAccentColor.r,
      companyAccentColor.g,
      companyAccentColor.b
    );
    doc.setFillColor(
      companyAccentColor.r,
      companyAccentColor.g,
      companyAccentColor.b
    );
    doc.setLineWidth(0.1);
    doc.rect(10, footerGoldY, 195, 1, 'FD');
  }
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(6);
  doc.line(10, footerLineY, 205, footerLineY);

  // ── Signatures page ─────────────────────────────────────────────────
  doc.addPage();
  // Continuation header (logo + FOR INTERNAL USE ONLY) for page 2+
  await drawContinuationHeader(doc, companyLogoUrl);

  y = 45;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Signatures', 105, y + 20, { align: 'center' });
  y += 35;

  doc.setFontSize(10);
  doc.text(`Document No: ${form.formNumber} ver1 01Jan2026`, 190, 270, {
    align: 'right',
  });

  const signatureY = y;
  const issuerSignedDate = (form.clearedAt
    ? new Date(form.clearedAt)
    : form.created_at
      ? new Date(form.created_at)
      : new Date());
  const issuedByLabel =
    scope === 'IT'
      ? 'Issued by (IT Processor):'
      : 'Issued by (Admin Processor):';
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(issuedByLabel, 20, signatureY);
  doc.text(`${issuerSignedDate.toLocaleDateString()}`, 60, signatureY + 10);
  doc.text(`${issuerSignedDate.toLocaleTimeString()}`, 60, signatureY + 15);
  doc.text(issuerName, 20, signatureY + 28);
  logger.debug('Rendering issuer signature on clearance form', {
    hasIssuerSignature: !!form.issuerSignature,
  });
  await addSignatureToPDF(doc, form.issuerSignature, -20, signatureY, 122, 74);
  doc.setLineWidth(0.2);
  doc.line(20, signatureY + 30, 80, signatureY + 30);
  doc.text('Signature over Printed Name', 20, signatureY + 35);

  doc.text('Received by / Employee:', 130, signatureY);
  if (form.signed_at) {
    const empDate = new Date(form.signed_at);
    doc.text(`${empDate.toLocaleDateString()}`, 170, signatureY + 10);
    doc.text(`${empDate.toLocaleTimeString()}`, 170, signatureY + 15);
    doc.text(
      `${form.user.first_name} ${form.user.last_name}`,
      130,
      signatureY + 28
    );
    const digitalSignature = form.acknowledgments?.digitalSignature;
    if (digitalSignature) {
      await addSignatureToPDF(
        doc,
        digitalSignature,
        90,
        signatureY,
        122,
        74
      );
    }
  } else {
    doc.text(
      `${form.user.first_name} ${form.user.last_name}`,
      130,
      signatureY + 28
    );
    doc.text('____________________', 130, signatureY + 30);
  }
  doc.setLineWidth(0.2);
  doc.line(130, signatureY + 30, 190, signatureY + 30);
  doc.text('Signature over Printed Name', 130, signatureY + 35);

  const copyLabel = scope === 'IT' ? 'Copy for IT:' : 'Copy for Admin:';
  doc.text(copyLabel, 20, signatureY + 60);
  const itCopyDate = form.created_at ? new Date(form.created_at) : new Date();
  doc.text(`${itCopyDate.toLocaleDateString()}`, 60, signatureY + 70);
  doc.text(`${itCopyDate.toLocaleTimeString()}`, 60, signatureY + 75);
  doc.text(issuerName, 20, signatureY + 88);
  await addSignatureToPDF(
    doc,
    form.itCopySignature,
    -20,
    signatureY + 60,
    122,
    74
  );
  doc.setLineWidth(0.2);
  doc.line(20, signatureY + 90, 80, signatureY + 90);
  doc.text('Signature over Printed Name', 20, signatureY + 95);

  doc.text('HR Copy (201 File):', 130, signatureY + 60);
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
        (currentUser as any).userID ===
          form.receivedCopy201FileSignedById)
        ? `${firstName} ${lastName}`.trim()
        : '') ||
      '';
    doc.text(rcSignerName, 130, signatureY + 88);
    if (form.receivedCopy201FileSignature) {
      await addSignatureToPDF(
        doc,
        form.receivedCopy201FileSignature,
        90,
        signatureY + 60,
        122,
        74
      );
    }
  }
  doc.setLineWidth(0.2);
  doc.line(130, signatureY + 90, 190, signatureY + 90);
  doc.text('Signature over Printed Name', 130, signatureY + 95);

  return doc.output('blob');
};

async function drawContinuationHeader(
  doc: jsPDF,
  companyLogoUrl?: string | null
): Promise<void> {
  if (companyLogoUrl) {
    try {
      // Reuse a generous size for continuation pages; matches accountability form.
      const continuationLogoWidth = 40;
      const continuationLogoHeight = 20;
      // addCompanyLogoToPDF in this module loads the image and computes
      // aspect ratio, so passing the same URL twice with different box sizes
      // works. We use the helper at a different placement.
      await addCompanyLogoToPDF(
        doc,
        companyLogoUrl,
        152.5,
        8,
        continuationLogoWidth,
        continuationLogoHeight
      );
    } catch {
      /* ignore */
    }
  }
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.setFillColor(255, 255, 255);
  doc.rect(145, 8 + 25 - 3, 55, 8, 'FD');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('FOR INTERNAL USE ONLY', 172.5, 8 + 25 + 3, { align: 'center' });
}

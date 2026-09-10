import { jsPDF } from 'jspdf';
import {
  addCompanyLogoToPDF,
  addSignatureToPDF,
  autoTable,
  fetchCompanyBrandingByName,
  getCompanyAccentColor,
  isBlackCoders,
  resolveCompanyBranding,
} from './shared';

export interface IntangibleDeactivationPdfAsset {
  id: string;
  name?: string | null;
  type?: string | null;
  description?: string | null;
  remarks?: string | null;
  department?: string | null;
  riskLevel?: string | null;
  risk_level?: string | { name?: string | null } | null;
}

export interface IntangibleDeactivationPdfData {
  formNumber?: string | null;
  status?: string | null;
  createdAt?: string | null;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterPosition?: string | null;
  requesterDepartment?: string | null;
  requesterEmployeeId?: string | null;
  requesterSignature?: string | null;
  departmentHeadName?: string | null;
  departmentHeadSignedAt?: string | null;
  departmentHeadSignature?: string | null;
  hrApproverName?: string | null;
  hrSignedAt?: string | null;
  hrSignature?: string | null;
  declineReason?: string | null;
  remarks?: string | null;
  assets: IntangibleDeactivationPdfAsset[];
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const pickText = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === 'object') {
    const name = (value as { name?: unknown }).name;
    return pickText(name);
  }
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};


const drawBrandedHeader = async (
  doc: jsPDF,
  data: IntangibleDeactivationPdfData,
  branding: { name?: string | null; logo_url?: string | null } | null,
  pageTitle: string,
  includeTitle = true
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const accent = getCompanyAccentColor(branding?.name ?? data.companyName);
  const headerFill: [number, number, number] = isBlackCoders(branding?.name ?? data.companyName)
    ? [0, 0, 0]
    : [accent.r, accent.g, accent.b];

  await addCompanyLogoToPDF(
    doc,
    data.companyLogoUrl ?? branding?.logo_url,
    15,
    8,
    80,
    25
  );

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
  doc.text(data.formNumber ?? 'IDF', 172.5, 26, { align: 'center' });

  if (includeTitle) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(pageTitle, pageWidth / 2, 40, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(branding?.name ?? data.companyName ?? 'Company', pageWidth / 2, 50, {
      align: 'center',
    });
  }

  return headerFill;
};

const drawContinuationHeader = async (
  doc: jsPDF,
  data: IntangibleDeactivationPdfData,
  branding: { name?: string | null; logo_url?: string | null } | null
) => {
  await addCompanyLogoToPDF(
    doc,
    data.companyLogoUrl ?? branding?.logo_url,
    152.5,
    8,
    40,
    20
  );

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.setFillColor(255, 255, 255);
  doc.rect(145, 30, 55, 8, 'FD');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('FOR INTERNAL USE ONLY', 172.5, 36, { align: 'center' });
};

export const generateIntangibleDeactivationPDF = async (
  data: IntangibleDeactivationPdfData
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [215.9, 330.2],
  });
  const tableMargin = { left: 10, right: 10 };
  const tableWidth = 195.9;
  const branding = await resolveCompanyBranding(
    data.companyLogoUrl
      ? { name: data.companyName, logo_url: data.companyLogoUrl }
      : await fetchCompanyBrandingByName(data.companyName)
  );
  const headerFill = await drawBrandedHeader(
    doc,
    data,
    branding,
    'Intangible Asset Deactivation Form'
  );

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  let y = 70;
  doc.text('Employee Information', 20, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    tableWidth,
    margin: tableMargin,
    head: [['Employee Name', 'Designation / Position', 'Department', 'Employee ID', 'Date Generated']],
    body: [[
      data.requesterName ?? '—',
      data.requesterPosition ?? '—',
      data.requesterDepartment ?? '—',
      data.requesterEmployeeId ?? '—',
      formatDate(data.createdAt),
    ]],
    theme: 'grid',
    styles: { fontSize: 12, cellPadding: 1, lineWidth: 0.1, lineColor: [0, 0, 0] },
    headStyles: { fillColor: headerFill, textColor: [255, 255, 255] },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Intangible Asset Deactivation Statement', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  const requester = data.requesterName ?? 'the accountable employee';
  const company = branding?.name ?? data.companyName ?? 'the Company';
  const statementParagraphs = [
    `I, ${requester}, hereby request and acknowledge the deactivation of the intangible assets listed below, which are assigned to me by ${company}.`,
    'I understand that, upon deactivation, any access, assignment, authorization, or privileges associated with these intangible assets may be removed or disabled in accordance with Company policies and procedures.',
    'I confirm that the deactivation of these intangible assets has been requested and acknowledged by me, and I accept responsibility for any applicable turnover, access revocation, or related requirements arising from this deactivation.',
  ];

  for (const paragraph of statementParagraphs) {
    const paragraphLines = doc.splitTextToSize(paragraph, 175);
    doc.text(paragraphLines, 20, y, { maxWidth: 175, align: 'justify' });
    y += paragraphLines.length * 5 + 5;
  }
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Intangible Assets', 20, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    tableWidth,
    margin: tableMargin,
    head: [['Asset Name', 'Description', 'Type', 'Risk']],
    body: data.assets.length
      ? data.assets.map(asset => [
          pickText(asset.name) ?? pickText(asset.id) ?? '—',
          pickText(asset.description) ?? pickText(asset.remarks) ?? '—',
          pickText(asset.type) ?? '—',
          pickText(asset.riskLevel) ?? pickText(asset.risk_level) ?? '—',
        ])
      : [['No assets listed', '—', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2, lineWidth: 0.1, lineColor: [0, 0, 0], overflow: 'linebreak' },
    headStyles: { fillColor: headerFill, textColor: [255, 255, 255] },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  if (data.remarks || data.declineReason) {
    doc.setFont('helvetica', 'bold');
    doc.text(data.declineReason ? 'Decline Reason' : 'Remarks', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(data.declineReason ?? data.remarks ?? '', 175);
    doc.text(noteLines, 20, y, { maxWidth: 175 });
  }

  // Page 2: signatures and approval record.
  doc.addPage([215.9, 330.2], 'portrait');
  await drawContinuationHeader(doc, data, branding);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Agreement', 105, 55, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const agreement = 'By signing below, I confirm that I have read and understood this statement and agree to the deactivation of the identified intangible assets. I acknowledge that I will no longer be authorized to access, use, or manage these assets once the deactivation takes effect, and I agree to comply with all applicable Company policies and procedures related to the deactivation.';
  const agreementLines = doc.splitTextToSize(agreement, 175);
  doc.text(agreementLines, 20, 65, { maxWidth: 175, align: 'justify' });

  const signatureY = 65 + agreementLines.length * 5 + 12;
  const sigColLeft = { x: 20, width: 60 };
  const sigColRight = { x: 130, width: 60 };
  const sigNameOverlap = 1;

  const drawSignatureBlock = async (options: {
    label: string;
    x: number;
    dateX: number;
    y: number;
    name?: string | null;
    signedAt?: string | null;
    signature?: string | null;
    column: { x: number; width: number };
  }) => {
    const nameY = options.y + 28;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(options.label, options.x, options.y);

    if (options.signedAt) {
      const signedDate = new Date(options.signedAt);
      if (!Number.isNaN(signedDate.getTime())) {
        doc.text(signedDate.toLocaleDateString(), options.dateX, options.y + 10);
        doc.text(signedDate.toLocaleTimeString(), options.dateX, options.y + 15);
      }
    }

    if (options.name) {
      doc.text(options.name, options.x, nameY);
    }

    if (options.signature) {
      await addSignatureToPDF(
        doc,
        options.signature,
        options.x,
        options.y,
        122,
        74,
        nameY + sigNameOverlap,
        options.column
      );
    }

    doc.setLineWidth(0.2);
    doc.line(options.x, options.y + 30, options.x + 60, options.y + 30);
    doc.text('Signature over Printed Name', options.x, options.y + 35);
  };

  // Accountability-form signature layout with deactivation-specific labels.
  await drawSignatureBlock({
    label: 'Owner / Accountable:',
    x: 20,
    dateX: 60,
    y: signatureY,
    name: data.requesterName,
    signedAt: data.createdAt,
    signature: data.requesterSignature,
    column: sigColLeft,
  });
  await drawSignatureBlock({
    label: 'Review / Approved by Department Head:',
    x: 130,
    dateX: 170,
    y: signatureY,
    name: data.departmentHeadName,
    signedAt: data.departmentHeadSignedAt,
    signature: data.departmentHeadSignature,
    column: sigColRight,
  });
  await drawSignatureBlock({
    label: 'HR Review / Approved by:',
    x: 20,
    dateX: 60,
    y: signatureY + 60,
    name: data.hrApproverName,
    signedAt: data.hrSignedAt,
    signature: data.hrSignature,
    column: sigColLeft,
  });

  // Match the accountability PDF by applying the continuation header to every
  // page after page 1, including pages created by table overflow.
  const totalPages = doc.getNumberOfPages();
  for (let page = 2; page <= totalPages; page += 1) {
    doc.setPage(page);
    await drawContinuationHeader(doc, data, branding);
  }

  doc.setPage(totalPages);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Document No: ${data.formNumber ?? '—'} ver1 01Jan2026`, 190, 270, {
    align: 'right',
  });

  return doc.output('blob');
};

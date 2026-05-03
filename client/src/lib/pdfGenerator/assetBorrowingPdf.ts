import { jsPDF } from 'jspdf';
import {
  addCompanyLogoToPDF,
  autoTable,
  getCompanyAccentColor,
  getBlackCodersFooterGradient,
  isBlackCoders,
  resolveCompanyBranding,
} from './shared';

export interface AssetBorrowingData {
  formNumber: string;
  /** "IT Equipment Borrowing" | "Admin Equipment Borrowing" */
  title: string;
  borrowerName: string;
  borrowerDepartment: string;
  equipmentName: string;
  serialNumber: string;
  preUsageCondition: string;
  /** Date request was approved/processed by IT/Admin staff */
  borrowingDate: string | null;
  expectedReturnDate: string | null;
  purpose: string;
  requestedBy: string;
  itReceivedBy: string;
  itApprovedBy: string;
  /** Upon return section */
  postUsageCondition: string;
  borrowerCompanyName?: string | null;
  borrowerCompanyLogoUrl?: string | null;
}

export const generateAssetBorrowingPDF = async (
  borrowData: AssetBorrowingData
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [215.9, 330.2], // 8.5 x 13 inches
  });

  doc.setProperties({
    title: `${borrowData.title} - ${borrowData.borrowerName || 'Borrower'}`,
    subject: borrowData.title,
    author: 'Asset Management System',
    creator: 'Asset Management System',
  });

  const companyBranding = await resolveCompanyBranding({
    name: borrowData.borrowerCompanyName,
    logo_url: borrowData.borrowerCompanyLogoUrl,
  });
  const accentColor = getCompanyAccentColor(companyBranding?.name);
  const isBlackCodersCompany = isBlackCoders(companyBranding?.name);
  const headerFillColor: [number, number, number] = isBlackCodersCompany ? [0, 0, 0] : [accentColor.r, accentColor.g, accentColor.b];
  const headerTextColor: [number, number, number] = [255, 255, 255];

  const pageMargin = 15;
  const tableWidth = 215.9 - pageMargin * 2;
  const tableLineWidth = 0.35;
  const headerBoxHeight = 40;
  const headerBoxY = 8;

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

  // FOR INTERNAL USE ONLY + form number (right)
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
  doc.text(
    borrowData.formNumber || 'Borrow Form',
    internalBoxX + internalBoxW / 2,
    headerBoxY + 19,
    { align: 'center' }
  );
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  // Title
  const headerCenterX = pageMargin + tableWidth / 2;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(borrowData.title.toUpperCase(), headerCenterX, 35, {
    align: 'center',
  });

  const startY = headerBoxY + headerBoxHeight;
  const tableMargin = { left: pageMargin, right: pageMargin };

  const fmtDateTime = (d: string | null | undefined) =>
    d && !Number.isNaN(new Date(d).getTime())
      ? new Date(d).toLocaleString()
      : '—';

  const twoColW = tableWidth / 2;

  // First row: Section | Details (2 columns)
  autoTable(doc, {
    startY,
    margin: tableMargin,
    body: [['Section', 'Details']],
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: { 0: { cellWidth: twoColW }, 1: { cellWidth: twoColW } },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
  });

  const afterSectionHeaderY = (doc as any).lastAutoTable.finalY;

  // Body (mostly 2 columns, with some full-width rows and 3-column signature rows)
  const rows: (string | { content: string; colSpan: number })[][] = [
    ['Borrower Information', ''],
    ['Name:', borrowData.borrowerName || '—'],
    ['Department', borrowData.borrowerDepartment || '—'],
    ['Equipment details', ''],
    ['Equipment name', borrowData.equipmentName || '—'],
    ['Serial Number', borrowData.serialNumber || ''],
    ['Condition of the Equipment (Pre -usage)', borrowData.preUsageCondition || ''],
    ['Date of Borrowing', fmtDateTime(borrowData.borrowingDate)],
    ['Expected return date', fmtDateTime(borrowData.expectedReturnDate)],
    [{ content: 'Purpose', colSpan: 2 }],
    [{ content: borrowData.purpose || '—', colSpan: 2 }],
    [{ content: 'Terms and Condition', colSpan: 2 }],
    [
      {
        content:
          '1. The borrower agrees to handle the equipment with care and return it in the same condition as received.\n' +
          '2. The borrower is responsible for any damage or loss incurred during the borrowing period.\n' +
          '3. Equipment must be returned by the expected return date. Late returns may result in penalty\n' +
          '4. Any issues or malfunctions with the equipment must be reported to IT Dept immediately.',
        colSpan: 2,
      },
    ],
  ];

  autoTable(doc, {
    startY: afterSectionHeaderY,
    margin: tableMargin,
    body: rows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
    columnStyles: { 0: { cellWidth: twoColW }, 1: { cellWidth: twoColW } },
    didParseCell: data => {
      // Make "Borrower Information", "Equipment details" label rows look like section headers
      const labelRows = new Set([0, 3]);
      if (labelRows.has(data.row.index)) {
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index === 1) {
          data.cell.text = [''];
        }
      }
      // Full-width rows (Purpose / Terms etc.)
      const fullWidthRows = new Set([9, 10, 11, 12]);
      if (fullWidthRows.has(data.row.index)) {
        data.cell.styles.fontStyle =
          data.row.index === 9 || data.row.index === 11 ? 'bold' : 'normal';
      }
    },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
  });

  // Signature area (3 columns) per spec
  const sigStartY = (doc as any).lastAutoTable.finalY;
  const sigColW = tableWidth / 3;
  autoTable(doc, {
    startY: sigStartY,
    margin: tableMargin,
    body: [
      ['Requested by', 'IT received BY:', 'IT approved by:'],
      ['', '', ''],
      ['Requestor', 'End User Support', 'IT Officer / Dept Head'],
      [{ content: 'Upon Return', colSpan: 3 }],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: sigColW },
      1: { cellWidth: sigColW },
      2: { cellWidth: sigColW },
    },
    didParseCell: data => {
      // Big empty row
      if (data.row.index === 1) {
        data.cell.styles.minCellHeight = 22;
      }
      if (data.row.index === 0) {
        data.cell.styles.fillColor = headerFillColor;
        data.cell.styles.textColor = headerTextColor;
      }
      // Upon Return row
      if (data.row.index === 3) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'left';
      }
    },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
    didDrawCell: data => {
      // Put names on the empty signature space row (row index 1) under each heading.
      if (data.row.index !== 1) return;
      const cell = data.cell;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const value =
        data.column.index === 0
          ? borrowData.requestedBy
          : data.column.index === 1
            ? borrowData.itReceivedBy
            : borrowData.itApprovedBy;
      if (!value) return;
      doc.text(String(value), cell.x + cell.width / 2, cell.y + cell.height / 2 + 2, {
        align: 'center',
      });
    },
  });

  const uponReturnStartY = (doc as any).lastAutoTable.finalY;
  autoTable(doc, {
    startY: uponReturnStartY,
    margin: tableMargin,
    body: [
      ['Condition of Equipment (Post Usage)', borrowData.postUsageCondition || ''],
      ['Comments / Notes', ''],
      ['Return date', ''],
      ['Checked by:', ''],
      ['Signature', ''],
      ['Date', ''],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: twoColW }, 1: { cellWidth: twoColW } },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
  });

  const docNoY = (doc as any).lastAutoTable.finalY + 8;
  const docNoText = `Document No: ${borrowData.formNumber || 'BRW'} ver1 01Jan2026`;
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

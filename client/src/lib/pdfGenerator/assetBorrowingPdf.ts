import { jsPDF } from 'jspdf';
import {
  addCompanyLogoToPDF,
  autoTable,
  computeSignatureFitSize,
  cropSignatureToInk,
  getCompanyAccentColor,
  getBlackCodersFooterGradient,
  isBlackCoders,
  resolveCompanyBranding,
  sortAssetsByLast5Digits,
  PDF_SIGNATURE_NUDGE_X_MM,
  PDF_SIGNATURE_PX_TO_MM,
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
  /** Digital signature of the IT receiver (base64 data URL) */
  itReceivedBySignature?: string | null;
  /** Timestamp when the IT receiver signed */
  itReceivedBySignedAt?: string | null;
  itApprovedBy: string;
  /** Digital signature of the IT/Admin approver (Manager Approver 2) (base64 data URL) */
  itApprovedBySignature?: string | null;
  /** Timestamp when the IT/Admin approver signed */
  itApprovedBySignedAt?: string | null;
  /** Upon return section */
  postUsageCondition: string;
  borrowerCompanyName?: string | null;
  borrowerCompanyLogoUrl?: string | null;
  /** Digital signature of the requester (base64 data URL) */
  requestedBySignature?: string | null;
  /** When the request was submitted */
  requestedAt?: string | null;
  /** IT receiver position for PDF */
  itReceivedByPosition?: string | null;
  /** IT approver position for PDF */
  itApprovedByPosition?: string | null;
  /** Dept Head (requestor's department head) approval date/time */
  deptHeadSignedAt?: string | null;
  /** Dept Head display name for PDF */
  deptHeadSignedBy?: string | null;
  /** Dept Head digital signature image (base64 data URL) */
  deptHeadSignature?: string | null;
  /** Dept Head position for PDF */
  deptHeadPosition?: string | null;
  /** Sub Approver 1 (stand-in for dept head) approval date/time */
  subApprover1SignedAt?: string | null;
  /** Sub Approver 1 display name for PDF */
  subApprover1SignedBy?: string | null;
  /** Sub Approver 1 position for PDF */
  subApprover1Position?: string | null;
  /** Sub Approver 1 digital signature image (base64 data URL) */
  subApprover1Signature?: string | null;
}

/** Remove white/light background from signature image */
function removeSignatureBackground(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Make white/light pixels transparent
    if (r > 240 && g > 240 && b > 240) {
      data[i + 3] = 0; // Set alpha to 0 (transparent)
    }
  }

  ctx.putImageData(imageData, 0, 0);
  // Trim scan whitespace so the ink fills the box (bigger render)
  return cropSignatureToInk(canvas).toDataURL('image/png');
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
  const headerBoxHeight = 30;
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
  doc.rect(internalBoxX, headerBoxY + 12, internalBoxW, 8, 'FD');
  doc.setTextColor(255, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(
    borrowData.formNumber || 'Borrow Form',
    internalBoxX + internalBoxW / 2,
    headerBoxY + 18,
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
      cellPadding: 2,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: { 0: { cellWidth: twoColW }, 1: { cellWidth: twoColW } },
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

  const afterSectionHeaderY = (doc as any).lastAutoTable.finalY;

  // Body (mostly 2 columns, with some full-width rows and 3-column signature rows)
  const rows: (string | { content: string; colSpan: number })[][] = [
    [{ content: 'Borrower Information', colSpan: 2 }],
    ['Name:', borrowData.borrowerName || '—'],
    ['Department', borrowData.borrowerDepartment || '—'],
    [{ content: 'Equipment details', colSpan: 2 }],
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
      // Make "Borrower Information", "Equipment details" single-column headers
      const headerRows = new Set([0, 3]);
      if (headerRows.has(data.row.index)) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = headerFillColor;
        data.cell.styles.textColor = headerTextColor;
      }
      // Make all label rows (first column) bold
      const labelRows = new Set([1, 2, 4, 5, 6, 7, 8]);
      if (labelRows.has(data.row.index) && data.column.index === 0) {
        data.cell.styles.fontStyle = 'bold';
      }
      // Full-width rows (Purpose / Terms etc.)
      const fullWidthRows = new Set([9, 10, 11, 12]);
      if (fullWidthRows.has(data.row.index)) {
        data.cell.styles.fontStyle =
          data.row.index === 9 || data.row.index === 11 ? 'bold' : 'normal';
        // Add color to Purpose header row
        if (data.row.index === 9) {
          data.cell.styles.fillColor = headerFillColor;
          data.cell.styles.textColor = headerTextColor;
        }
        // Add color to Terms and Condition header row
        if (data.row.index === 11) {
          data.cell.styles.fillColor = headerFillColor;
          data.cell.styles.textColor = headerTextColor;
        }
        // Increase height of Purpose content row
        if (data.row.index === 10) {
          data.cell.styles.minCellHeight = 20;
        }
      }
    },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
  });

  // Pre-load signature images if available
  let sigImg: HTMLImageElement | null = null;
  if (borrowData.requestedBySignature) {
    sigImg = await new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const processedSrc = removeSignatureBackground(img);
        const processedImg = new Image();
        processedImg.onload = () => resolve(processedImg);
        processedImg.onerror = () => resolve(null);
        processedImg.src = processedSrc;
      };
      img.onerror = () => resolve(null);
      img.src = borrowData.requestedBySignature!;
    });
  }

  let itReceivedSigImg: HTMLImageElement | null = null;
  if (borrowData.itReceivedBySignature) {
    itReceivedSigImg = await new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const processedSrc = removeSignatureBackground(img);
        const processedImg = new Image();
        processedImg.onload = () => resolve(processedImg);
        processedImg.onerror = () => resolve(null);
        processedImg.src = processedSrc;
      };
      img.onerror = () => resolve(null);
      img.src = borrowData.itReceivedBySignature!;
    });
  }

  let itApprovedSigImg: HTMLImageElement | null = null;
  if (borrowData.itApprovedBySignature) {
    itApprovedSigImg = await new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const processedSrc = removeSignatureBackground(img);
        const processedImg = new Image();
        processedImg.onload = () => resolve(processedImg);
        processedImg.onerror = () => resolve(null);
        processedImg.src = processedSrc;
      };
      img.onerror = () => resolve(null);
      img.src = borrowData.itApprovedBySignature!;
    });
  }

  const deptHeadSignature = borrowData.subApprover1Signature || borrowData.deptHeadSignature || null;
  const deptHeadSignedAt =
    borrowData.subApprover1SignedAt || borrowData.deptHeadSignedAt || null;
  const deptHeadName =
    borrowData.subApprover1SignedBy ||
    borrowData.deptHeadSignedBy ||
    '—';
  const isSubApprover1Signed = !!borrowData.subApprover1SignedAt;
  const deptHeadPosition = isSubApprover1Signed
    ? (borrowData.subApprover1Position || '').trim()
    : (borrowData.deptHeadPosition || '').trim();
  let deptHeadSigImg: HTMLImageElement | null = null;
  if (deptHeadSignature) {
    deptHeadSigImg = await new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const processedSrc = removeSignatureBackground(img);
        const processedImg = new Image();
        processedImg.onload = () => resolve(processedImg);
        processedImg.onerror = () => resolve(null);
        processedImg.src = processedSrc;
      };
      img.onerror = () => resolve(null);
      img.src = deptHeadSignature!;
    });
  }

  // Signature area (4 columns) per spec: Requested by | Department Head | IT received BY | IT approved by
  const sigStartY = (doc as any).lastAutoTable.finalY;
  const sigColW = tableWidth / 4;
  const sigRowHeight = borrowData.requestedBySignature ? 30 : 22;
  autoTable(doc, {
    startY: sigStartY,
    margin: tableMargin,
    body: [
      ['Requested by', "Department Head", 'IT received BY:', 'IT approved by:'],
      ['', '', '', ''],
      ['Requestor', 'Department Head', 'End User Support', 'IT Officer / Dept Head'],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: sigColW },
      1: { cellWidth: sigColW },
      2: { cellWidth: sigColW },
      3: { cellWidth: sigColW },
    },
    didParseCell: data => {
      // Big empty row
      if (data.row.index === 1) {
        data.cell.styles.minCellHeight = sigRowHeight;
      }
      // Label row - make it smaller
      if (data.row.index === 2) {
        data.cell.styles.minCellHeight = 8;
      }
      if (data.row.index === 0) {
        data.cell.styles.fillColor = headerFillColor;
        data.cell.styles.textColor = headerTextColor;
      }
    },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
    didDrawCell: data => {
      if (data.row.index !== 1) return;
      const cell = data.cell;

      if (data.column.index === 0 && sigImg) {
        // Draw signature image centered in the cell
        // Uniform size: aspect-fit inside the shared standard signature box
        const fit = computeSignatureFitSize(
          sigImg.width * PDF_SIGNATURE_PX_TO_MM,
          sigImg.height * PDF_SIGNATURE_PX_TO_MM,
          { cellWidthMm: cell.width }
        );
        const sigW = fit.width;
        const sigH = fit.height;
        // Uniform position: center the signature horizontally within the cell
        const sigX = cell.x + (cell.width - sigW) / 2 + PDF_SIGNATURE_NUDGE_X_MM;
        const sigY = cell.y + 12;

        // Date/time above signature
        const reqDate = borrowData.requestedAt
          ? new Date(borrowData.requestedAt)
          : null;
        if (reqDate) {
          const dateStr = reqDate.toLocaleDateString();
          const timeStr = reqDate.toLocaleTimeString();

          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text(dateStr, cell.x + 45, sigY - 5, {
            align: 'left',
          });
          doc.text(timeStr, cell.x + 45, sigY - 2, {
            align: 'left',
          });
        }

        doc.addImage(sigImg, 'PNG', sigX, sigY, sigW, sigH);

        // Name below signature (moved up)
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(borrowData.requestedBy, cell.x + 3, sigY + sigH + 5, {
          align: 'left',
        });

        return;
      }

      if (data.column.index === 1) {
        // Draw Department Head signature (or Sub Approver 1 stand-in)
        let sigY = cell.y + 5;
        let sigH = 0;
        if (deptHeadSigImg) {
          // Uniform size: aspect-fit inside the shared standard signature box
          const fit = computeSignatureFitSize(
            deptHeadSigImg.width * PDF_SIGNATURE_PX_TO_MM,
            deptHeadSigImg.height * PDF_SIGNATURE_PX_TO_MM,
            { cellWidthMm: cell.width }
          );
          const sigW = fit.width;
          sigH = fit.height;
          // Uniform position: center the signature horizontally within the cell
          const sigX = cell.x + (cell.width - sigW) / 2 + PDF_SIGNATURE_NUDGE_X_MM;

          const signedDate = deptHeadSignedAt ? new Date(deptHeadSignedAt) : null;
          if (signedDate) {
            const dateStr = signedDate.toLocaleDateString();
            const timeStr = signedDate.toLocaleTimeString();

            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            doc.text(dateStr, cell.x + 45, sigY + 3, {
              align: 'left',
            });
            doc.text(timeStr, cell.x + 45, sigY + 6, {
              align: 'left',
            });
          }

          doc.addImage(deptHeadSigImg, 'PNG', sigX, sigY, sigW, sigH);
        }

        const nameY = deptHeadSigImg ? sigY + sigH + 5 : cell.y + 25;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(deptHeadName, cell.x + 3, nameY, {
          align: 'left',
        });

        // Position under name (sub-approver position or dept head position)
        if (deptHeadPosition) {
          doc.setFontSize(6.5);
          doc.text(deptHeadPosition, cell.x + 3, nameY + 3.5, {
            align: 'left',
          });
        }

        if (isSubApprover1Signed) {
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(90, 90, 90);
          doc.text('(Stand-in approver)', cell.x + 3, nameY + 6.5, {
            align: 'left',
          });
        }

        return;
      }

      if (data.column.index === 2) {
        // Draw IT received by signature image if available
        let sigY = cell.y + 5;
        let sigH = 0;
        if (itReceivedSigImg) {
          // Uniform size: aspect-fit inside the shared standard signature box
          const fit = computeSignatureFitSize(
            itReceivedSigImg.width * PDF_SIGNATURE_PX_TO_MM,
            itReceivedSigImg.height * PDF_SIGNATURE_PX_TO_MM,
            { cellWidthMm: cell.width }
          );
          const sigW = fit.width;
          sigH = fit.height;
          // Uniform position: center the signature horizontally within the cell
          const sigX = cell.x + (cell.width - sigW) / 2 + PDF_SIGNATURE_NUDGE_X_MM;

          // Date on the right of signature, time below the date
          const signedDate = borrowData.itReceivedBySignedAt
            ? new Date(borrowData.itReceivedBySignedAt)
            : null;
          if (signedDate) {
            const dateStr = signedDate.toLocaleDateString();
            const timeStr = signedDate.toLocaleTimeString();

            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            // Date to the right of signature
            doc.text(dateStr, cell.x + 45, sigY + 3, {
              align: 'left',
            });
            // Time below the date
            doc.text(timeStr, cell.x + 45, sigY + 6, {
              align: 'left',
            });
          }

          doc.addImage(itReceivedSigImg, 'PNG', sigX, sigY, sigW, sigH);
        }

        // Name below signature (or at bottom if no signature)
        const nameY = itReceivedSigImg ? sigY + sigH + 5 : cell.y + 25;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(borrowData.itReceivedBy, cell.x + 3, nameY, {
          align: 'left',
        });
        // IT received by position
        if (borrowData.itReceivedByPosition) {
          doc.setFontSize(6.5);
          doc.text(borrowData.itReceivedByPosition, cell.x + 3, nameY + 3.5, {
            align: 'left',
          });
        }

        return;
      }

      if (data.column.index === 3) {
        let sigY = cell.y + 5;
        let sigH = 0;
        if (itApprovedSigImg) {
          // Uniform size: aspect-fit inside the shared standard signature box
          const fit = computeSignatureFitSize(
            itApprovedSigImg.width * PDF_SIGNATURE_PX_TO_MM,
            itApprovedSigImg.height * PDF_SIGNATURE_PX_TO_MM,
            { cellWidthMm: cell.width }
          );
          const sigW = fit.width;
          sigH = fit.height;
          // Uniform position: center the signature horizontally within the cell
          const sigX = cell.x + (cell.width - sigW) / 2 + PDF_SIGNATURE_NUDGE_X_MM;

          const signedDate = borrowData.itApprovedBySignedAt
            ? new Date(borrowData.itApprovedBySignedAt)
            : null;
          if (signedDate) {
            const dateStr = signedDate.toLocaleDateString();
            const timeStr = signedDate.toLocaleTimeString();

            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            doc.text(dateStr, cell.x + 45, sigY + 3, {
              align: 'left',
            });
            doc.text(timeStr, cell.x + 45, sigY + 6, {
              align: 'left',
            });
          }

          doc.addImage(itApprovedSigImg, 'PNG', sigX, sigY, sigW, sigH);
        }

        const nameY = itApprovedSigImg ? sigY + sigH + 5 : cell.y + 25;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(borrowData.itApprovedBy, cell.x + 3, nameY, {
          align: 'left',
        });
        // IT approved by position
        if (borrowData.itApprovedByPosition) {
          doc.setFontSize(6.5);
          doc.text(borrowData.itApprovedByPosition, cell.x + 3, nameY + 3.5, {
            align: 'left',
          });
        }

        return;
      }

      // Put names on the empty signature space row (row index 1) under each heading.
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const value =
        data.column.index === 0
          ? borrowData.requestedBy
          : data.column.index === 1
            ? deptHeadName
            : data.column.index === 2
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
      [{ content: 'Upon Return', colSpan: 2 }],
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
    didParseCell: data => {
      // Upon Return header row - add color
      if (data.row.index === 0) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'left';
        data.cell.styles.fillColor = headerFillColor;
        data.cell.styles.textColor = headerTextColor;
      }
      // Make all post-usage label rows bold (first column)
      const postUsageLabelRows = new Set([1, 2, 3, 4, 6]);
      if (postUsageLabelRows.has(data.row.index) && data.column.index === 0) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
    willDrawCell: () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(tableLineWidth);
    },
  });

  const docNoY = (doc as any).lastAutoTable.finalY + 8;
  if (borrowData.subApprover1SignedAt) {
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

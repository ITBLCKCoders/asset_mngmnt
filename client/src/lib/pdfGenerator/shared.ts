import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createLogger } from '@/lib/logger';
import { api } from '@/lib/api';

export const pdfLogger = createLogger('PDFGenerator');

export { autoTable };

/**
 * Add a signature to the PDF. Signature can be either plain text initials
 * (rendered as bold helvetica) or a base64/HTTP image (rendered after
 * compositing the source to pure black via canvas).
 */
export const addSignatureToPDF = async (
  doc: jsPDF,
  signatureData: string | undefined,
  x: number,
  y: number,
  maxWidth: number = 50,
  maxHeight: number = 20
): Promise<void> => {
  try {
    pdfLogger.debug('addSignatureToPDF called', {
      hasSignature: !!signatureData,
      x,
      y,
    });

    if (!signatureData) {
      pdfLogger.debug('No signature data provided');
      return;
    }

    const isPlainText =
      !signatureData.startsWith('data:image/') &&
      !signatureData.startsWith('http://') &&
      !signatureData.startsWith('https://') &&
      signatureData.length < 100;

    if (isPlainText) {
      pdfLogger.debug('Rendering signature as text', { text: signatureData });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(signatureData, x, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = signatureData;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          pdfLogger.debug('Signature image loaded', {
            width: img.width,
            height: img.height,
          });

          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
              const a = data[i + 3];
              if (a > 0) {
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
                data[i + 3] = a;
              }
            }

            ctx.putImageData(imageData, 0, 0);
            img.src = canvas.toDataURL();
          }

          resolve();
        };
        img.onerror = () => {
          pdfLogger.debug('Failed to load signature image');
          reject(new Error('Failed to load signature image'));
        };
      });

      const pixelsToMm = 0.264583;
      const sigWidth = img.width * pixelsToMm;
      const sigHeight = img.height * pixelsToMm;

      let finalSigWidth = sigWidth;
      let finalSigHeight = sigHeight;

      if (sigWidth > maxWidth) {
        const scale = maxWidth / sigWidth;
        finalSigWidth = maxWidth;
        finalSigHeight = sigHeight * scale;
      }

      if (finalSigHeight > maxHeight) {
        const scale = maxHeight / finalSigHeight;
        finalSigHeight = maxHeight;
        finalSigWidth = finalSigWidth * scale;
      }

      pdfLogger.debug('Adding signature image to PDF', {
        finalSigWidth,
        finalSigHeight,
        x,
        y,
      });
      doc.addImage(img.src, 'PNG', x, y, finalSigWidth, finalSigHeight);
    }
  } catch (error) {
    pdfLogger.debug(
      'Failed to add signature to PDF',
      error as Record<string, unknown>
    );
  }
};

/** Fetch active company data for accountability form (reusable across PDFs). */
export const fetchActiveCompanyForAccountabilityForm = async () => {
  try {
    const data = await api.get<{ data?: any[] }>('/companies/active');
    return data?.data?.[0] || null;
  } catch (error) {
    pdfLogger.warn('Failed to fetch active company for accountability form');
    return null;
  }
};

/** Fetch logged-in user's company for asset return / transfer form logo. */
export const fetchActiveCompanyForAssetReturnForm = async () => {
  try {
    const data = await api.get<{ data?: any[] }>('/companies/my');
    return data?.data?.[0] || null;
  } catch (error) {
    pdfLogger.warn('Failed to fetch user company for asset return form');
    return null;
  }
};

/** Trigger a browser download for an in-memory PDF blob. */
export const downloadPDF = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

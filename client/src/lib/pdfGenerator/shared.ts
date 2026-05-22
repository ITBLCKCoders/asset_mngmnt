import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createLogger } from '@/lib/logger';
import { api } from '@/lib/api';

export const pdfLogger = createLogger('PDFGenerator');

export { autoTable };

export interface PdfCompanyBranding {
  name?: string | null;
  logo_url?: string | null;
}

export interface PdfRgbColor {
  r: number;
  g: number;
  b: number;
}

const DEFAULT_ACCENT_COLOR: PdfRgbColor = { r: 198, g: 163, b: 100 };

const COMPANY_ACCENT_COLORS: Record<string, string> = {
  'acquatro suites': '#49726B',
  'black coders group inc.': '#000000',
  cmtbuilders: '#ED1C24',
  cmtland: '#005B38',
  gtcnow: '#001F60',
  'royal oak hospitality and leisure corporation': '#6B4D3B',
  cmtholdings: '#C6A364',
};

const normalizeCompanyName = (companyName?: string | null) =>
  companyName?.trim().toLowerCase() ?? '';

const hexToRgb = (hex: string): PdfRgbColor => {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
};

export const getCompanyAccentColor = (
  companyName?: string | null
): PdfRgbColor => {
  const hex = COMPANY_ACCENT_COLORS[normalizeCompanyName(companyName)];
  return hex ? hexToRgb(hex) : DEFAULT_ACCENT_COLOR;
};

export const getCompanyAccentHex = (companyName?: string | null): string =>
  COMPANY_ACCENT_COLORS[normalizeCompanyName(companyName)] ?? '#C6A364';

export const isBlackCoders = (companyName?: string | null): boolean =>
  normalizeCompanyName(companyName) === 'black coders group inc.';

export const getBlackCodersFooterGradient = (): { start: string; end: string } => ({
  start: '#DC2626', // red-600
  end: '#000000', // black
});

export const fetchCompanyBrandingByName = async (
  companyName?: string | null
): Promise<PdfCompanyBranding | null> => {
  const normalizedName = normalizeCompanyName(companyName);
  if (!normalizedName) return null;

  try {
    const data = await api.get<{ data?: PdfCompanyBranding[] }>(
      '/companies/public'
    );
    return (
      data?.data?.find(
        company => normalizeCompanyName(company.name) === normalizedName
      ) ?? null
    );
  } catch (error) {
    pdfLogger.warn('Failed to fetch company branding by name');
    return null;
  }
};

export const resolveCompanyBranding = async (
  branding?: PdfCompanyBranding | null
): Promise<PdfCompanyBranding | null> => {
  if (!branding) return null;
  if (branding.logo_url || !branding.name) return branding;

  const matchedBranding = await fetchCompanyBrandingByName(branding.name);
  return matchedBranding ?? branding;
};

export const addCompanyLogoToPDF = async (
  doc: jsPDF,
  logoUrl?: string | null,
  x: number = 15,
  y: number = 10,
  maxWidth: number = 50,
  maxHeight: number = 25
): Promise<void> => {
  if (!logoUrl) return;

  try {
    const resolvedLogoUrl =
      logoUrl.startsWith('/') && typeof window !== 'undefined'
        ? `${window.location.origin}${logoUrl}`
        : logoUrl;
    const response = await fetch(resolvedLogoUrl);
    if (!response.ok) return;

    const blob = await response.blob();
    const format =
      blob.type?.includes('jpeg') || blob.type?.includes('jpg')
        ? 'JPEG'
        : 'PNG';
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    await new Promise<void>(resolve => {
      const img = new Image();
      img.onload = () => {
        // Force exact dimensions for uniformity across all forms
        doc.addImage(dataUrl, format, x, y, maxWidth, maxHeight);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = dataUrl;
    });
  } catch (error) {
    pdfLogger.debug('Company logo not found, continuing without it');
  }
};

/** Max signature image size (mm) for Section B approval cells — aligned with return form PDF. */
export const PDF_SIGNATURE_MAX_WIDTH_MM = 88;
export const PDF_SIGNATURE_MAX_HEIGHT_MM = 50;

/** Sort asset rows by the numeric value of the last five digits in `code` (stable for PDF tables). */
export function sortAssetsByLast5Digits<T extends { code?: string | null }>(
  assets: T[]
): T[] {
  const tailKey = (code: string | null | undefined): number => {
    const digits = String(code ?? '').replace(/\D/g, '');
    const tail = digits.slice(-5);
    return tail.length > 0 ? Number.parseInt(tail, 10) : 0;
  };
  return [...assets].sort((a, b) => tailKey(a.code) - tailKey(b.code));
}

/** Normalize stored signature values for PDF rendering. */
export const normalizeSignatureData = (
  signatureData: string | undefined | null
): string | undefined => {
  const trimmed = signatureData?.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }
  if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length >= 100) {
    return `data:image/png;base64,${trimmed}`;
  }
  return trimmed;
};

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

    const normalized = normalizeSignatureData(signatureData);
    if (!normalized) {
      pdfLogger.debug('No signature data provided');
      return;
    }
    signatureData = normalized;

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

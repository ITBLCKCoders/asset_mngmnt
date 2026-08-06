import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createLogger } from '@/lib/logger';
import { api } from '@/lib/api';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';

export const pdfLogger = createLogger('PDFGenerator');

export const pdfDefaultStyles = {
  primaryColor: '#C6A364',
  secondaryColor: '#333333',
  fontFamily: 'helvetica',
  fontSize: 10,
  headerBgColor: '#F5F5F5',
  borderColor: '#CCCCCC',
};

export const formatPdfDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIndex = parseInt(m, 10) - 1;
  return `${months[monthIndex] ?? 'Jan'} ${parseInt(d, 10)}, ${y}`;
};

/** Cache processed signature data URLs (keyed by remote URL) for PDF generation */
const signatureImageCache = new Map<string, string>();

/** Digital signature max size (mm) — matches asset accountability form PDF */
export const PDF_SIGNATURE_MAX_WIDTH_MM = 122;
export const PDF_SIGNATURE_MAX_HEIGHT_MM = 74;

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

/** Sort assets by the last 5 digits of asset_code in ascending order */
export const sortAssetsByLast5Digits = <T extends { code: string }>(assets: T[]): T[] => {
  return [...assets].sort((a, b) => {
    const aLast5 = a.code.slice(-5);
    const bLast5 = b.code.slice(-5);
    const aNum = parseInt(aLast5, 10);
    const bNum = parseInt(bLast5, 10);
    return aNum - bNum;
  });
};

/** Format builder items for display: parent first, then indented children */
export const formatBuilderItems = <T extends { is_parent?: boolean }>(items: T[]): T[] => {
  const parent = items.find(item => item.is_parent);
  const children = items.filter(item => !item.is_parent);
  
  // Sort children by last 5 digits of code if they have a code property
  const sortedChildren = children.sort((a, b) => {
    const aCode = (a as any).code || '';
    const bCode = (b as any).code || '';
    const aLast5 = aCode.slice(-5);
    const bLast5 = bCode.slice(-5);
    const aNum = parseInt(aLast5, 10);
    const bNum = parseInt(bLast5, 10);
    return aNum - bNum;
  });
  
  return parent ? [parent, ...sortedChildren] : sortedChildren;
};

export const fetchCompanyBrandingByName = async (
  companyName?: string | null
): Promise<PdfCompanyBranding | null> => {
  const normalizedName = normalizeCompanyName(companyName);
  if (!normalizedName) return null;

  try {
    const data = await api.get<{
      companies?: PdfCompanyBranding[];
      data?: PdfCompanyBranding[];
    }>('/companies/public');
    const companies = data?.companies ?? data?.data;
    return (
      companies?.find(
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
    const proxiedUrl = proxyCloudinaryUrl(logoUrl);
    const resolvedLogoUrl =
      proxiedUrl.startsWith('/') && typeof window !== 'undefined'
        ? `${window.location.origin}${proxiedUrl}`
        : proxiedUrl;
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
        // Calculate dimensions maintaining aspect ratio
        const aspectRatio = img.width / img.height;
        let imgWidth = maxWidth;
        let imgHeight = maxWidth / aspectRatio;

        // If height exceeds maxHeight, scale down
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = maxHeight * aspectRatio;
        }

        // Add image with proper aspect ratio to prevent distortion
        doc.addImage(dataUrl, format, x, y, imgWidth, imgHeight);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = dataUrl;
    });
  } catch (error) {
    pdfLogger.debug('Company logo not found, continuing without it');
  }
};

export const addSignatureToPDF = async (
  doc: jsPDF,
  signatureData: string | undefined,
  x: number,
  y: number,
  maxWidth: number = 50,
  maxHeight: number = 20,
  /** When set, bottom edge of the image aligns to this Y (mm) instead of using `y` as top */
  anchorBottomY?: number
): Promise<void> => {
  try {
    if (!signatureData) {
      return;
    }

    const isImageSignature =
      signatureData.startsWith('data:image/') ||
      signatureData.startsWith('http://') ||
      signatureData.startsWith('https://');

    if (!isImageSignature) {
      pdfLogger.debug('Skipping non-image signature data');
      return;
    }

    const proxiedSignatureUrl = proxyCloudinaryUrl(signatureData);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    if (proxiedSignatureUrl.startsWith('http://') || proxiedSignatureUrl.startsWith('https://')) {
      const cached = signatureImageCache.get(proxiedSignatureUrl);
      img.src = cached ?? proxiedSignatureUrl;
    } else {
      img.src = proxiedSignatureUrl;
    }

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Match accountability form PDF: remove white background, keep ink colors
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            const brightness = (r + g + b) / 3;
            if (brightness > 240 && a > 0) {
              data[i + 3] = 0;
            }
          }

          ctx.putImageData(imageData, 0, 0);
          const processedDataUrl = canvas.toDataURL('image/png');

          if (
            signatureData.startsWith('http://') ||
            signatureData.startsWith('https://')
          ) {
            signatureImageCache.set(signatureData, processedDataUrl);
          }
          img.src = processedDataUrl;
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

    const format = img.src.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
    const drawY =
      anchorBottomY != null ? anchorBottomY - finalSigHeight : y;
    doc.addImage(img.src, format, x, drawY, finalSigWidth, finalSigHeight);
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

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

/**
 * Uniform signature layout (mm).
 * Every PDF template trims the scan whitespace around the ink, sizes the
 * signature to a fixed fraction of the column/cell width (equal
 * prominence everywhere), nudges it slightly left, and bottom-anchors it
 * on a shared line just below the printed-name baseline so the lower
 * strokes slightly overlap the name.
 */
export const PDF_SIGNATURE_NAME_GAP_MM = 2;
/** How far (mm) the signature bottom sits below the printed-name baseline */
export const PDF_SIGNATURE_NAME_OVERLAP_MM = 3;
/** Side padding kept between a centered signature and its cell borders */
export const PDF_SIGNATURE_CELL_PADDING_MM = 2;
/** Slight horizontal shift (mm) applied to centered signatures */
export const PDF_SIGNATURE_NUDGE_X_MM = -2;
/** Fraction of the column/cell width a centered signature may occupy */
export const PDF_SIGNATURE_FILL_RATIO = 0.5;
/**
 * Uniform signature box (mm): every PDF template renders each signature
 * aspect-fit inside this box, so all signatures render at the same visual
 * size regardless of which form generated the PDF. The column fill ratio
 * only caps the width further for narrow cells.
 */
export const PDF_SIGNATURE_STD_WIDTH_MM = 36;
export const PDF_SIGNATURE_STD_HEIGHT_MM = 18;
/** Conversion factor from image pixels to PDF millimetres (1 px @ 96 dpi). */
export const PDF_SIGNATURE_PX_TO_MM = 0.264583;

export interface SignatureFitSize {
  width: number;
  height: number;
}

/**
 * Uniform, aspect-preserving signature size shared by every PDF template.
 * Fits the ink inside a single standard box (PDF_SIGNATURE_STD_*), further
 * capped by the outer max bounds and — for cell-centered signatures — by a
 * fraction of the column width so nothing overflows its cell.
 */
export const computeSignatureFitSize = (
  inkWidth: number,
  inkHeight: number,
  options: {
    /** Column/cell width (mm) when the signature is centered in a cell */
    cellWidthMm?: number;
    /** Outer max width (mm) — defaults to PDF_SIGNATURE_MAX_WIDTH_MM */
    maxWidthMm?: number;
    /** Outer max height (mm) — defaults to PDF_SIGNATURE_MAX_HEIGHT_MM */
    maxHeightMm?: number;
    /** Fraction of the cell width a signature may occupy */
    fillRatio?: number;
  } = {}
): SignatureFitSize => {
  const {
    cellWidthMm,
    maxWidthMm = PDF_SIGNATURE_MAX_WIDTH_MM,
    maxHeightMm = PDF_SIGNATURE_MAX_HEIGHT_MM,
    fillRatio = PDF_SIGNATURE_FILL_RATIO,
  } = options;
  const srcW = Math.max(1, inkWidth);
  const srcH = Math.max(1, inkHeight);
  let boxW = Math.min(maxWidthMm, PDF_SIGNATURE_STD_WIDTH_MM);
  const boxH = Math.min(maxHeightMm, PDF_SIGNATURE_STD_HEIGHT_MM);
  if (cellWidthMm && cellWidthMm > 0) {
    const cellAllowance = Math.max(
      0,
      (cellWidthMm - PDF_SIGNATURE_CELL_PADDING_MM * 2) * fillRatio
    );
    boxW = Math.min(boxW, cellAllowance);
  }
  const scale = boxW > 0 ? Math.min(boxW / srcW, boxH / srcH) : 0;
  if (!Number.isFinite(scale) || scale <= 0) {
    return { width: 0, height: 0 };
  }
  return { width: srcW * scale, height: srcH * scale };
};

/** Horizontal bounds (mm) used to center a signature within its column/cell */
export interface PdfSignatureCenterBounds {
  /** Left edge of the column/cell (mm) */
  x: number;
  /** Width of the column/cell (mm) */
  width: number;
}

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

/**
 * Crop a signature canvas down to its ink bounding box (plus a small pad).
 * Scanned signature files usually carry large white margins that would make
 * the placed image look tiny — trimming them lets the ink fill the box.
 * Returns the original canvas when no ink pixels are found.
 */
export const cropSignatureToInk = (
  src: HTMLCanvasElement,
  pad = 8
): HTMLCanvasElement => {
  const sctx = src.getContext('2d');
  if (!sctx || !src.width || !src.height) return src;
  const w = src.width;
  const h = src.height;
  const px = sctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      if (px[(yy * w + xx) * 4 + 3] > 12) {
        if (xx < minX) minX = xx;
        if (xx > maxX) maxX = xx;
        if (yy < minY) minY = yy;
        if (yy > maxY) maxY = yy;
      }
    }
  }
  if (maxX < 0) return src;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const out = document.createElement('canvas');
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext('2d')?.drawImage(src, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
};

export const addSignatureToPDF = async (
  doc: jsPDF,
  signatureData: string | undefined,
  x: number,
  y: number,
  maxWidth: number = 50,
  maxHeight: number = 20,
  /** When set, bottom edge of the image aligns to this Y (mm) instead of using `y` as top */
  anchorBottomY?: number,
  /** When set, the image is centered horizontally within these bounds (ignores `x`) */
  centerWithin?: PdfSignatureCenterBounds,
  /** Override for PDF_SIGNATURE_FILL_RATIO (applies to centered signatures only) */
  fillRatio: number = PDF_SIGNATURE_FILL_RATIO
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

    // Pixel dimensions of the processed (possibly cropped) image — the
    // cropped data URL has a different aspect than the raw file.
    let inkWidth = 0;
    let inkHeight = 0;

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
          const cropped = cropSignatureToInk(canvas);
          inkWidth = cropped.width;
          inkHeight = cropped.height;
          const processedDataUrl = cropped.toDataURL('image/png');

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

    const sigWidth = inkWidth * PDF_SIGNATURE_PX_TO_MM;
    const sigHeight = inkHeight * PDF_SIGNATURE_PX_TO_MM;

    if (!sigWidth || !sigHeight) {
      return;
    }

    // Uniform size: every signature is aspect-fit inside the shared
    // standard box so all render at the same visual size, further capped
    // by the column width for cell-centered signatures.
    const fit = computeSignatureFitSize(sigWidth, sigHeight, {
      cellWidthMm:
        centerWithin && centerWithin.width > 0 ? centerWithin.width : undefined,
      maxWidthMm: maxWidth,
      maxHeightMm: maxHeight,
      fillRatio: fillRatio ?? PDF_SIGNATURE_FILL_RATIO,
    });

    const finalSigWidth = fit.width;
    const finalSigHeight = fit.height;

    if (!finalSigWidth || !finalSigHeight) {
      return;
    }

    const format = img.src.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
    const drawX =
      centerWithin && centerWithin.width > 0
        ? centerWithin.x +
          (centerWithin.width - finalSigWidth) / 2 +
          PDF_SIGNATURE_NUDGE_X_MM
        : x;
    const drawY =
      anchorBottomY != null ? anchorBottomY - finalSigHeight : y;
    doc.addImage(img.src, format, drawX, drawY, finalSigWidth, finalSigHeight);
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

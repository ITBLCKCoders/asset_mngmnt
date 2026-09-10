/**
 * pdfGenerator barrel.
 *
 * The PDF generation logic was previously a single 1700+-line file. It now
 * lives in `lib/pdfGenerator/` split per template (return / transfer /
 * borrowing) plus a `shared.ts` module for cross-template helpers.
 *
 * This barrel preserves the original public API so callers continue to
 * `import { generateAssetReturnPDF, downloadPDF, ... } from '@/lib/pdfGenerator'`
 * without changes.
 */

export {
  addSignatureToPDF,
  autoTable,
  downloadPDF,
  fetchActiveCompanyForAccountabilityForm,
  fetchActiveCompanyForAssetReturnForm,
  PDF_SIGNATURE_NAME_GAP_MM,
  PDF_SIGNATURE_NAME_OVERLAP_MM,
} from './shared';

export type { AssetReturnData } from './assetReturnPdf';
export { generateAssetReturnPDF } from './assetReturnPdf';

export type { AssetTransferData } from './assetTransferPdf';
export { generateAssetTransferPDF } from './assetTransferPdf';

export type { AssetBorrowingData } from './assetBorrowingPdf';
export { generateAssetBorrowingPDF } from './assetBorrowingPdf';

export type { AssetChecklistData } from './assetChecklistPdf';
export { generateAssetChecklistPDF } from './assetChecklistPdf';

export { generateAccountabilityClearancePDF } from './accountabilityClearancePdf';

export type {
  IntangibleDeactivationPdfAsset,
  IntangibleDeactivationPdfData,
} from './intangibleDeactivationPdf';
export { generateIntangibleDeactivationPDF } from './intangibleDeactivationPdf';

export { generateDashboardPDF } from './dashboardPdf';

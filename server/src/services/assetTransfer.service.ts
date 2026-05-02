/**
 * Asset transfer service — orchestration layer between controllers and the
 * repository layer for asset_transfer_forms. Handlers should call into this
 * service rather than re-implementing form-number generation or repository
 * lookups inline.
 */

// Re-export form-number helpers so handlers import a single service module.
export {
  generateTransferFormNumber,
  generateTransferFormNumberFallback,
} from '../utils/transferFormNumber.js';

// Re-export discrete repository helpers commonly used by the transfer
// controller and by the asset returns controller.
export {
  toBind,
  getTransferFormLinksForReturnForms,
  getTransferFormByReturnFormId,
  getTransferFormIdsByReturnFormId,
  getTransferFormAssignments,
} from '../repositories/assetTransferForm.repository.js';

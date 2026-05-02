/**
 * Asset Error Handling Utilities
 *
 * This utility provides asset validation and error handling functions
 * specifically for asset management operations.
 */

/**
 * Handle API errors and return user-friendly messages
 */
export const handleApiError = (error: any, context: string = 'API call') => {
  console.warn(`${context} failed:`, {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
    url: error.config?.url,
  });

  // Return user-friendly error message
  if (error.message && error.message.includes('Network Error')) {
    return 'Network connection issue. Please check your internet connection.';
  }

  if (error.response?.status === 400) {
    return (
      error.response.data?.error || 'Invalid request. Please check your input.'
    );
  }

  if (error.response?.status === 401) {
    return 'Authentication failed. Please log in again.';
  }

  if (error.response?.status === 403) {
    return 'Access denied. You do not have permission to perform this action.';
  }

  if (error.response?.status === 404) {
    return 'Resource not found. Please check the URL or try again.';
  }

  if (error.response?.status === 500) {
    return 'Server error. Please try again later.';
  }

  if (error.response?.status === 502) {
    return 'Gateway error. The server is temporarily unavailable.';
  }

  if (error.response?.status === 503) {
    return 'Service unavailable. Please try again later.';
  }

  if (error.response?.status === 504) {
    return 'Gateway timeout. The server took too long to respond.';
  }

  return error.message || 'An unexpected error occurred.';
};

/**
 * Validate asset data before update operations
 */
export const handleAssetValidationError = (assetId: string, data: any) => {
  const errors: string[] = [];

  if (!assetId) {
    errors.push('Asset ID is required');
  }

  if (
    !data.name ||
    (typeof data.name === 'string' && data.name.trim() === '')
  ) {
    errors.push('Asset name is required');
  }

  if (
    !data.categoryId ||
    (typeof data.categoryId === 'string' && data.categoryId.trim() === '')
  ) {
    errors.push('Asset category is required');
  }

  // Additional validation for asset update
  if (
    data.assetValue !== undefined &&
    (isNaN(data.assetValue) || data.assetValue < 0)
  ) {
    errors.push('Asset value must be a positive number');
  }

  // Only validate useful life years if it's not an old unit
  if (
    !data.isOldUnit &&
    data.usefulLifeYears !== undefined &&
    (isNaN(data.usefulLifeYears) || data.usefulLifeYears <= 0)
  ) {
    errors.push('Useful life years must be a positive number');
  }

  return errors;
};

/**
 * Enhanced asset update error handling
 */
export const handleAssetUpdateError = (error: any, assetData: any) => {
  console.error('Asset update failed:', {
    error: error.message,
    assetId: assetData?.assetId,
    assetName: assetData?.name,
    status: error.response?.status,
    data: error.response?.data,
  });

  // Specific error handling for asset updates
  if (error.response?.status === 500) {
    if (error.response?.data?.error?.includes('sp_update_asset')) {
      return 'Failed to update asset due to database error. Please check asset data and try again.';
    }
    if (error.response?.data?.error?.includes('foreign key')) {
      return 'Failed to update asset due to invalid reference data. Please check categories, locations, etc.';
    }
  }

  if (error.response?.status === 400) {
    if (error.response?.data?.error?.includes('FormData required')) {
      return 'Invalid request format. Please try again.';
    }
  }

  return handleApiError(error, 'Asset update');
};

// Export all functions for easy import
export default {
  handleApiError,
  handleAssetValidationError,
  handleAssetUpdateError,
};

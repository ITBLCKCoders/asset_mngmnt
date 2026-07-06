import { describe, it, expect } from 'vitest';
import { handleApiError } from '@/utils/assetErrorHandling';

describe('assetErrorHandling', () => {
  describe('handleApiError', () => {
    it('should return network error message', () => {
      const result = handleApiError({ message: 'Network Error' });
      expect(result).toBe('Network connection issue. Please check your internet connection.');
    });

    it('should return 400 error message', () => {
      const result = handleApiError({
        message: 'Bad Request',
        response: { status: 400, data: { error: 'Invalid input' } },
      });
      expect(result).toBe('Invalid input');
    });

    it('should return 401 error message', () => {
      const result = handleApiError({
        message: 'Unauthorized',
        response: { status: 401, data: { error: 'Session expired' } },
      });
      expect(result).toBe('Authentication failed. Please log in again.');
    });

    it('should return 403 error message', () => {
      const result = handleApiError({
        message: 'Forbidden',
        response: { status: 403, data: { error: 'Access denied' } },
      });
      expect(result).toBe('Access denied. You do not have permission to perform this action.');
    });

    it('should return 404 error message', () => {
      const result = handleApiError({
        message: 'Not Found',
        response: { status: 404, data: { error: 'Resource not found' } },
      });
      expect(result).toBe('Resource not found. Please check the URL or try again.');
    });

    it('should return 409 error message', () => {
      const result = handleApiError({
        message: 'Conflict',
        response: { status: 409, data: { error: 'Duplicate entry' } },
      });
      expect(result).toBe('Conflict');
    });

    it('should return 500 error message', () => {
      const result = handleApiError({
        message: 'Server Error',
        response: { status: 500, data: { error: 'Internal error' } },
      });
      expect(result).toBe('Server error. Please try again later.');
    });

    it('should return default message for unknown errors', () => {
      const result = handleApiError({ message: 'Something broke' });
      expect(result).toContain('Something broke');
    });
  });
});

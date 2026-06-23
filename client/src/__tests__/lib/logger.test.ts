import { describe, it, expect } from 'vitest';
import { createLogger } from '@/lib/logger';

describe('logger', () => {
  it('should create logger with all methods', () => {
    const logger = createLogger('test');
    expect(logger.debug).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(typeof logger.debug).toBe('function');
  });

  it('should support child loggers', () => {
    const logger = createLogger('parent');
    const child = logger.child('child');
    expect(child).toBeDefined();
    expect(typeof child.info).toBe('function');
  });
});

import { z } from 'zod';

/**
 * Type safety utilities for better development experience and runtime validation
 */

// Type guard functions for runtime type checking
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Zod schema utilities
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Validation failed: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    throw new Error('Validation failed');
  }
}

export function safeParseWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues
          .map(e => `${e.path.join('.')}: ${e.message}`)
          .join(', '),
      };
    }
    return { success: false, error: 'Validation failed' };
  }
}

// Type assertion functions
export function assertString(
  value: unknown,
  fieldName: string
): asserts value is string {
  if (!isString(value)) {
    throw new Error(`${fieldName} must be a string, got ${typeof value}`);
  }
}

export function assertNumber(
  value: unknown,
  fieldName: string
): asserts value is number {
  if (!isNumber(value)) {
    throw new Error(`${fieldName} must be a number, got ${typeof value}`);
  }
}

export function assertBoolean(
  value: unknown,
  fieldName: string
): asserts value is boolean {
  if (!isBoolean(value)) {
    throw new Error(`${fieldName} must be a boolean, got ${typeof value}`);
  }
}

export function assertArray<T>(
  value: unknown,
  fieldName: string
): asserts value is T[] {
  if (!isArray(value)) {
    throw new Error(`${fieldName} must be an array, got ${typeof value}`);
  }
}

export function assertObject(
  value: unknown,
  fieldName: string
): asserts value is Record<string, unknown> {
  if (!isObject(value)) {
    throw new Error(`${fieldName} must be an object, got ${typeof value}`);
  }
}

// Utility types for better type safety
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Type-safe object property access
export function getNestedProperty<T, K1 extends keyof T>(
  obj: T,
  key1: K1
): T[K1];
export function getNestedProperty<
  T,
  K1 extends keyof T,
  K2 extends keyof NonNullable<T[K1]>,
>(obj: T, key1: K1, key2: K2): NonNullable<T[K1]>[K2];
export function getNestedProperty<
  T,
  K1 extends keyof T,
  K2 extends keyof NonNullable<T[K1]>,
  K3 extends keyof NonNullable<NonNullable<T[K1]>[K2]>,
>(
  obj: T,
  key1: K1,
  key2: K2,
  key3: K3
): NonNullable<NonNullable<T[K1]>[K2]>[K3];
export function getNestedProperty(
  obj: unknown,
  ...keys: (string | number)[]
): unknown {
  return keys.reduce<unknown>(
    (current, key) =>
      current != null && typeof current === 'object'
        ? (current as Record<string | number, unknown>)[key]
        : undefined,
    obj
  );
}

// Type-safe object property setting
export function setNestedProperty<T, K1 extends keyof T>(
  obj: T,
  key1: K1,
  value: T[K1]
): void;
export function setNestedProperty<
  T,
  K1 extends keyof T,
  K2 extends keyof NonNullable<T[K1]>,
>(obj: T, key1: K1, key2: K2, value: NonNullable<T[K1]>[K2]): void;
export function setNestedProperty<
  T,
  K1 extends keyof T,
  K2 extends keyof NonNullable<T[K1]>,
  K3 extends keyof NonNullable<NonNullable<T[K1]>[K2]>,
>(
  obj: T,
  key1: K1,
  key2: K2,
  key3: K3,
  value: NonNullable<NonNullable<T[K1]>[K2]>[K3]
): void;
export function setNestedProperty(
  obj: Record<string | number, unknown>,
  ...args:
    | [string | number, unknown]
    | [string | number, string | number, unknown]
    | [string | number, string | number, string | number, unknown]
): void {
  const keys = args.slice(0, -1) as (string | number)[];
  const value = args[args.length - 1];

  // Ensure keys array is not empty
  if (keys.length === 0) {
    throw new Error('At least one key must be provided');
  }

  const target = keys.slice(0, -1).reduce<Record<string | number, unknown>>(
    (current, key) => {
      if (current[key] == null) {
        current[key] = {} as Record<string | number, unknown>;
      }
      return current[key] as Record<string | number, unknown>;
    },
    obj
  );

  const lastKey = keys[keys.length - 1];
  if (lastKey !== undefined) {
    target[lastKey] = value;
  }
}

// Type-safe enum validation
export function isValidEnumValue<T extends Record<string, string>>(
  enumObj: T,
  value: string
): value is T[keyof T] {
  return Object.values(enumObj).includes(value);
}

// Type-safe array operations
export function uniqueBy<T, K extends keyof T>(arr: T[], key: K): T[] {
  const seen = new Set();
  return arr.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

export function groupBy<T, K extends keyof T>(
  arr: T[],
  key: K
): Record<string, T[]> {
  return arr.reduce(
    (groups, item) => {
      const keyValue = String(item[key]);
      if (!groups[keyValue]) {
        groups[keyValue] = [];
      }
      groups[keyValue].push(item);
      return groups;
    },
    {} as Record<string, T[]>
  );
}

// Type-safe async operations
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeout)
  );

  return Promise.race([promise, timeoutPromise]);
}

export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i === maxRetries) {
        throw lastError;
      }
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }

  throw lastError!;
}

// Type-safe error handling
export class TypedError<T extends string> extends Error {
  constructor(
    public readonly type: T,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'TypedError';
  }
}

export function createTypedError<T extends string>(type: T) {
  return (message: string, details?: unknown) =>
    new TypedError(type, message, details);
}

// Type-safe validation helpers
export const validators = {
  email: (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  uuid: (value: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    ),
  phoneNumber: (value: string): boolean => /^\+?[\d\s\-\(\)]{10,}$/.test(value),
  url: (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
};

// Type-safe logging
export interface LogContext {
  userId?: string;
  requestId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
}

export function createLogger(context: LogContext = {}) {
  return {
    info: (message: string, data?: unknown) => {
      console.log('[INFO]', message, { ...context, data });
    },
    warn: (message: string, data?: unknown) => {
      console.warn('[WARN]', message, { ...context, data });
    },
    error: (message: string, error?: Error, data?: unknown) => {
      console.error('[ERROR]', message, { ...context, error, data });
    },
    debug: (message: string, data?: unknown) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[DEBUG]', message, { ...context, data });
      }
    },
  };
}

// Type-safe configuration
export function createConfig<T extends Record<string, unknown>>(
  config: T
): Readonly<T> {
  return Object.freeze(config);
}

// Type-safe feature flags
export interface FeatureFlags {
  [key: string]: boolean;
}

export function createFeatureFlags(flags: FeatureFlags) {
  return {
    isEnabled: (flag: string): boolean => {
      return flags[flag] ?? false;
    },
    enable: (flag: string) => {
      flags[flag] = true;
    },
    disable: (flag: string) => {
      flags[flag] = false;
    },
    getAll: () => ({ ...flags }),
  };
}

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file (or custom path via DOTENV_CONFIG_PATH)
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

// Environment variable validation schema
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  HTTP_PORT: z.coerce.number().default(6996),
  HTTPS_PORT: z.coerce.number().optional(),
  COOKIE_SECRET: z
    .string()
    .min(32, 'Cookie secret must be at least 32 characters'),

  // Database Configuration
  MYSQL_HOST: z.string().default('localhost'),
  MYSQL_PORT: z.coerce.number().default(3306),
  MYSQL_USER: z.string().default('root'),
  MYSQL_PASSWORD: z.string().optional(),
  MYSQL_DB: z.string().default('asset_mngmnt'),

  // JWT Configuration
  JWT_SECRET: z.string().min(64, 'JWT secret must be at least 64 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  ACCESS_TOKEN_EXPIRES: z.string().default('1500m'),
  REFRESH_TOKEN_EXPIRES: z.string().default('7d'),

  // Frontend Configuration
  FRONTEND_URL: z.string().url().default('http://localhost:9669'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:9669'),
  ALLOWED_ORIGIN_PATTERNS: z.string().optional(),

  // API public URL for Swagger and network access (e.g. http://192.168.68.33:6996)
  API_PUBLIC_URL: z.string().url().optional(),

  // Email Configuration
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // Vonage SMS Configuration (disabled — all OTP now uses email)
  // VONAGE_API_KEY: z.string().optional(),
  // VONAGE_API_SECRET: z.string().optional(),
  // VONAGE_FROM_NUMBER: z.string().optional(),

  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Security Configuration
  COOKIE_DOMAIN: z.string().default('localhost'),
});

// Normalize env names so both underscore and Railway-style names work.
const normalizedEnv = {
  ...process.env,
  HTTP_PORT: process.env.HTTP_PORT ?? process.env.PORT,
  MYSQL_HOST: process.env.MYSQL_HOST ?? process.env.MYSQLHOST,
  MYSQL_PORT: process.env.MYSQL_PORT ?? process.env.MYSQLPORT,
  MYSQL_USER: process.env.MYSQL_USER ?? process.env.MYSQLUSER,
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD ?? process.env.MYSQLPASSWORD,
  MYSQL_DB:
    process.env.MYSQL_DB ??
    process.env.MYSQLDATABASE ??
    process.env.MYSQL_DATABASE,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ?? process.env.ALLOWEDORIGINS,
  ALLOWED_ORIGIN_PATTERNS:
    process.env.ALLOWED_ORIGIN_PATTERNS ?? process.env.ALLOWEDORIGINPATTERNS,
  FRONTEND_URL: process.env.FRONTEND_URL ?? process.env.FRONTENDURL,
  API_PUBLIC_URL: process.env.API_PUBLIC_URL ?? process.env.APIPUBLICURL,
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN ?? process.env.COOKIEDOMAIN,
  // VONAGE_API_KEY: process.env.VONAGE_API_KEY ?? process.env.VONAGEAPIKEY,
  // VONAGE_API_SECRET: process.env.VONAGE_API_SECRET ?? process.env.VONAGEAPISECRET,
  // VONAGE_FROM_NUMBER: process.env.VONAGE_FROM_NUMBER ?? process.env.VONAGEFROMNUMBER,
};

// Parse and validate environment variables
const env = envSchema.safeParse(normalizedEnv);

if (!env.success) {
  console.error('❌ Invalid environment variables:');
  env.error.issues.forEach(issue => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

// Vonage SMS config validation disabled — all OTP now uses email
// export function validateVonageConfig() {
//   if (config.NODE_ENV !== 'production') {
//     return;
//   }

//   if (!config.VONAGE_API_KEY || !config.VONAGE_API_SECRET) {
//     throw new Error('Vonage SMS configuration is required in production');
//   }
// }

export const config = env.data;

// Configuration validation functions
export function validateDatabaseConfig() {
  if (!config.MYSQL_PASSWORD && config.NODE_ENV === 'production') {
    throw new Error('MYSQL_PASSWORD is required in production');
  }
}

export function validateJWTConfig() {
  if (config.NODE_ENV === 'production' && config.JWT_SECRET.length < 64) {
    throw new Error('JWT_SECRET must be at least 64 characters in production');
  }
}

export function validateEmailConfig() {
  if (config.NODE_ENV === 'production' && !config.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required in production');
  }
  if (config.NODE_ENV === 'production' && !config.RESEND_FROM_EMAIL) {
    throw new Error('RESEND_FROM_EMAIL is required in production');
  }
}

export function validateCloudinaryConfig() {
  if (
    config.NODE_ENV === 'production' &&
    (!config.CLOUDINARY_CLOUD_NAME ||
      !config.CLOUDINARY_API_KEY ||
      !config.CLOUDINARY_API_SECRET)
  ) {
    throw new Error('Cloudinary configuration is required in production');
  }
}

// Validate all configurations on startup
export function validateAllConfigs() {
  validateDatabaseConfig();
  validateJWTConfig();
  validateEmailConfig();
  validateCloudinaryConfig();
  // validateVonageConfig();
}

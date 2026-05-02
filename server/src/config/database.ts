import { config } from './validation.js';

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}

export const databaseConfig: DatabaseConfig = {
  host: config.MYSQL_HOST,
  port: config.MYSQL_PORT,
  user: config.MYSQL_USER,
  password: config.MYSQL_PASSWORD || '',
  database: config.MYSQL_DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  cookieSecret: string;
  frontendUrl: string;
  allowedOrigins: string[];
  allowedOriginPatterns: string[];
  apiPublicUrl?: string;
}

export const serverConfig: ServerConfig = {
  port: config.HTTP_PORT,
  host: '0.0.0.0',
  corsOrigins: config.ALLOWED_ORIGINS.split(',')
    .map(origin => origin.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean),
  cookieSecret: config.COOKIE_SECRET,
  frontendUrl: config.FRONTEND_URL,
  allowedOrigins: config.ALLOWED_ORIGINS.split(',')
    .map(origin => origin.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean),
  allowedOriginPatterns: (config.ALLOWED_ORIGIN_PATTERNS ?? '')
    .split(',')
    .map(pattern => pattern.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean),
  ...(config.API_PUBLIC_URL != null
    ? { apiPublicUrl: config.API_PUBLIC_URL }
    : {}),
};

interface JwtConfig {
  secret: string;
  expiresIn: string;
  accessTokenExpires: string;
  refreshTokenExpires: string;
}

export const jwtConfig: JwtConfig = {
  secret: config.JWT_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
  accessTokenExpires: config.ACCESS_TOKEN_EXPIRES,
  refreshTokenExpires: config.REFRESH_TOKEN_EXPIRES,
};

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export const cloudinaryConfig: CloudinaryConfig = {
  cloudName: config.CLOUDINARY_CLOUD_NAME || '',
  apiKey: config.CLOUDINARY_API_KEY || '',
  apiSecret: config.CLOUDINARY_API_SECRET || '',
};

interface EmailConfig {
  resendApiKey: string;
  fromEmail: string;
}

export const emailConfig: EmailConfig = {
  resendApiKey: config.RESEND_API_KEY || '',
  fromEmail: config.RESEND_FROM_EMAIL || '',
};

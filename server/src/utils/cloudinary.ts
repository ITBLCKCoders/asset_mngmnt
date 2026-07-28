import { v2 as cloudinary } from 'cloudinary';
import https from 'https';
import { Resolver } from 'dns';
import logger from '../logger.js';

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error('Missing Cloudinary environment variables');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const cloudinaryResolver = new Resolver();
cloudinaryResolver.setServers(['8.8.8.8', '1.1.1.1']);

export async function uploadToCloudinary(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'avatars',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (!result?.secure_url) {
            reject(new Error('Upload failed: No secure_url returned'));
          } else {
            resolve(result.secure_url);
          }
        }
      )
      .end(buffer);
  });
}

export async function uploadReturnConditionImageToCloudinary(
  buffer: Buffer
): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'asset-return-photos',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (!result?.secure_url) {
            reject(new Error('Upload failed: No secure_url returned'));
          } else {
            resolve(result.secure_url);
          }
        }
      )
      .end(buffer);
  });
}

/**
 * Raw files on Cloudinary often require signed URLs (401 if embedded unsigned).
 * Parses a stored delivery URL and returns a signed HTTPS URL for the same asset.
 */
export function signedRawUrlFromStoredSecureUrl(storedSecureUrl: string): string {
  try {
    const url = new URL(storedSecureUrl);
    if (!url.hostname.endsWith('cloudinary.com')) {
      return storedSecureUrl;
    }
    const parts = url.pathname.split('/').filter(Boolean);
    const uploadI = parts.indexOf('upload');
    if (uploadI === -1) {
      return storedSecureUrl;
    }
    let afterUpload = parts.slice(uploadI + 1);
    if (afterUpload[0]?.match(/^v\d+$/)) {
      afterUpload = afterUpload.slice(1);
    }
    const publicId = afterUpload.join('/');
    if (!publicId) {
      return storedSecureUrl;
    }
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      sign_url: true,
      secure: true,
    });
  } catch {
    return storedSecureUrl;
  }
}

export async function uploadDocumentToCloudinary(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'asset-documents',
          resource_type: 'raw',
          public_id: fileName,
          use_filename: true,
          unique_filename: false,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (!result?.secure_url) {
            reject(new Error('Document upload failed: No secure_url returned'));
          } else {
            resolve(result.secure_url);
          }
        }
      )
      .end(buffer);
  });
}

export async function uploadInitialsToCloudinary(
  buffer: Buffer
): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'user-initials',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (!result?.secure_url) {
            reject(new Error('Upload failed: No secure_url returned'));
          } else {
            resolve(result.secure_url);
          }
        }
      )
      .end(buffer);
  });
}

export async function deleteFromCloudinary(url: string): Promise<void> {
  try {
    const parts = url.split('/');
    const fileNameWithVersion = parts.at(-1);
    if (!fileNameWithVersion) return;

    const fileName = fileNameWithVersion.split('/').pop() || '';
    const publicIdWithoutExt = fileName.split('.').slice(0, -1).join('.');

    const publicId = `avatars/${publicIdWithoutExt}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    logger.warn('[Cloudinary] Failed to delete image:', url, err);
  }
}

/** Ping Cloudinary API to verify credentials are working. */
export async function checkCloudinaryConnection(): Promise<{
  ok: boolean;
  message: string;
  usage?: Record<string, unknown>;
}> {
  try {
    const usage = await cloudinary.api.usage();
    return {
      ok: true,
      message: 'Connected',
      usage: {
        plan: usage.plan,
        creditsUsed: usage.credits?.usage,
        creditsLimit: usage.credits?.limit,
        storageUsedBytes: usage.storage?.usage,
        bandwidthUsedBytes: usage.bandwidth?.usage,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    return { ok: false, message };
  }
}

/**
 * Fetch via standard HTTPS using system DNS (fallback).
 */
function fetchDirectHttps(
  url: string,
  timeoutMs = 15000
): Promise<{ buffer: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { rejectUnauthorized: true }, (res) => {
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        req.destroy();
        resolve(fetchDirectHttps(res.headers.location, timeoutMs));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Cloudinary returned ${res.statusCode}`));
          return;
        }
        resolve({
          buffer: Buffer.concat(chunks),
          contentType: res.headers['content-type'] || 'image/jpeg',
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('Cloudinary fetch timed out'));
    });
  });
}

/**
 * Fetch a Cloudinary image via HTTPS using a custom DNS resolver.
 * Bypasses system DNS which may block res.cloudinary.com on some networks.
 * Falls back to direct HTTPS if the custom DNS approach fails.
 */
export async function fetchCloudinaryImage(
  secureUrl: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const parsedUrl = new URL(secureUrl);
  const hostname = parsedUrl.hostname;

  if (!hostname.endsWith('.cloudinary.com')) {
    throw new Error('Not a Cloudinary URL');
  }

  try {
    const addresses = await new Promise<string[]>((resolve, reject) => {
      cloudinaryResolver.resolve4(hostname, (err, addrs) => {
        if (err) reject(err);
        else resolve(addrs ?? []);
      });
    });

    if (addresses.length === 0) {
      throw new Error(`Could not resolve ${hostname}`);
    }

    return await new Promise<{ buffer: Buffer; contentType: string }>((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: addresses[0]!,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: { Host: hostname },
        servername: hostname,
        rejectUnauthorized: true,
      };

      const req = https.get(options, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location);
          cloudinaryResolver.resolve4(redirectUrl.hostname, (redirectErr, redirectAddresses) => {
            if (redirectErr || !redirectAddresses || redirectAddresses.length === 0) {
              reject(redirectErr ?? new Error(`Could not resolve ${redirectUrl.hostname}`));
              return;
            }
            const redirectOptions: https.RequestOptions = {
              hostname: redirectAddresses[0]!,
              port: 443,
              path: redirectUrl.pathname + redirectUrl.search,
              headers: { Host: redirectUrl.hostname },
              servername: redirectUrl.hostname,
              rejectUnauthorized: true,
            };
            https.get(redirectOptions, (redirectRes) => {
              const chunks: Buffer[] = [];
              redirectRes.on('data', (chunk: Buffer) => chunks.push(chunk));
              redirectRes.on('end', () => {
                if (redirectRes.statusCode !== 200) {
                  reject(new Error(`Cloudinary returned ${redirectRes.statusCode}`));
                  return;
                }
                resolve({
                  buffer: Buffer.concat(chunks),
                  contentType: redirectRes.headers['content-type'] || 'image/jpeg',
                });
              });
            }).on('error', reject);
          });
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Cloudinary returned ${res.statusCode}`));
            return;
          }
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: res.headers['content-type'] || 'image/jpeg',
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Cloudinary fetch timed out'));
      });
    });
  } catch (err) {
    logger.warn('[Cloudinary] Custom DNS fetch failed, falling back to direct HTTPS', { url: secureUrl, error: (err as Error).message });
    return fetchDirectHttps(secureUrl);
  }
}

/** Extract the public ID from a Cloudinary secure_url. */
export function parseCloudinaryPublicId(secureUrl: string): string | null {
  try {
    const url = new URL(secureUrl);
    if (!url.hostname.endsWith('.cloudinary.com')) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const uploadI = parts.indexOf('upload');
    if (uploadI === -1) return null;
    let afterUpload = parts.slice(uploadI + 1);
    if (afterUpload[0]?.match(/^v\d+$/)) afterUpload = afterUpload.slice(1);
    return afterUpload.join('/') || null;
  } catch {
    return null;
  }
}

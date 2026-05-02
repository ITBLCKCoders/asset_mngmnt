import { v2 as cloudinary } from 'cloudinary';

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
    console.warn('[Cloudinary] Failed to delete image:', url, err);
  }
}

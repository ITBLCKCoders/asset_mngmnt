import type { Request, Response } from 'express';
import { fetchCloudinaryImage, checkCloudinaryConnection } from '../utils/cloudinary.js';
import logger from '../logger.js';

export async function proxyImageHandler(req: Request, res: Response) {
  const url = req.query.url as string | undefined;

  if (!url) {
    return res.status(400).json({ error: 'Missing "url" query parameter' });
  }

  try {
    const { buffer, contentType } = await fetchCloudinaryImage(url);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(buffer);
  } catch (err: any) {
    logger.error('[IMAGE PROXY] Failed to fetch', { url, error: err.message });
    res.status(502).json({ error: 'Failed to fetch image from Cloudinary' });
  }
}

export async function cloudinaryHealthHandler(_req: Request, res: Response) {
  const result = await checkCloudinaryConnection();
  res.json(result);
}

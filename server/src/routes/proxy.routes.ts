import { Router } from 'express';
import {
  proxyImageHandler,
  cloudinaryHealthHandler,
} from '../controllers/proxy.controller.js';

const router = Router();

/**
 * GET /api/proxy/image?url=<cloudinary_secure_url>
 *
 * Proxies Cloudinary images through the app server.
 * Bypasses DNS issues when res.cloudinary.com is blocked on the network.
 *
 * Response: image binary with appropriate Content-Type
 */
router.get('/image', proxyImageHandler);

/**
 * GET /api/proxy/cloudinary-health
 *
 * Checks Cloudinary API connectivity and returns account usage info.
 */
router.get('/cloudinary-health', cloudinaryHealthHandler);

export default router;

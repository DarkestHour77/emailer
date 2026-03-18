import { Router, Request, Response } from 'express';
import { recordOpen, recordClick } from '../data/emails';

const router = Router();

// 1x1 transparent PNG
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Track email open via pixel
router.get('/open/:trackingId.png', async (req: Request, res: Response) => {
  const trackingId = req.params.trackingId as string;

  // Record open in background — don't block the pixel response
  recordOpen(trackingId).catch(() => {});

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.end(PIXEL);
});

// Track link click and redirect
router.get('/click/:trackingId', async (req: Request, res: Response) => {
  const trackingId = req.params.trackingId as string;
  const url = req.query.url as string;

  // Record click in background
  recordClick(trackingId).catch(() => {});

  // Validate URL to prevent open redirect
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    res.redirect(302, url);
  } else {
    res.redirect(302, '/');
  }
});

export default router;

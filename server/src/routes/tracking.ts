import { Router, Request, Response } from 'express';
import db from '../config/db';
import { TRACKING_PIXEL } from '../services/trackingService';

const router = Router();

// Tracking pixel (open tracking)
router.get('/:trackingId/pixel.png', async (req: Request, res: Response) => {
  try {
    const { trackingId } = req.params;

    const recipient = await db('email_recipients').where({ tracking_id: trackingId }).first();
    if (recipient) {
      // Update open count
      await db('email_recipients').where({ tracking_id: trackingId }).update({
        open_count: recipient.open_count + 1,
        opened_at: recipient.opened_at || new Date().toISOString(),
      });

      // Log tracking event
      await db('tracking_events').insert({
        tracking_id: trackingId,
        event_type: 'open',
        ip_address: req.ip || req.headers['x-forwarded-for'] || null,
        user_agent: req.headers['user-agent'] || null,
      });
    }
  } catch (err) {
    console.error('Tracking pixel error:', err);
  }

  // Always return the pixel regardless of errors
  res.set({
    'Content-Type': 'image/png',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  res.send(TRACKING_PIXEL);
});

// Click tracking (redirect)
router.get('/:trackingId/click', async (req: Request, res: Response) => {
  try {
    const { trackingId } = req.params;
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).send('Missing url parameter');
    }

    // Basic URL validation to prevent open redirect attacks
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).send('Invalid URL protocol');
      }
    } catch {
      return res.status(400).send('Invalid URL');
    }

    const recipient = await db('email_recipients').where({ tracking_id: trackingId }).first();
    if (recipient) {
      await db('email_recipients').where({ tracking_id: trackingId }).update({
        click_count: recipient.click_count + 1,
        clicked_at: recipient.clicked_at || new Date().toISOString(),
      });

      await db('tracking_events').insert({
        tracking_id: trackingId,
        event_type: 'click',
        url,
        ip_address: req.ip || req.headers['x-forwarded-for'] || null,
        user_agent: req.headers['user-agent'] || null,
      });
    }

    res.redirect(302, url);
  } catch (err) {
    console.error('Click tracking error:', err);
    const { url } = req.query;
    if (url && typeof url === 'string') {
      res.redirect(302, url);
    } else {
      res.status(500).send('Error');
    }
  }
});

export default router;

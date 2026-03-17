import { Router, Request, Response } from 'express';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Upload image via base64 payload
router.post('/image', async (req: Request, res: Response) => {
  try {
    const { filename, contentType, data } = req.body;

    if (!filename || !contentType || !data) {
      return res.status(400).json({ error: 'filename, contentType, and data (base64) are required' });
    }

    const buffer = Buffer.from(data, 'base64');
    const ext = filename.split('.').pop() || 'png';
    const blobName = `emails/${uuidv4()}.${ext}`;

    const blob = await put(blobName, buffer, {
      contentType,
      access: 'public',
    });

    res.json({ url: blob.url });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import db from '../config/db';

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = Router();

// Upload attachment(s)
router.post('/', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const attachments = [];
    for (const file of files) {
      const [id] = await db('attachments').insert({
        email_id: 0, // Will be linked when email is sent
        filename: file.originalname,
        path: file.path,
        mime_type: file.mimetype,
        size_bytes: file.size,
      });
      attachments.push({ id, filename: file.originalname, size: file.size });
    }

    res.json(attachments);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

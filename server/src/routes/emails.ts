import { Router, Request, Response } from 'express';
import { sendEmail } from '../services/emailService';
import { getContactById } from '../data/contacts';
import { listEmails, getEmailDetail } from '../data/emails';

const router = Router();

// List sent emails with aggregate stats
router.get('/', async (_req: Request, res: Response) => {
  try {
    const emails = await listEmails();
    res.json(emails);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get email detail with per-recipient tracking
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const detail = await getEmailDetail(id);
    if (!detail) return res.status(404).json({ error: 'Email not found' });
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Send email immediately
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { contactIds, subject, bodyHtml, previewText, templateId } = req.body;

    if (!contactIds?.length || !subject || !bodyHtml) {
      return res.status(400).json({ error: 'contactIds, subject, and bodyHtml are required' });
    }

    const result = await sendEmail({ contactIds, subject, bodyHtml, previewText, templateId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Preview email (resolve template with a contact)
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { bodyHtml, contactId } = req.body;
    let contact: { username: string; email: string } = { username: 'JohnDoe', email: 'john@example.com' };

    if (contactId) {
      const found = await getContactById(contactId);
      if (found) contact = found;
    }

    const html = (bodyHtml || '')
      .replace(/\{\{username\}\}/g, contact.username)
      .replace(/\{\{email\}\}/g, contact.email);

    res.json({ html });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

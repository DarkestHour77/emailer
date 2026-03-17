import { Router, Request, Response } from 'express';
import { sendEmail } from '../services/emailService';
import { getContactById } from '../data/contacts';

const router = Router();

// Send email immediately
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { contactIds, subject, bodyHtml } = req.body;

    if (!contactIds?.length || !subject || !bodyHtml) {
      return res.status(400).json({ error: 'contactIds, subject, and bodyHtml are required' });
    }

    const result = await sendEmail({ contactIds, subject, bodyHtml });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Preview email (resolve template with a contact)
router.post('/preview', (req: Request, res: Response) => {
  try {
    const { bodyHtml, contactId } = req.body;
    let contact = { username: 'JohnDoe', email: 'john@example.com' };

    if (contactId) {
      const found = getContactById(contactId);
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

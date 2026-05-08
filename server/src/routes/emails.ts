import { Router, Request, Response } from 'express';
import { sendEmail, scheduleEmail } from '../services/emailService';
import { getContactById, getContactsByIdsForList, getContactListById, detectEmailColumn, detectNameColumn } from '../data/contacts';
import { listEmails, getEmailDetail, listScheduledEmails, cancelScheduledEmail } from '../data/emails';

const router = Router();

// List sent emails with aggregate stats
router.get('/', async (_req: Request, res: Response) => {
  try {
    const emails = await listEmails();
    res.json({ data: emails, total: emails.length, page: 1, limit: emails.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// List scheduled emails (must be before /:id to avoid matching "scheduled" as an id)
router.get('/scheduled', async (_req: Request, res: Response) => {
  try {
    const emails = await listScheduledEmails();
    res.json({ data: emails, total: emails.length, page: 1, limit: emails.length });
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
    const { contactIds, subject, bodyHtml, previewText, templateId, listId } = req.body;

    if (!contactIds?.length || !subject || !bodyHtml) {
      return res.status(400).json({ error: 'contactIds, subject, and bodyHtml are required' });
    }

    const result = await sendEmail({ contactIds, subject, bodyHtml, previewText, templateId, listId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Preview email (resolve template with a contact)
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { bodyHtml, contactId, listId } = req.body;
    let vars: Record<string, string> = { username: 'JohnDoe', email: 'john@example.com' };

    if (listId && contactId) {
      const listContacts = await getContactsByIdsForList(listId, [contactId]);
      if (listContacts.length > 0) {
        const contact = listContacts[0];
        const listMeta = await getContactListById(listId);
        const columns = listMeta?.columns || Object.keys(contact).filter((k) => k !== 'id');
        const emailCol = detectEmailColumn(columns);
        const nameCol = detectNameColumn(columns);
        vars = {};
        for (const [key, val] of Object.entries(contact)) {
          if (key === 'id') continue;
          vars[key] = String(val ?? '');
        }
        vars['email'] = String(contact[emailCol] ?? '');
        if (nameCol) vars['username'] = String(contact[nameCol] ?? '');
      }
    } else if (contactId) {
      const found = await getContactById(contactId);
      if (found) vars = { username: found.username, email: found.email };
    }

    const html = (bodyHtml || '').replace(/\{\{(\w[\w\s]*?)\}\}/g, (match: string, key: string) => {
      return vars[key.trim()] ?? match;
    });

    res.json({ html });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Schedule email for later
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const { contactIds, subject, bodyHtml, previewText, templateId, scheduledAt, listId } = req.body;

    if (!contactIds?.length || !subject || !bodyHtml || !scheduledAt) {
      return res.status(400).json({ error: 'contactIds, subject, bodyHtml, and scheduledAt are required' });
    }

    const scheduled = new Date(scheduledAt);
    if (isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'scheduledAt must be a valid future date' });
    }

    const result = await scheduleEmail({ contactIds, subject, bodyHtml, previewText, templateId, scheduledAt, listId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Cancel a scheduled email
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    await cancelScheduledEmail(req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db';
import { env } from '../config/env';
import { sendEmail } from '../services/emailService';
import { resolveTemplate } from '../services/trackingService';
import { scheduleTimer } from '../services/schedulerService';

const router = Router();

// Send email immediately
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { contactIds, subject, bodyHtml, templateId, attachmentIds } = req.body;

    if (!contactIds?.length || !subject || !bodyHtml) {
      return res.status(400).json({ error: 'contactIds, subject, and bodyHtml are required' });
    }

    const emailId = await sendEmail({ contactIds, subject, bodyHtml, templateId, attachmentIds });
    res.json({ emailId, status: 'sent' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Preview email (resolve template with first contact)
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { bodyHtml, contactId } = req.body;
    let contact = { username: 'JohnDoe', email: 'john@example.com' };

    if (contactId) {
      const dbContact = await db('contacts').where({ id: contactId }).first();
      if (dbContact) contact = dbContact;
    }

    const resolved = resolveTemplate(bodyHtml || '', contact);
    res.json({ html: resolved });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Schedule email
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const { contactIds, subject, bodyHtml, templateId, attachmentIds, scheduledAt } = req.body;

    if (!contactIds?.length || !subject || !bodyHtml || !scheduledAt) {
      return res.status(400).json({ error: 'contactIds, subject, bodyHtml, and scheduledAt are required' });
    }

    const scheduledTime = new Date(scheduledAt);
    if (scheduledTime.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'scheduledAt must be in the future' });
    }

    // Create email record
    const [emailId] = await db('emails').insert({
      template_id: templateId || null,
      subject,
      body_html: bodyHtml,
      sender_email: env.senderEmail,
      status: 'scheduled',
      scheduled_at: scheduledAt,
    });

    // Create recipient records
    const contacts = await db('contacts').whereIn('id', contactIds);
    for (const contact of contacts) {
      await db('email_recipients').insert({
        email_id: emailId,
        contact_id: contact.id,
        tracking_id: uuidv4(),
      });
    }

    // Link attachments
    if (attachmentIds?.length) {
      await db('attachments').whereIn('id', attachmentIds).update({ email_id: emailId });
    }

    // Schedule timer
    const delayMs = scheduledTime.getTime() - Date.now();
    scheduleTimer(emailId, delayMs);

    res.json({ emailId, status: 'scheduled', scheduledAt });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// List sent/scheduled emails with tracking summary
router.get('/', async (_req: Request, res: Response) => {
  try {
    const emails = await db('emails').orderBy('created_at', 'desc');

    const emailsWithStats = await Promise.all(
      emails.map(async (email: any) => {
        const recipients = await db('email_recipients').where({ email_id: email.id });
        const totalRecipients = recipients.length;
        const opened = recipients.filter((r: any) => r.open_count > 0).length;
        const clicked = recipients.filter((r: any) => r.click_count > 0).length;

        return {
          ...email,
          recipientCount: totalRecipients,
          openRate: totalRecipients ? Math.round((opened / totalRecipients) * 100) : 0,
          clickRate: totalRecipients ? Math.round((clicked / totalRecipients) * 100) : 0,
        };
      })
    );

    res.json(emailsWithStats);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get email detail with per-recipient tracking
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const email = await db('emails').where({ id: req.params.id }).first();
    if (!email) return res.status(404).json({ error: 'Email not found' });

    const recipients = await db('email_recipients')
      .where({ email_id: email.id })
      .join('contacts', 'email_recipients.contact_id', 'contacts.id')
      .select(
        'contacts.username',
        'contacts.email',
        'email_recipients.tracking_id',
        'email_recipients.opened_at',
        'email_recipients.open_count',
        'email_recipients.clicked_at',
        'email_recipients.click_count'
      );

    res.json({ ...email, recipients });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

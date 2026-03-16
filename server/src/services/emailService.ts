import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import db from '../config/db';
import { sendMailViaGraph } from '../config/mailer';
import { env } from '../config/env';
import { resolveTemplate, injectTrackingPixel, rewriteLinks } from './trackingService';

interface SendEmailOptions {
  contactIds: number[];
  subject: string;
  bodyHtml: string;
  templateId?: number;
  attachmentIds?: number[];
}

export async function sendEmail(options: SendEmailOptions): Promise<number> {
  const { contactIds, subject, bodyHtml, templateId, attachmentIds } = options;

  // Create email record
  const [emailId] = await db('emails').insert({
    template_id: templateId || null,
    subject,
    body_html: bodyHtml,
    sender_email: env.senderEmail,
    status: 'pending',
  });

  // Get contacts
  const contacts = await db('contacts').whereIn('id', contactIds);

  // Get attachments if any
  let graphAttachments: { filename: string; contentBytes: string; contentType: string }[] = [];
  if (attachmentIds && attachmentIds.length > 0) {
    const attachmentRows = await db('attachments').whereIn('id', attachmentIds);
    graphAttachments = attachmentRows.map((a: any) => ({
      filename: a.filename,
      contentBytes: readFileSync(a.path).toString('base64'),
      contentType: a.mime_type || 'application/octet-stream',
    }));
    await db('attachments').whereIn('id', attachmentIds).update({ email_id: emailId });
  }

  // Send to each contact
  for (const contact of contacts) {
    const trackingId = uuidv4();

    // Create recipient record
    await db('email_recipients').insert({
      email_id: emailId,
      contact_id: contact.id,
      tracking_id: trackingId,
    });

    // Resolve template placeholders
    let html = resolveTemplate(bodyHtml, contact);
    html = rewriteLinks(html, trackingId);
    html = injectTrackingPixel(html, trackingId);

    const resolvedSubject = resolveTemplate(subject, contact);

    try {
      await sendMailViaGraph({
        to: contact.email,
        subject: resolvedSubject,
        html,
        attachments: graphAttachments.length > 0 ? graphAttachments : undefined,
      });
      console.log(`Sent to ${contact.email}`);
    } catch (err) {
      console.error(`Failed to send to ${contact.email}:`, err);
    }
  }

  // Mark as sent
  await db('emails').where({ id: emailId }).update({
    status: 'sent',
    sent_at: db.fn.now(),
  });

  return emailId;
}

export async function sendScheduledEmail(emailId: number): Promise<void> {
  const email = await db('emails').where({ id: emailId }).first();
  if (!email || email.status !== 'scheduled') return;

  const recipients = await db('email_recipients')
    .where({ email_id: emailId })
    .join('contacts', 'email_recipients.contact_id', 'contacts.id')
    .select('contacts.*', 'email_recipients.tracking_id');

  // Get attachments
  let graphAttachments: { filename: string; contentBytes: string; contentType: string }[] = [];
  const attachmentRows = await db('attachments').where({ email_id: emailId });
  if (attachmentRows.length > 0) {
    graphAttachments = attachmentRows.map((a: any) => ({
      filename: a.filename,
      contentBytes: readFileSync(a.path).toString('base64'),
      contentType: a.mime_type || 'application/octet-stream',
    }));
  }

  for (const recipient of recipients) {
    let html = resolveTemplate(email.body_html, recipient);
    html = rewriteLinks(html, recipient.tracking_id);
    html = injectTrackingPixel(html, recipient.tracking_id);

    const resolvedSubject = resolveTemplate(email.subject, recipient);

    try {
      await sendMailViaGraph({
        to: recipient.email,
        subject: resolvedSubject,
        html,
        attachments: graphAttachments.length > 0 ? graphAttachments : undefined,
      });
      console.log(`Sent scheduled email to ${recipient.email}`);
    } catch (err) {
      console.error(`Failed to send scheduled email to ${recipient.email}:`, err);
    }
  }

  await db('emails').where({ id: emailId }).update({
    status: 'sent',
    sent_at: db.fn.now(),
  });
}

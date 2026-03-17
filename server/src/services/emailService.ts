import { sendMailViaGraph } from '../config/mailer';
import { getContactsByIds } from '../data/contacts';

interface SendEmailOptions {
  contactIds: number[];
  subject: string;
  bodyHtml: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ sent: number; failed: number }> {
  const { contactIds, subject, bodyHtml } = options;
  const contacts = getContactsByIds(contactIds);

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    const html = bodyHtml
      .replace(/\{\{username\}\}/g, contact.username)
      .replace(/\{\{email\}\}/g, contact.email);

    const resolvedSubject = subject
      .replace(/\{\{username\}\}/g, contact.username)
      .replace(/\{\{email\}\}/g, contact.email);

    try {
      await sendMailViaGraph({ to: contact.email, subject: resolvedSubject, html });
      sent++;
      console.log(`Sent to ${contact.email}`);
    } catch (err) {
      failed++;
      console.error(`Failed to send to ${contact.email}:`, err);
    }
  }

  return { sent, failed };
}

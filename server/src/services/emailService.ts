import { sendMailViaGraph } from '../config/mailer';
import { getContactsByIds } from '../data/contacts';

interface SendEmailOptions {
  contactIds: number[];
  subject: string;
  bodyHtml: string;
  previewText?: string;
}

function injectPreheader(html: string, previewText: string): string {
  const preheader = `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}</div>`;
  // Inject after <body> tag if present, otherwise prepend
  if (html.includes('<body')) {
    return html.replace(/(<body[^>]*>)/i, `$1${preheader}`);
  }
  return preheader + html;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ sent: number; failed: number }> {
  const { contactIds, subject, bodyHtml, previewText } = options;
  const contacts = getContactsByIds(contactIds);

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    let html = bodyHtml
      .replace(/\{\{username\}\}/g, contact.username)
      .replace(/\{\{email\}\}/g, contact.email);

    if (previewText) {
      const resolvedPreview = previewText
        .replace(/\{\{username\}\}/g, contact.username)
        .replace(/\{\{email\}\}/g, contact.email);
      html = injectPreheader(html, resolvedPreview);
    }

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

import { sendMailViaGraph } from '../config/mailer';
import { getContactsByIds } from '../data/contacts';
import { createEmailRecord, addRecipient, updateEmailStatus } from '../data/emails';
import { env } from '../config/env';

interface SendEmailOptions {
  contactIds: number[];
  subject: string;
  bodyHtml: string;
  previewText?: string;
  templateId?: string;
}

function injectPreheader(html: string, previewText: string): string {
  const preheader = `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}</div>`;
  if (html.includes('<body')) {
    return html.replace(/(<body[^>]*>)/i, `$1${preheader}`);
  }
  return preheader + html;
}

function injectTrackingPixel(html: string, trackingId: string): string {
  const pixel = `<img src="${env.appUrl}/api/track/open/${trackingId}.png" width="1" height="1" style="display:none" alt="" />`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }
  return html + pixel;
}

function rewriteLinks(html: string, trackingId: string): string {
  return html.replace(
    /<a\s([^>]*?)href=["']([^"']+)["']/gi,
    (match, before, url) => {
      // Skip mailto:, tel:, and anchor links
      if (/^(mailto:|tel:|#)/i.test(url)) return match;
      // Skip tracking URLs to avoid double-wrapping
      if (url.includes('/api/track/')) return match;
      const redirectUrl = `${env.appUrl}/api/track/click/${trackingId}?url=${encodeURIComponent(url)}`;
      return `<a ${before}href="${redirectUrl}"`;
    }
  );
}

export async function sendEmail(options: SendEmailOptions): Promise<{ sent: number; failed: number; emailId: string }> {
  const { contactIds, subject, bodyHtml, previewText, templateId } = options;
  const contacts = getContactsByIds(contactIds);

  // Create email record in KV
  const emailRecord = await createEmailRecord({
    subject,
    body_html: bodyHtml,
    template_id: templateId,
    sender_email: env.senderEmail,
  });

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

    // Create recipient tracking record and get trackingId
    const trackingId = await addRecipient(emailRecord.id, {
      contactId: contact.id,
      email: contact.email,
      name: contact.username,
    });

    // Inject tracking pixel and rewrite links
    html = rewriteLinks(html, trackingId);
    html = injectTrackingPixel(html, trackingId);

    try {
      await sendMailViaGraph({ to: contact.email, subject: resolvedSubject, html });
      sent++;
      console.log(`Sent to ${contact.email}`);
    } catch (err) {
      failed++;
      console.error(`Failed to send to ${contact.email}:`, err);
    }
  }

  // Update email status
  const status = failed === 0 ? 'sent' : sent === 0 ? 'failed' : 'partial';
  await updateEmailStatus(emailRecord.id, status);

  return { sent, failed, emailId: emailRecord.id };
}

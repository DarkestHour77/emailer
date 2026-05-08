import { sendMailViaSES } from '../config/mailer';
import { getContactsByIds, getContactsByIdsForList, getContactListById, detectEmailColumn, detectNameColumn } from '../data/contacts';
import type { DynamicContact } from '../data/contacts';
import {
  createEmailRecord,
  addRecipient,
  updateEmailStatus,
  getDueScheduledEmails,
  type EmailRecord,
} from '../data/emails';
import { env } from '../config/env';
import { waitForNextEmailSend } from '../utils/rateLimiter';

interface SendEmailOptions {
  contactIds: number[];
  subject: string;
  bodyHtml: string;
  previewText?: string;
  templateId?: string;
  listId?: string;
}

function resolveTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w[\w\s]*?)\}\}/g, (match, key) => {
    return vars[key.trim()] ?? match;
  });
}

function buildVarsFromDynamicContact(contact: DynamicContact, emailCol: string, nameCol: string | null): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, val] of Object.entries(contact)) {
    if (key === 'id') continue;
    vars[key] = String(val ?? '');
  }
  // Map standard template vars to detected columns
  vars['email'] = String(contact[emailCol] ?? '');
  if (nameCol) vars['username'] = String(contact[nameCol] ?? '');
  return vars;
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
  const { contactIds, subject, bodyHtml, previewText, templateId, listId } = options;

  // Create email record in KV
  const emailRecord = await createEmailRecord({
    subject,
    body_html: bodyHtml,
    template_id: templateId,
    sender_email: env.senderEmail,
  });

  let sent = 0;
  let failed = 0;

  if (listId) {
    // Contacts from a custom list (DynamicContact)
    const listContacts = await getContactsByIdsForList(listId, contactIds);
    const listMeta = await getContactListById(listId);
    const columns = listMeta?.columns || Object.keys(listContacts[0] || {}).filter((k) => k !== 'id');
    const emailCol = detectEmailColumn(columns);
    const nameCol = detectNameColumn(columns);

    for (const contact of listContacts) {
      // Wait for rate limit before sending each email
      await waitForNextEmailSend();

      const vars = buildVarsFromDynamicContact(contact, emailCol, nameCol);
      let html = resolveTemplate(bodyHtml, vars);

      if (previewText) {
        html = injectPreheader(html, resolveTemplate(previewText, vars));
      }

      const resolvedSubject = resolveTemplate(subject, vars);
      const contactEmail = vars['email'];
      const contactName = vars['username'] || contactEmail;

      const trackingId = await addRecipient(emailRecord.id, {
        contactId: contact.id,
        email: contactEmail,
        name: contactName,
      });

      html = rewriteLinks(html, trackingId);
      html = injectTrackingPixel(html, trackingId);

      try {
        await sendMailViaSES({ to: contactEmail, subject: resolvedSubject, html });
        sent++;
      } catch (err) {
        failed++;
        console.error(`Failed to send to ${contactEmail}:`, err);
      }
    }
  } else {
    // Standard contacts
    const contacts = await getContactsByIds(contactIds);

    for (const contact of contacts) {
      // Wait for rate limit before sending each email
      await waitForNextEmailSend();

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

      const trackingId = await addRecipient(emailRecord.id, {
        contactId: contact.id,
        email: contact.email,
        name: contact.username,
      });

      html = rewriteLinks(html, trackingId);
      html = injectTrackingPixel(html, trackingId);

      try {
        await sendMailViaSES({ to: contact.email, subject: resolvedSubject, html });
        sent++;
      } catch (err) {
        failed++;
        console.error(`Failed to send to ${contact.email}:`, err);
      }
    }
  }

  // Update email status
  const status = failed === 0 ? 'sent' : sent === 0 ? 'failed' : 'partial';
  await updateEmailStatus(emailRecord.id, status);

  return { sent, failed, emailId: emailRecord.id };
}

interface ScheduleEmailOptions extends SendEmailOptions {
  scheduledAt: string;
}

export async function scheduleEmail(options: ScheduleEmailOptions): Promise<{ emailId: string; scheduledAt: string }> {
  const { contactIds, subject, bodyHtml, previewText, templateId, scheduledAt, listId } = options;

  const emailRecord = await createEmailRecord({
    subject,
    body_html: bodyHtml,
    template_id: templateId,
    sender_email: env.senderEmail,
    scheduled_at: scheduledAt,
    contact_ids: contactIds,
    preview_text: previewText,
    list_id: listId,
  });

  return { emailId: emailRecord.id, scheduledAt };
}

async function sendScheduledEmail(record: EmailRecord): Promise<void> {
  if (!record.contact_ids || record.contact_ids.length === 0) return;

  // Reuse sendEmail logic which handles both standard and list contacts
  await sendEmail({
    contactIds: record.contact_ids,
    subject: record.subject,
    bodyHtml: record.body_html,
    previewText: record.preview_text || undefined,
    templateId: record.template_id || undefined,
    listId: record.list_id || undefined,
  });

  // Mark original record as sent so it won't be picked up again
  await updateEmailStatus(record.id, 'sent');
}

let isProcessing = false;

export async function processScheduledEmails(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const dueEmails = await getDueScheduledEmails();
    for (const email of dueEmails) {
      try {
        await sendScheduledEmail(email);
      } catch (err) {
        console.error(`[Scheduler] Error processing email ${email.id}:`, err);
      }
    }
  } finally {
    isProcessing = false;
  }
}

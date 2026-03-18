import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

export interface EmailRecord {
  id: string;
  subject: string;
  body_html: string;
  template_id: string | null;
  sender_email: string;
  status: 'sent' | 'partial' | 'failed';
  total_recipients: number;
  total_opens: number;
  total_clicks: number;
  sent_at: string;
  created_at: string;
}

export interface RecipientTracking {
  trackingId: string;
  contactId: number;
  emailId: string;
  email: string;
  name: string;
  opened_at: string | null;
  open_count: number;
  clicked_at: string | null;
  click_count: number;
}

const EMAILS_KEY = 'emails:list';
const emailKey = (id: string) => `email:${id}`;
const recipientsKey = (emailId: string) => `email:${emailId}:recipients`;
const trackingKey = (trackingId: string) => `tracking:${trackingId}`;

export async function createEmailRecord(data: {
  subject: string;
  body_html: string;
  template_id?: string;
  sender_email: string;
}): Promise<EmailRecord> {
  const now = new Date().toISOString();
  const record: EmailRecord = {
    id: uuidv4(),
    subject: data.subject,
    body_html: data.body_html,
    template_id: data.template_id || null,
    sender_email: data.sender_email,
    status: 'sent',
    total_recipients: 0,
    total_opens: 0,
    total_clicks: 0,
    sent_at: now,
    created_at: now,
  };

  await kv.set(emailKey(record.id), record);
  await kv.zadd(EMAILS_KEY, { score: Date.now(), member: record.id });

  return record;
}

export async function addRecipient(
  emailId: string,
  data: { contactId: number; email: string; name: string }
): Promise<string> {
  const trackingId = uuidv4();
  const recipient: RecipientTracking = {
    trackingId,
    contactId: data.contactId,
    emailId,
    email: data.email,
    name: data.name,
    opened_at: null,
    open_count: 0,
    clicked_at: null,
    click_count: 0,
  };

  await kv.set(trackingKey(trackingId), recipient);
  await kv.zadd(recipientsKey(emailId), { score: Date.now(), member: trackingId });

  // Increment total_recipients on email record
  const email = await kv.get<EmailRecord>(emailKey(emailId));
  if (email) {
    email.total_recipients++;
    await kv.set(emailKey(emailId), email);
  }

  return trackingId;
}

export async function recordOpen(trackingId: string): Promise<void> {
  const recipient = await kv.get<RecipientTracking>(trackingKey(trackingId));
  if (!recipient) return;

  const isFirstOpen = !recipient.opened_at;
  recipient.open_count++;
  if (isFirstOpen) {
    recipient.opened_at = new Date().toISOString();
  }
  await kv.set(trackingKey(trackingId), recipient);

  // Increment unique opens on email record only on first open
  if (isFirstOpen) {
    const email = await kv.get<EmailRecord>(emailKey(recipient.emailId));
    if (email) {
      email.total_opens++;
      await kv.set(emailKey(recipient.emailId), email);
    }
  }
}

export async function recordClick(trackingId: string): Promise<void> {
  const recipient = await kv.get<RecipientTracking>(trackingKey(trackingId));
  if (!recipient) return;

  const isFirstClick = !recipient.clicked_at;
  recipient.click_count++;
  if (isFirstClick) {
    recipient.clicked_at = new Date().toISOString();
  }
  await kv.set(trackingKey(trackingId), recipient);

  if (isFirstClick) {
    const email = await kv.get<EmailRecord>(emailKey(recipient.emailId));
    if (email) {
      email.total_clicks++;
      await kv.set(emailKey(recipient.emailId), email);
    }
  }
}

export async function updateEmailStatus(
  emailId: string,
  status: 'sent' | 'partial' | 'failed'
): Promise<void> {
  const email = await kv.get<EmailRecord>(emailKey(emailId));
  if (email) {
    email.status = status;
    await kv.set(emailKey(emailId), email);
  }
}

export async function listEmails(): Promise<EmailRecord[]> {
  const ids = await kv.zrange(EMAILS_KEY, 0, -1);
  if (!ids.length) return [];

  const keys = (ids as string[]).map(emailKey);
  const emails = await kv.mget<EmailRecord[]>(...keys);
  return emails.filter(Boolean).reverse();
}

export async function getEmailDetail(
  emailId: string
): Promise<{ email: EmailRecord; recipients: RecipientTracking[] } | null> {
  const email = await kv.get<EmailRecord>(emailKey(emailId));
  if (!email) return null;

  const trackingIds = await kv.zrange(recipientsKey(emailId), 0, -1);
  if (!trackingIds.length) return { email, recipients: [] };

  const keys = (trackingIds as string[]).map(trackingKey);
  const recipients = await kv.mget<RecipientTracking[]>(...keys);

  return { email, recipients: recipients.filter(Boolean) };
}

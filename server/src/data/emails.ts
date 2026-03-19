import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

export interface EmailRecord {
  id: string;
  subject: string;
  body_html: string;
  template_id: string | null;
  sender_email: string;
  status: 'sent' | 'partial' | 'failed' | 'scheduled' | 'cancelled';
  total_recipients: number;
  total_opens: number;
  total_clicks: number;
  sent_at: string;
  created_at: string;
  scheduled_at: string | null;
  contact_ids: number[] | null;
  preview_text: string | null;
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
const SCHEDULED_KEY = 'emails:scheduled';
const emailKey = (id: string) => `email:${id}`;
const recipientsKey = (emailId: string) => `email:${emailId}:recipients`;
const trackingKey = (trackingId: string) => `tracking:${trackingId}`;

export async function createEmailRecord(data: {
  subject: string;
  body_html: string;
  template_id?: string;
  sender_email: string;
  scheduled_at?: string;
  contact_ids?: number[];
  preview_text?: string;
}): Promise<EmailRecord> {
  const now = new Date().toISOString();
  const isScheduled = !!data.scheduled_at;
  const record: EmailRecord = {
    id: uuidv4(),
    subject: data.subject,
    body_html: data.body_html,
    template_id: data.template_id || null,
    sender_email: data.sender_email,
    status: isScheduled ? 'scheduled' : 'sent',
    total_recipients: 0,
    total_opens: 0,
    total_clicks: 0,
    sent_at: isScheduled ? '' : now,
    created_at: now,
    scheduled_at: data.scheduled_at || null,
    contact_ids: data.contact_ids || null,
    preview_text: data.preview_text || null,
  };

  await kv.set(emailKey(record.id), record);
  await kv.zadd(EMAILS_KEY, { score: Date.now(), member: record.id });

  if (isScheduled) {
    const scheduledTime = new Date(data.scheduled_at!).getTime();
    await kv.zadd(SCHEDULED_KEY, { score: scheduledTime, member: record.id });
  }

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
  status: EmailRecord['status']
): Promise<void> {
  const email = await kv.get<EmailRecord>(emailKey(emailId));
  if (email) {
    email.status = status;
    await kv.set(emailKey(emailId), email);
    // Remove from scheduled set when no longer scheduled
    if (status !== 'scheduled') {
      await kv.zrem(SCHEDULED_KEY, emailId);
    }
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

export async function getDueScheduledEmails(): Promise<EmailRecord[]> {
  const ids = await kv.zrange(SCHEDULED_KEY, 0, Date.now(), { byScore: true });
  if (!ids.length) return [];

  const keys = (ids as string[]).map(emailKey);
  const emails = await kv.mget<EmailRecord[]>(...keys);
  return emails.filter((e) => e && e.status === 'scheduled') as EmailRecord[];
}

export async function listScheduledEmails(): Promise<EmailRecord[]> {
  const ids = await kv.zrange(SCHEDULED_KEY, 0, -1);
  if (!ids.length) return [];

  const keys = (ids as string[]).map(emailKey);
  const emails = await kv.mget<EmailRecord[]>(...keys);
  return emails.filter((e) => e && e.status === 'scheduled') as EmailRecord[];
}

export async function cancelScheduledEmail(emailId: string): Promise<void> {
  const email = await kv.get<EmailRecord>(emailKey(emailId));
  if (!email) throw new Error('Email not found');
  if (email.status !== 'scheduled') throw new Error('Email is not scheduled');

  email.status = 'cancelled';
  await kv.set(emailKey(emailId), email);
  await kv.zrem(SCHEDULED_KEY, emailId);
}

export async function getEmailRecord(emailId: string): Promise<EmailRecord | null> {
  return kv.get<EmailRecord>(emailKey(emailId));
}

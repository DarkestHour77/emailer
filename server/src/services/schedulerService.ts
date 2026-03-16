import cron from 'node-cron';
import db from '../config/db';
import { sendScheduledEmail } from './emailService';

const timers = new Map<number, NodeJS.Timeout>();

export async function init(): Promise<void> {
  console.log('Initializing scheduler...');

  // Recover pending scheduled emails
  const scheduled = await db('emails').where({ status: 'scheduled' });

  for (const email of scheduled) {
    const scheduledAt = new Date(email.scheduled_at).getTime();
    const now = Date.now();

    if (scheduledAt <= now) {
      // Overdue — send immediately
      console.log(`Sending overdue scheduled email #${email.id}`);
      sendScheduledEmail(email.id).catch(console.error);
    } else {
      // Schedule for future
      scheduleTimer(email.id, scheduledAt - now);
    }
  }

  // Safety net: poll every 5 minutes for any missed schedules
  cron.schedule('*/5 * * * *', async () => {
    const due = await db('emails')
      .where({ status: 'scheduled' })
      .where('scheduled_at', '<=', new Date().toISOString());

    for (const email of due) {
      if (!timers.has(email.id)) {
        console.log(`Cron catch-up: sending email #${email.id}`);
        sendScheduledEmail(email.id).catch(console.error);
      }
    }
  });

  console.log('Scheduler initialized');
}

export function scheduleTimer(emailId: number, delayMs: number): void {
  cancelTimer(emailId);
  const timer = setTimeout(async () => {
    timers.delete(emailId);
    await sendScheduledEmail(emailId);
  }, delayMs);
  timers.set(emailId, timer);
}

export function cancelTimer(emailId: number): void {
  const existing = timers.get(emailId);
  if (existing) {
    clearTimeout(existing);
    timers.delete(emailId);
  }
}

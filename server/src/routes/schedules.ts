import { Router, Request, Response } from 'express';
import db from '../config/db';
import { cancelTimer, scheduleTimer } from '../services/schedulerService';

const router = Router();

// List pending scheduled emails
router.get('/', async (_req: Request, res: Response) => {
  try {
    const schedules = await db('emails')
      .where({ status: 'scheduled' })
      .orderBy('scheduled_at', 'asc');

    const schedulesWithRecipients = await Promise.all(
      schedules.map(async (s: any) => {
        const count = await db('email_recipients')
          .where({ email_id: s.id })
          .count('* as total');
        return { ...s, recipientCount: (count[0] as any).total };
      })
    );

    res.json(schedulesWithRecipients);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Reschedule
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { scheduledAt } = req.body;
    const email = await db('emails').where({ id: req.params.id, status: 'scheduled' }).first();
    if (!email) return res.status(404).json({ error: 'Scheduled email not found' });

    const scheduledTime = new Date(scheduledAt);
    if (scheduledTime.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'scheduledAt must be in the future' });
    }

    await db('emails').where({ id: req.params.id }).update({ scheduled_at: scheduledAt });

    // Update timer
    const delayMs = scheduledTime.getTime() - Date.now();
    scheduleTimer(parseInt(req.params.id, 10), delayMs);

    res.json({ id: parseInt(req.params.id, 10), scheduledAt });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Cancel scheduled email
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const email = await db('emails').where({ id: req.params.id, status: 'scheduled' }).first();
    if (!email) return res.status(404).json({ error: 'Scheduled email not found' });

    await db('emails').where({ id: req.params.id }).update({ status: 'cancelled' });
    cancelTimer(parseInt(req.params.id, 10));

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

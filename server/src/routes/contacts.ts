import { Router, Request, Response } from 'express';
import db from '../config/db';

const router = Router();

// List contacts with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, subscribed, plan, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);

    let query = db('contacts');
    let countQuery = db('contacts');

    if (search) {
      const s = `%${search}%`;
      query = query.where(function () {
        this.where('username', 'like', s).orWhere('email', 'like', s);
      });
      countQuery = countQuery.where(function () {
        this.where('username', 'like', s).orWhere('email', 'like', s);
      });
    }

    if (subscribed) {
      query = query.where('subscribed', subscribed as string);
      countQuery = countQuery.where('subscribed', subscribed as string);
    }

    if (plan) {
      query = query.where('plan', plan as string);
      countQuery = countQuery.where('plan', plan as string);
    }

    const [{ total }] = await countQuery.count('* as total');
    const contacts = await query
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit as string, 10))
      .offset(offset);

    res.json({
      data: contacts,
      total: total as number,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get distinct filter values for dropdowns
router.get('/filters', async (_req: Request, res: Response) => {
  try {
    const plans = await db('contacts').distinct('plan').orderBy('plan');
    const subscribedValues = await db('contacts').distinct('subscribed').orderBy('subscribed');
    res.json({
      plans: plans.map((r: any) => r.plan),
      subscribedValues: subscribedValues.map((r: any) => r.subscribed),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Create contact
router.post('/', async (req: Request, res: Response) => {
  try {
    const { username, email, first_name, last_name, mobile, subscribed, plan } = req.body;
    const [id] = await db('contacts').insert({
      username,
      email,
      first_name: first_name || null,
      last_name: last_name || null,
      mobile: mobile || null,
      subscribed: subscribed || 'No',
      plan: plan || 'Free Trial',
    });
    const contact = await db('contacts').where({ id }).first();
    res.status(201).json(contact);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Update contact
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { username, email, first_name, last_name, mobile, subscribed, plan } = req.body;
    await db('contacts').where({ id: req.params.id }).update({
      username,
      email,
      first_name: first_name || null,
      last_name: last_name || null,
      mobile: mobile || null,
      subscribed,
      plan,
      updated_at: db.fn.now(),
    });
    const contact = await db('contacts').where({ id: req.params.id }).first();
    res.json(contact);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Delete contact
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await db('contacts').where({ id: req.params.id }).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Bulk import from CSV (simple: expects JSON array)
router.post('/import', async (req: Request, res: Response) => {
  try {
    const contacts = req.body.contacts;
    if (!Array.isArray(contacts)) {
      return res.status(400).json({ error: 'Expected { contacts: [...] }' });
    }
    const rows = contacts.map((c: any) => ({
      username: c.username,
      email: c.email,
      first_name: c.first_name || null,
      last_name: c.last_name || null,
      mobile: c.mobile || null,
      subscribed: c.subscribed || 'No',
      plan: c.plan || 'Free Trial',
    }));
    await db('contacts').insert(rows);
    res.status(201).json({ imported: rows.length });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;

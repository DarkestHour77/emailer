import { Router, Request, Response } from 'express';
import { searchContacts, getFilterValues } from '../data/contacts';

const router = Router();

// List contacts with filtering and pagination
router.get('/', (req: Request, res: Response) => {
  try {
    const { search, subscribed, plan, page = '1', limit = '50' } = req.query;

    const result = searchContacts({
      search: search as string,
      subscribed: subscribed as string,
      plan: plan as string,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get distinct filter values for dropdowns
router.get('/filters', (_req: Request, res: Response) => {
  try {
    res.json(getFilterValues());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

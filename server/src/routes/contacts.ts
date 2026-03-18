import { Router, Request, Response } from 'express';
import { searchContacts, getFilterValues, uploadCSV } from '../data/contacts';

const router = Router();

// List contacts with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, subscribed, plan, page = '1', limit = '50' } = req.query;

    const result = await searchContacts({
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
router.get('/filters', async (_req: Request, res: Response) => {
  try {
    res.json(await getFilterValues());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Upload new CSV to replace contacts
router.post('/upload-csv', async (req: Request, res: Response) => {
  try {
    const { csv } = req.body;
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ error: 'csv field is required (string)' });
    }
    const result = await uploadCSV(csv);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;

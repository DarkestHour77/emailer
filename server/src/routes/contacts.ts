import { Router, Request, Response } from 'express';
import {
  searchContacts,
  getFilterValues,
  uploadCSV,
  getContactLists,
  createContactList,
  searchContactsForList,
  uploadCSVToList,
  deleteContactList,
  type ContactList,
} from '../data/contacts';

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

// --- Contact Lists ---

// Get all contact lists
router.get('/lists', async (_req: Request, res: Response) => {
  try {
    const lists = await getContactLists();
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Create a new contact list from CSV
router.post('/lists', async (req: Request, res: Response) => {
  try {
    const { name, csv } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ error: 'csv field is required (string)' });
    }
    const list = await createContactList(name.trim(), csv);
    res.json(list);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Get contacts for a specific list
router.get('/lists/:listId', async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;
    const { search, page = '1', limit = '50' } = req.query;

    const result = await searchContactsForList(listId as string, {
      search: search as string,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    // Include columns from the list metadata
    const lists = await getContactLists();
    const list = lists.find((l: ContactList) => l.id === listId);
    const columns = list?.columns || [];

    res.json({ ...result, columns });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Upload CSV to an existing contact list
router.post('/lists/:listId/upload-csv', async (req: Request, res: Response) => {
  try {
    const { csv } = req.body;
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ error: 'csv field is required (string)' });
    }
    const result = await uploadCSVToList(req.params.listId as string, csv);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Delete a contact list
router.delete('/lists/:listId', async (req: Request, res: Response) => {
  try {
    await deleteContactList(req.params.listId as string);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;

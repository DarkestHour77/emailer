import { Router, Request, Response } from 'express';
import db from '../config/db';

const router = Router();

// List all templates
router.get('/', async (_req: Request, res: Response) => {
  try {
    const templates = await db('templates').orderBy('created_at', 'desc');
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get single template
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const template = await db('templates').where({ id: req.params.id }).first();
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Create template
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, subject, body_html, body_text } = req.body;
    const [id] = await db('templates').insert({
      name,
      subject,
      body_html,
      body_text: body_text || null,
    });
    const template = await db('templates').where({ id }).first();
    res.status(201).json(template);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Update template
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, subject, body_html, body_text } = req.body;
    await db('templates').where({ id: req.params.id }).update({
      name,
      subject,
      body_html,
      body_text: body_text || null,
      updated_at: db.fn.now(),
    });
    const template = await db('templates').where({ id: req.params.id }).first();
    res.json(template);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Delete template
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await db('templates').where({ id: req.params.id }).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

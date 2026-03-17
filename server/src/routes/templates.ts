import { Router, Request, Response } from 'express';
import { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate } from '../data/templates';

const router = Router();

// List all templates
router.get('/', async (_req: Request, res: Response) => {
  try {
    const templates = await listTemplates();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get single template
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const template = await getTemplate(id);
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
    const template = await createTemplate({ name, subject, body_html, body_text });
    res.status(201).json(template);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Update template
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, subject, body_html, body_text } = req.body;
    const id = req.params.id as string;
    const template = await updateTemplate(id, { name, subject, body_html, body_text });
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Delete template
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteTemplate(req.params.id as string);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

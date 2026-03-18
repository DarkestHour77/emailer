import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

export interface Template {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  preview_text: string | null;
  created_at: string;
  updated_at: string;
}

const TEMPLATES_KEY = 'templates:list';
const templateKey = (id: string) => `template:${id}`;

export async function listTemplates(): Promise<Template[]> {
  const ids = await kv.zrange(TEMPLATES_KEY, 0, -1);
  if (!ids.length) return [];

  const keys = (ids as string[]).map(templateKey);
  const templates = await kv.mget<Template[]>(...keys);
  return templates.filter(Boolean).reverse();
}

export async function getTemplate(id: string): Promise<Template | null> {
  return kv.get<Template>(templateKey(id));
}

export async function createTemplate(data: {
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  preview_text?: string;
}): Promise<Template> {
  const now = new Date().toISOString();
  const template: Template = {
    id: uuidv4(),
    name: data.name,
    subject: data.subject,
    body_html: data.body_html,
    body_text: data.body_text || null,
    preview_text: data.preview_text || null,
    created_at: now,
    updated_at: now,
  };

  await kv.set(templateKey(template.id), template);
  await kv.zadd(TEMPLATES_KEY, { score: Date.now(), member: template.id });

  return template;
}

export async function updateTemplate(
  id: string,
  data: { name?: string; subject?: string; body_html?: string; body_text?: string; preview_text?: string }
): Promise<Template | null> {
  const existing = await getTemplate(id);
  if (!existing) return null;

  const updated: Template = {
    ...existing,
    ...data,
    body_text: data.body_text !== undefined ? data.body_text || null : existing.body_text,
    preview_text: data.preview_text !== undefined ? data.preview_text || null : existing.preview_text,
    updated_at: new Date().toISOString(),
  };

  await kv.set(templateKey(id), updated);
  return updated;
}

export async function deleteTemplate(id: string): Promise<void> {
  await kv.del(templateKey(id));
  await kv.zrem(TEMPLATES_KEY, id);
}

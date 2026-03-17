import { kv } from '@vercel/kv';
import { CSV_DATA } from './csvData';

export interface Contact {
  id: number;
  username: string;
  email: string;
  online: string;
  first_name: string | null;
  last_name: string | null;
  mobile: string | null;
  subscribed: string;
  plan: string;
  pages_left: number;
  last_login: string | null;
  draft_used: number;
  research_used: number;
  contract_review: number;
  query_count: number;
  judgment_details: number;
  cart_item: string | null;
}

const CSV_KV_KEY = 'contacts:csv';

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const ch of lines[i]) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

function csvToContacts(csvContent: string): Contact[] {
  const rows = parseCSV(csvContent);

  const seen = new Set<string>();
  const contacts: Contact[] = [];
  let id = 1;

  for (const r of rows) {
    let email = (r['Email'] || '').trim();
    if (!email) email = (r['Username'] || '').trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);

    contacts.push({
      id: id++,
      username: r['Username'] || '',
      email,
      online: r['Online'] || 'No',
      first_name: r['First name'] || null,
      last_name: r['Last name'] || null,
      mobile: r['Mobile'] || null,
      subscribed: r['Subscribed'] || 'No',
      plan: r['Plan'] || 'Free Trial',
      pages_left: parseInt(r['Pages left'], 10) || 0,
      last_login: r['Last login'] && r['Last login'] !== '—' ? r['Last login'] : null,
      draft_used: parseInt(r['Draft used'], 10) || 0,
      research_used: parseInt(r['Research used'], 10) || 0,
      contract_review: parseInt(r['Contract review'], 10) || 0,
      query_count: parseInt(r['Query'], 10) || 0,
      judgment_details: parseInt(r['Judgment details'], 10) || 0,
      cart_item: r['Cart item'] || null,
    });
  }

  return contacts;
}

// In-memory cache
let allContacts: Contact[] = csvToContacts(CSV_DATA);
let cacheLoaded = false;

async function ensureLoaded(): Promise<void> {
  if (cacheLoaded) return;
  cacheLoaded = true;

  try {
    const kvCsv = await kv.get<string>(CSV_KV_KEY);
    if (kvCsv) {
      allContacts = csvToContacts(kvCsv);
    }
  } catch {
    // Fall back to embedded CSV if KV fails
  }
}

export async function uploadCSV(csvContent: string): Promise<{ contactCount: number }> {
  // Validate CSV has data
  const contacts = csvToContacts(csvContent);
  if (contacts.length === 0) {
    throw new Error('CSV contains no valid contacts');
  }

  // Store in KV
  await kv.set(CSV_KV_KEY, csvContent);

  // Refresh in-memory cache
  allContacts = contacts;
  cacheLoaded = true;

  return { contactCount: contacts.length };
}

export async function getContacts(): Promise<Contact[]> {
  await ensureLoaded();
  return allContacts;
}

export async function getContactById(id: number): Promise<Contact | undefined> {
  await ensureLoaded();
  return allContacts.find((c) => c.id === id);
}

export async function getContactsByIds(ids: number[]): Promise<Contact[]> {
  await ensureLoaded();
  const idSet = new Set(ids);
  return allContacts.filter((c) => idSet.has(c.id));
}

interface SearchParams {
  search?: string;
  subscribed?: string;
  plan?: string;
  page?: number;
  limit?: number;
}

export async function searchContacts(params: SearchParams) {
  await ensureLoaded();
  const { search, subscribed, plan, page = 1, limit = 50 } = params;
  let filtered = allContacts;

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (c) => c.username.toLowerCase().includes(s) || c.email.toLowerCase().includes(s)
    );
  }

  if (subscribed) {
    filtered = filtered.filter((c) => c.subscribed === subscribed);
  }

  if (plan) {
    filtered = filtered.filter((c) => c.plan === plan);
  }

  const total = filtered.length;
  const offset = (page - 1) * limit;
  const data = filtered.slice(offset, offset + limit);

  return { data, total, page, limit };
}

export async function getFilterValues() {
  await ensureLoaded();
  const plans = [...new Set(allContacts.map((c) => c.plan))].sort();
  const subscribedValues = [...new Set(allContacts.map((c) => c.subscribed))].sort();
  return { plans, subscribedValues };
}

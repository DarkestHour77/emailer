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

const CONTACTS_KV_KEY = 'contacts:all';

const DEFAULT_HEADERS = [
  'Username', 'Email', 'Online', 'First name', 'Last name', 'Mobile',
  'Subscribed', 'Plan', 'Pages left', 'Created', 'Last login',
  'Draft used', 'Research used', 'Contract review', 'Query',
  'Judgment details', 'Cart item',
];

const KNOWN_HEADERS = new Set(DEFAULT_HEADERS.map((h) => h.toLowerCase()));

function detectDelimiter(line: string): string {
  if (line.includes('\t')) return '\t';
  return ',';
}

function looksLikeHeader(fields: string[]): boolean {
  // If most fields match known header names, it's a header row
  const matches = fields.filter((f) => KNOWN_HEADERS.has(f.trim().toLowerCase()));
  return matches.length >= 3;
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  const delimiter = detectDelimiter(lines[0]);

  const firstLineFields = lines[0].split(delimiter).map((h) => h.trim());
  let rawHeaders: string[];
  let dataStartIndex: number;

  if (looksLikeHeader(firstLineFields)) {
    rawHeaders = firstLineFields;
    dataStartIndex = 1;
  } else {
    rawHeaders = DEFAULT_HEADERS;
    dataStartIndex = 0;
  }
  // Build a map from lowercase header to the canonical header names used in rowToContact
  const canonicalHeaders: Record<string, string> = {
    'username': 'Username',
    'email': 'Email',
    'online': 'Online',
    'first name': 'First name',
    'first_name': 'First name',
    'firstname': 'First name',
    'last name': 'Last name',
    'last_name': 'Last name',
    'lastname': 'Last name',
    'mobile': 'Mobile',
    'subscribed': 'Subscribed',
    'plan': 'Plan',
    'pages left': 'Pages left',
    'pages_left': 'Pages left',
    'last login': 'Last login',
    'last_login': 'Last login',
    'draft used': 'Draft used',
    'draft_used': 'Draft used',
    'research used': 'Research used',
    'research_used': 'Research used',
    'contract review': 'Contract review',
    'contract_review': 'Contract review',
    'contact review': 'Contract review',
    'query': 'Query',
    'query_count': 'Query',
    'judgment details': 'Judgment details',
    'judgment_details': 'Judgment details',
    'cart item': 'Cart item',
    'cart_item': 'Cart item',
  };
  const headers = rawHeaders.map((h) => canonicalHeaders[h.toLowerCase()] || h);
  const rows: Record<string, string>[] = [];

  for (let i = dataStartIndex; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const ch of lines[i]) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
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

function rowToContact(r: Record<string, string>, id: number): Contact | null {
  let email = (r['Email'] || '').trim();
  if (!email) email = (r['Username'] || '').trim();
  if (!email) return null;

  return {
    id,
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
  };
}

function csvToContacts(csvContent: string): Contact[] {
  const rows = parseCSV(csvContent);
  const seen = new Set<string>();
  const contacts: Contact[] = [];
  let id = 1;

  for (const r of rows) {
    const contact = rowToContact(r, id);
    if (!contact || seen.has(contact.email)) {
      continue;
    }
    seen.add(contact.email);
    contacts.push(contact);
    id++;
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
    const kvContacts = await kv.get<Contact[]>(CONTACTS_KV_KEY);
    if (kvContacts && kvContacts.length > 0) {
      allContacts = kvContacts;
    }
  } catch {
    // Fall back to embedded CSV if KV fails
  }
}

export async function uploadCSV(csvContent: string): Promise<{ contactCount: number; newContacts: number; updatedContacts: number }> {
  const incoming = csvToContacts(csvContent);
  if (incoming.length === 0) {
    throw new Error('CSV contains no valid contacts');
  }

  await ensureLoaded();

  // Build a map of existing contacts by email for quick lookup
  const existingByEmail = new Map<string, number>();
  for (let i = 0; i < allContacts.length; i++) {
    existingByEmail.set(allContacts[i].email.toLowerCase(), i);
  }

  const merged = [...allContacts];
  let newCount = 0;
  let updatedCount = 0;
  let nextId = Math.max(...allContacts.map((c) => c.id), 0) + 1;

  for (const contact of incoming) {
    const key = contact.email.toLowerCase();
    const existingIdx = existingByEmail.get(key);

    if (existingIdx !== undefined) {
      // Update existing contact, keep the same id
      merged[existingIdx] = { ...contact, id: merged[existingIdx].id };
      updatedCount++;
    } else {
      // Add new contact
      merged.push({ ...contact, id: nextId++ });
      existingByEmail.set(key, merged.length - 1);
      newCount++;
    }
  }

  // Save to KV and update cache
  await kv.set(CONTACTS_KV_KEY, merged);
  allContacts = merged;
  cacheLoaded = true;

  return { contactCount: merged.length, newContacts: newCount, updatedContacts: updatedCount };
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

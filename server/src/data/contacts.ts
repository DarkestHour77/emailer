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

export interface ContactList {
  id: string;
  name: string;
  contactCount: number;
  createdAt: string;
  columns: string[];
}

// Dynamic contact: id + email (required) + any CSV columns
export type DynamicContact = { id: number; [key: string]: string | number | null };

const CONTACTS_KV_KEY = 'contacts:all';
const CONTACT_LISTS_KV_KEY = 'contactlists:index';

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

function parseCSVLines(content: string): { headers: string[]; rows: Record<string, string>[] } {
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
  return { headers, rows };
}

function parseCSV(content: string): Record<string, string>[] {
  return parseCSVLines(content).rows;
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

// --- Dynamic CSV parsing for contact lists ---

// A proper CSV parser that handles multi-line quoted fields and always uses
// the first row as headers (no fallback to DEFAULT_HEADERS).
function parseDynamicCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const delimiter = content.includes('\t') ? '\t' : ',';

  // Parse all fields respecting quoted multi-line values
  const records: string[][] = [];
  let current = '';
  let inQuotes = false;
  let record: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < content.length && content[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        record.push(current.trim());
        current = '';
      } else if (ch === '\n' || ch === '\r') {
        // Skip \n after \r
        if (ch === '\r' && i + 1 < content.length && content[i + 1] === '\n') {
          i++;
        }
        record.push(current.trim());
        current = '';
        if (record.some((f) => f !== '')) {
          records.push(record);
        }
        record = [];
      } else {
        current += ch;
      }
    }
  }
  // Push last field/record
  record.push(current.trim());
  if (record.some((f) => f !== '')) {
    records.push(record);
  }

  if (records.length === 0) return { headers: [], rows: [] };

  const headers = records[0];
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < records.length; i++) {
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = records[i][idx] || '';
    });
    rows.push(row);
  }
  return { headers, rows };
}

function csvToDynamicContacts(csvContent: string): { columns: string[]; contacts: DynamicContact[] } {
  const { headers, rows } = parseDynamicCSV(csvContent);
  if (headers.length === 0) return { columns: [], contacts: [] };

  // Find the email column for deduplication — look for "email" in header name
  const emailCol = headers.find((h) => h.toLowerCase().includes('email')) || headers[0];

  const seen = new Set<string>();
  const contacts: DynamicContact[] = [];
  let id = 1;

  for (const r of rows) {
    const emailVal = (r[emailCol] || '').trim();
    if (!emailVal) continue;
    const key = emailVal.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const contact: DynamicContact = { id };
    for (const h of headers) {
      contact[h] = r[h] || '';
    }
    contacts.push(contact);
    id++;
  }

  return { columns: headers, contacts };
}

// --- Contact Lists ---

const listsCache = new Map<string, DynamicContact[]>();
let listsIndexCache: ContactList[] | null = null;

async function getListsIndex(): Promise<ContactList[]> {
  if (listsIndexCache) return listsIndexCache;
  try {
    const lists = await kv.get<ContactList[]>(CONTACT_LISTS_KV_KEY);
    listsIndexCache = lists || [];
  } catch {
    listsIndexCache = [];
  }
  return listsIndexCache;
}

export async function getContactLists(): Promise<ContactList[]> {
  return getListsIndex();
}

export async function createContactList(name: string, csvContent: string): Promise<ContactList> {
  const { columns, contacts } = csvToDynamicContacts(csvContent);
  if (contacts.length === 0) {
    throw new Error('CSV contains no valid contacts');
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const list: ContactList = {
    id,
    name,
    contactCount: contacts.length,
    createdAt: new Date().toISOString(),
    columns,
  };

  const lists = await getListsIndex();
  lists.push(list);

  await kv.set(CONTACT_LISTS_KV_KEY, lists);
  await kv.set(`contacts:list:${id}`, contacts);

  listsIndexCache = lists;
  listsCache.set(id, contacts);

  return list;
}

export async function getContactsForList(listId: string): Promise<DynamicContact[]> {
  if (listsCache.has(listId)) return listsCache.get(listId)!;
  try {
    const contacts = await kv.get<DynamicContact[]>(`contacts:list:${listId}`);
    const result = contacts || [];
    listsCache.set(listId, result);
    return result;
  } catch {
    return [];
  }
}

export async function searchContactsForList(listId: string, params: SearchParams) {
  const allListContacts = await getContactsForList(listId);
  const { search, page = 1, limit = 50 } = params;
  let filtered = allListContacts;

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter((c) =>
      Object.values(c).some(
        (v) => typeof v === 'string' && v.toLowerCase().includes(s)
      )
    );
  }

  const total = filtered.length;
  const offset = (page - 1) * limit;
  const data = filtered.slice(offset, offset + limit);

  return { data, total, page, limit };
}

export async function uploadCSVToList(listId: string, csvContent: string): Promise<{ contactCount: number; newContacts: number; updatedContacts: number; columns: string[] }> {
  const { columns, contacts: incoming } = csvToDynamicContacts(csvContent);
  if (incoming.length === 0) {
    throw new Error('CSV contains no valid contacts');
  }

  const existing = await getContactsForList(listId);

  // Find email column for dedup
  const emailCol = columns.find((h) => h.toLowerCase() === 'email') || columns[0];

  const existingByKey = new Map<string, number>();
  for (let i = 0; i < existing.length; i++) {
    const val = String(existing[i][emailCol] || '').toLowerCase();
    if (val) existingByKey.set(val, i);
  }

  const merged = [...existing];
  let newCount = 0;
  let updatedCount = 0;
  let nextId = Math.max(...existing.map((c) => c.id as number), 0) + 1;

  for (const contact of incoming) {
    const key = String(contact[emailCol] || '').toLowerCase();
    const existingIdx = existingByKey.get(key);

    if (existingIdx !== undefined) {
      merged[existingIdx] = { ...contact, id: merged[existingIdx].id };
      updatedCount++;
    } else {
      merged.push({ ...contact, id: nextId++ });
      existingByKey.set(key, merged.length - 1);
      newCount++;
    }
  }

  await kv.set(`contacts:list:${listId}`, merged);
  listsCache.set(listId, merged);

  // Update contact count and columns in the index
  const lists = await getListsIndex();
  const listEntry = lists.find((l) => l.id === listId);
  if (listEntry) {
    listEntry.contactCount = merged.length;
    listEntry.columns = columns;
    await kv.set(CONTACT_LISTS_KV_KEY, lists);
    listsIndexCache = lists;
  }

  return { contactCount: merged.length, newContacts: newCount, updatedContacts: updatedCount, columns };
}

export async function deleteContactList(listId: string): Promise<void> {
  const lists = await getListsIndex();
  const idx = lists.findIndex((l) => l.id === listId);
  if (idx === -1) throw new Error('Contact list not found');

  lists.splice(idx, 1);
  await kv.set(CONTACT_LISTS_KV_KEY, lists);
  await kv.del(`contacts:list:${listId}`);

  listsIndexCache = lists;
  listsCache.delete(listId);
}

import { Knex } from 'knex';
import { readFileSync } from 'fs';
import path from 'path';

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

export async function seed(knex: Knex): Promise<void> {
  // Clear all tables
  await knex('tracking_events').del();
  await knex('attachments').del();
  await knex('email_recipients').del();
  await knex('emails').del();
  await knex('templates').del();
  await knex('contacts').del();
  await knex.raw(
    "DELETE FROM sqlite_sequence WHERE name IN ('contacts', 'templates', 'emails', 'email_recipients', 'tracking_events', 'attachments')"
  );

  // Import contacts from CSV
  const csvPath = path.join(__dirname, '..', '..', '..', 'data', 'users-export-2026-02-24.csv');
  const csvContent = readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);

  // Deduplicate by email, fall back to username if email is empty
  const seen = new Set<string>();
  const contacts: any[] = [];
  for (const r of rows) {
    let email = (r['Email'] || '').trim();
    if (!email) email = (r['Username'] || '').trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    contacts.push({
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

  // Insert in batches of 50
  for (let i = 0; i < contacts.length; i += 50) {
    await knex('contacts').insert(contacts.slice(i, i + 50));
  }

  // --- Templates ---
  const templates = [
    {
      name: 'Welcome Email',
      subject: 'Welcome to our platform, {{username}}!',
      body_html: `<h1>Welcome, {{username}}!</h1>
<p>We're thrilled to have you on board.</p>
<p>Here are a few things to get you started:</p>
<ul>
  <li><a href="https://example.com/docs">Read the docs</a></li>
  <li><a href="https://example.com/setup">Set up your account</a></li>
  <li><a href="https://example.com/support">Get support</a></li>
</ul>
<p>Best regards,<br>The Team</p>`,
      body_text: 'Welcome, {{username}}! We\'re thrilled to have you on board.',
    },
    {
      name: 'Monthly Newsletter',
      subject: 'Your Monthly Update - March 2026',
      body_html: `<h1>Monthly Newsletter</h1>
<p>Hi {{username}},</p>
<p>Here's what's new this month:</p>
<h2>Product Updates</h2>
<p>We've launched three new features to improve your workflow.</p>
<h2>Upcoming Webinar</h2>
<p>Join us on March 25th for a deep dive into advanced analytics.</p>
<p><a href="https://example.com/webinar">Register Now</a></p>
<p>Cheers,<br>The Team</p>`,
      body_text: 'Hi {{username}}, here\'s what\'s new this month.',
    },
    {
      name: 'Subscription Reminder',
      subject: 'Your trial is ending soon!',
      body_html: `<h1>Don't lose access!</h1>
<p>Hi {{username}},</p>
<p>Your Free Trial is about to expire. Subscribe now to keep full access to all features.</p>
<p><a href="https://example.com/subscribe">Subscribe Now</a></p>
<p>Best,<br>The Team</p>`,
      body_text: 'Hi {{username}}, your Free Trial is about to expire. Subscribe now!',
    },
    {
      name: 'Re-engagement',
      subject: 'We miss you, {{username}}!',
      body_html: `<p>Hi {{username}},</p>
<p>It's been a while since you last logged in. We've added exciting new features since your last visit.</p>
<p><a href="https://example.com/login">Log back in</a></p>
<p>Best regards,<br>The Team</p>`,
      body_text: 'Hi {{username}}, it\'s been a while! Log back in to see what\'s new.',
    },
  ];
  await knex('templates').insert(templates);
}

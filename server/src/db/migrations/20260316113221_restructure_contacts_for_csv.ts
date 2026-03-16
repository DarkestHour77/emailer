import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop dependent tables first, then rebuild contacts from scratch
  await knex.schema.dropTableIfExists('tracking_events');
  await knex.schema.dropTableIfExists('attachments');
  await knex.schema.dropTableIfExists('email_recipients');
  await knex.schema.dropTableIfExists('emails');
  await knex.schema.dropTableIfExists('contacts');

  await knex.schema.createTable('contacts', (table) => {
    table.increments('id').primary();
    table.string('username').notNullable();
    table.string('email').notNullable().unique();
    table.string('online').defaultTo('No');
    table.string('first_name');
    table.string('last_name');
    table.string('mobile');
    table.string('subscribed').notNullable().defaultTo('No');
    table.string('plan').notNullable().defaultTo('Free Trial');
    table.integer('pages_left').defaultTo(0);
    table.string('last_login');
    table.integer('draft_used').defaultTo(0);
    table.integer('research_used').defaultTo(0);
    table.integer('contract_review').defaultTo(0);
    table.integer('query_count').defaultTo(0);
    table.integer('judgment_details').defaultTo(0);
    table.string('cart_item');
    table.timestamps(true, true);
  });

  // Recreate dependent tables
  await knex.schema.createTable('emails', (table) => {
    table.increments('id').primary();
    table.integer('template_id').references('id').inTable('templates').onDelete('SET NULL');
    table.string('subject').notNullable();
    table.text('body_html').notNullable();
    table.string('sender_email').notNullable();
    table.string('status').notNullable().defaultTo('pending');
    table.datetime('scheduled_at');
    table.datetime('sent_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('email_recipients', (table) => {
    table.increments('id').primary();
    table.integer('email_id').notNullable().references('id').inTable('emails').onDelete('CASCADE');
    table.integer('contact_id').notNullable().references('id').inTable('contacts').onDelete('CASCADE');
    table.string('tracking_id').notNullable().unique();
    table.datetime('opened_at');
    table.integer('open_count').notNullable().defaultTo(0);
    table.datetime('clicked_at');
    table.integer('click_count').notNullable().defaultTo(0);
  });

  await knex.schema.createTable('tracking_events', (table) => {
    table.increments('id').primary();
    table.string('tracking_id').notNullable().references('tracking_id').inTable('email_recipients').onDelete('CASCADE');
    table.string('event_type').notNullable();
    table.text('url');
    table.string('ip_address');
    table.string('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('attachments', (table) => {
    table.increments('id').primary();
    table.integer('email_id').notNullable().references('id').inTable('emails').onDelete('CASCADE');
    table.string('filename').notNullable();
    table.string('path').notNullable();
    table.string('mime_type');
    table.integer('size_bytes');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tracking_events');
  await knex.schema.dropTableIfExists('attachments');
  await knex.schema.dropTableIfExists('email_recipients');
  await knex.schema.dropTableIfExists('emails');
  await knex.schema.dropTableIfExists('contacts');
}

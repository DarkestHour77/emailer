import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('templates', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('subject').notNullable();
    table.text('body_html').notNullable();
    table.text('body_text');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('templates');
}

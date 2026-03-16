import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('contacts', (table) => {
    table.string('plan').notNullable().defaultTo('Free Trial');
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('contacts', (table) => {
    table.dropColumn('plan');
  });
}


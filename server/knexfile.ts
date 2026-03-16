import path from 'path';
import type { Knex } from 'knex';

const config: Knex.Config = {
  client: 'better-sqlite3',
  connection: {
    filename: path.join(__dirname, 'data', 'emailer.sqlite'),
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'src', 'db', 'migrations'),
    extension: 'ts',
  },
  seeds: {
    directory: path.join(__dirname, 'src', 'db', 'seeds'),
    extension: 'ts',
  },
};

export default config;

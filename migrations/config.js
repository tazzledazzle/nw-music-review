import 'dotenv/config';

export const databaseUrl = process.env.DATABASE_URL;
export const migrationsTable = 'pgmigrations';
export const dir = 'migrations';
export const checkOrder = true;
export const verbose = true;
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/loan_verification'
});

export function query(text, params) {
  return pool.query(text, params);
}

export async function setupDatabase() {
  const schemaPath = path.resolve(__dirname, '..', 'database', 'schema.sql');
  const schemaSql = await fs.readFile(schemaPath, 'utf8');
  await query(schemaSql);
}

if (process.argv.includes('--setup')) {
  setupDatabase()
    .then(async () => {
      console.log('Database schema is ready.');
      await pool.end();
    })
    .catch(async (error) => {
      console.error(error);
      await pool.end().catch(() => {});
      process.exitCode = 1;
    });
}

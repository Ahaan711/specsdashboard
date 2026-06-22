#!/usr/bin/env node
const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node run_sql.js <sql-file>');
    process.exit(1);
  }
  let sql;
  try {
    sql = fs.readFileSync(file, 'utf8');
  } catch (err) {
    console.error('Could not read SQL file:', err.message);
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.SUPABASE_DATABASE_URL;
  if (!connectionString) {
    console.error('Set DATABASE_URL (Postgres connection string) in your environment.');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Error running SQL:', err.message);
    try { await client.query('ROLLBACK'); } catch (e) {}
    process.exit(2);
  } finally {
    await client.end();
  }
}

main();

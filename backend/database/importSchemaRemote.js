/**
 * Imports backend/database/schema-filess.sql against whatever database
 * is configured in .env (DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME).
 *
 * This exists so you don't need to locate/use a local mysql.exe client -
 * it runs entirely through the mysql2 driver already installed for the app.
 *
 * Usage: npm run import-schema
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const schemaPath = path.join(__dirname, 'schema-filess.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Strip comment lines, then split into individual statements on ';'.
  const cleaned = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleaned
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Connecting to ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME} ...`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  console.log(`Connected. Running ${statements.length} statements...`);

  for (let i = 0; i < statements.length; i += 1) {
    const stmt = statements[i];
    try {
      await connection.query(stmt);
      console.log(`  [${i + 1}/${statements.length}] OK`);
    } catch (err) {
      console.error(`  [${i + 1}/${statements.length}] FAILED: ${err.message}`);
      console.error(`  Statement was: ${stmt.slice(0, 120)}...`);
    }
  }

  await connection.end();
  console.log('Schema import complete.');
}

run().catch((err) => {
  console.error('Could not import schema:', err.message);
  process.exit(1);
});
const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  const sql = fs.readFileSync('./sql/schema.sql', 'utf8');
  await client.query(sql);
  await client.end();
  console.log('Migration complete');
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});

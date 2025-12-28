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
  // Run main schema
  const schema = fs.readFileSync('./sql/schema.sql', 'utf8');
  await client.query(schema);

  // Run additional migrations (ingest keys table)
  const ingest = fs.readFileSync('./sql/add_ingest_keys.sql', 'utf8');
  await client.query(ingest);
  await client.end();
  console.log('Migration complete');
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});

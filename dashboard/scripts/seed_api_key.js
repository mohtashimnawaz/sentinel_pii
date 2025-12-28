const { Client } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const token = process.env.INGEST_API_KEY || 'changeme';
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query('INSERT INTO ingest_keys(name, key_hash, enabled) VALUES($1,$2,true) ON CONFLICT (key_hash) DO NOTHING', ['seed-key', hash]);
  await client.end();
  console.log('Seeded API key (hash):', hash);
}

seed().catch(err => { console.error(err); process.exit(1); });

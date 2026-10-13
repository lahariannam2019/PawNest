import EmbeddedPostgres from 'embedded-postgres';
import path from 'node:path';
import fs from 'node:fs';

const dataDir = path.resolve('.data/postgres');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log(`Starting embedded PostgreSQL on port 5432 (Data: ${dataDir})...`);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  port: 5432,
  user: 'pawnest',
  password: 'pawnest_dev_password',
  initialDatabase: 'pawnest',
  persistent: true,
});

async function main() {
  try {
    await pg.initialise();
    await pg.start();
    console.log('🐾 Embedded PostgreSQL is running and ready on localhost:5432 (database: pawnest)');

    process.on('SIGINT', async () => {
      console.log('Stopping PostgreSQL...');
      await pg.stop();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      await pg.stop();
      process.exit(0);
    });
  } catch (err) {
    console.error('Failed to start embedded PostgreSQL:', err);
    process.exit(1);
  }
}

main();

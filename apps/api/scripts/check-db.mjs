import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  `;
  console.log('PostgreSQL Connection: SUCCESS');
  console.log('Tables Count:', tables.length);
  console.log('Tables in DB:');
  tables.forEach((t) => console.log(' -', t.tablename));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('PostgreSQL Connection FAILED:', err);
  process.exit(1);
});

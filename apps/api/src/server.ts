import 'dotenv/config';
import { buildApp } from './app.js';

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '0.0.0.0';

const app = buildApp({
  logger:
    process.env.NODE_ENV === 'development'
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        }
      : true,
});

import { prisma } from './lib/prisma.js';
import { runSeed } from './seed/seed.js';
import { initBoss, stopBoss } from './jobs/reminders.js';

async function ensureDatabaseInitialized() {
  try {
    const categoryCount = await prisma.category.count();
    if (categoryCount === 0) {
      console.log('🌱 Database has 0 categories. Seeding initial PawNest catalogue and demo data in-process...');
      await runSeed(prisma);
      const newCategoryCount = await prisma.category.count();
      const newProductCount = await prisma.product.count();
      console.log(`✅ PawNest data seeded successfully! Categories: ${newCategoryCount}, Products: ${newProductCount}`);
    } else {
      console.log(`📦 Database already seeded (${categoryCount} categories present).`);
    }
  } catch (err: any) {
    console.error('⚠️ Database seed check failed during startup:', err.message);
  }
}

async function start() {
  try {
    await app.listen({ port, host });
    console.log(`🐾 PawNest API server listening at http://${host}:${port}`);
    console.log(`📚 API Docs available at http://${host}:${port}/api/docs`);

    await ensureDatabaseInitialized();

    await initBoss().catch((err) => {
      console.warn('pg-boss background worker failed to initialize:', err.message);
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await stopBoss();
  await app.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await stopBoss();
  await app.close();
  process.exit(0);
});

start();

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

async function start() {
  try {
    await app.listen({ port, host });
    console.log(`🐾 PawNest API server listening at http://${host}:${port}`);
    console.log(`📚 API Docs available at http://${host}:${port}/api/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

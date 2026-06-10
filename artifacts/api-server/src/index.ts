import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "@workspace/db/migrate";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Catch unhandled promise rejections — prevent silent crashes
process.on('unhandledRejection', (reason) => {
  logger.error({ reason: String(reason) }, 'Unhandled promise rejection');
});

// Catch uncaught exceptions — log then exit so the process manager can restart
process.on('uncaughtException', (err) => {
  logger.fatal({ err: err.message }, 'Uncaught exception — shutting down');
  process.exit(1);
});

// Graceful shutdown — drain connections before exit
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received, closing connections');
  try {
    await pool.end();
  } catch (e) {
    logger.error({ e }, 'Error closing DB pool during shutdown');
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

async function start() {
  try {
    await runMigrations(process.env.DATABASE_URL!);
  } catch (err) {
    logger.warn({ err }, "Migration warning (may be safe to ignore on first run)");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

start();

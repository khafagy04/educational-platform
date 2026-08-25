import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
export async function reportError(error: unknown, context: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error),
    stack = error instanceof Error ? error.stack : undefined;
  logger.error({ err: error, ...context }, 'captured application error');
  if (!env.ERROR_REPORTING_DSN) return;
  try {
    await fetch(env.ERROR_REPORTING_DSN, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, stack, context, timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (reportingError) {
    logger.warn({ err: reportingError }, 'external error reporting failed');
  }
}

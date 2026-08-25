import type { RequestHandler } from 'express';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  lazyConnect: true,
});
let connected = false;
async function client() {
  if (!connected) {
    try {
      await redis.connect();
      connected = true;
    } catch {
      return null;
    }
  }
  return redis;
}
export const cacheResponse =
  (namespace: string, ttlSeconds = 60): RequestHandler =>
  async (req, res, next) => {
    const store = await client();
    if (!store) {
      next();
      return;
    }
    const key = `cache:${namespace}:${req.originalUrl}`;
    try {
      const hit = await store.get(key);
      if (hit) {
        res.setHeader('X-Cache', 'HIT');
        res.json(JSON.parse(hit) as unknown);
        return;
      }
    } catch (error) {
      logger.warn({ error, namespace }, 'cache read failed');
    }
    res.setHeader('X-Cache', 'MISS');
    const json = res.json.bind(res);
    res.json = (value: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300)
        void store
          .set(
            key,
            JSON.stringify(value, (_k: string, item: unknown) =>
              typeof item === 'bigint' ? item.toString() : item,
            ),
            'EX',
            ttlSeconds,
          )
          .catch((error: unknown) => {
            logger.warn({ error, namespace }, 'cache write failed');
          });
      json(value);
      return res;
    };
    next();
  };
export const invalidatePublicCache: RequestHandler = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    const namespaces: string[] = [];
    if (/^\/(courses|modules|lessons|attachments|quizzes)/u.test(req.path))
      namespaces.push('courses');
    if (/^\/(admin\/faqs)/u.test(req.path)) namespaces.push('faqs');
    if (/^\/(admin\/settings)/u.test(req.path)) namespaces.push('settings');
    for (const namespace of namespaces) void deleteNamespace(namespace);
  });
  next();
};
async function deleteNamespace(namespace: string) {
  const store = await client();
  if (!store) return;
  let cursor = '0';
  do {
    const [result, nextKeys] = await store.scan(
      cursor,
      'MATCH',
      `cache:${namespace}:*`,
      'COUNT',
      100,
    );
    cursor = result;
    if (nextKeys.length) await store.del(...nextKeys);
  } while (cursor !== '0');
}

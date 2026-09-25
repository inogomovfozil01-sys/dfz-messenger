import Redis from 'ioredis';
import { ENV } from './config';

class InMemoryCache {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    let expiresAt: number | undefined;
    if (mode === 'EX' && duration) {
      expiresAt = Date.now() + duration * 1000;
    } else if (mode === 'PX' && duration) {
      expiresAt = Date.now() + duration;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) deleted++;
    }
    return deleted;
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const val = (current ? parseInt(current, 10) : 0) + 1;
    await this.set(key, val.toString());
    return val;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }
}

export interface ICacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | string>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

let redisInstance: Redis | null = null;
const memoryCache = new InMemoryCache();
let isRedisConnected = false;

if (ENV.REDIS_URL) {
  try {
    redisInstance = new Redis(ENV.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop retrying after 3 attempts, rely on memory cache
        }
        return Math.min(times * 100, 1000);
      },
      lazyConnect: true,
    });

    redisInstance.connect().then(() => {
      isRedisConnected = true;
      console.log('✅ Connected to Redis cache');
    }).catch(() => {
      isRedisConnected = false;
      console.log('ℹ️ Redis unreachable, utilizing resilient in-memory cache');
    });

    redisInstance.on('error', () => {
      isRedisConnected = false;
    });
  } catch {
    isRedisConnected = false;
  }
}

export const cache: ICacheClient = {
  async get(key: string) {
    if (isRedisConnected && redisInstance) {
      try {
        return await redisInstance.get(key);
      } catch {
        return memoryCache.get(key);
      }
    }
    return memoryCache.get(key);
  },
  async set(key: string, value: string, mode?: string, duration?: number) {
    if (isRedisConnected && redisInstance) {
      try {
        if (mode && duration) {
          return await (redisInstance as any).set(key, value, mode, duration);
        }
        return await redisInstance.set(key, value);
      } catch {
        return memoryCache.set(key, value, mode, duration);
      }
    }
    return memoryCache.set(key, value, mode, duration);
  },
  async del(...keys: string[]) {
    if (isRedisConnected && redisInstance) {
      try {
        return await redisInstance.del(...keys);
      } catch {
        return memoryCache.del(...keys);
      }
    }
    return memoryCache.del(...keys);
  },
  async incr(key: string) {
    if (isRedisConnected && redisInstance) {
      try {
        return await redisInstance.incr(key);
      } catch {
        return memoryCache.incr(key);
      }
    }
    return memoryCache.incr(key);
  },
  async expire(key: string, seconds: number) {
    if (isRedisConnected && redisInstance) {
      try {
        return await redisInstance.expire(key, seconds);
      } catch {
        return memoryCache.expire(key, seconds);
      }
    }
    return memoryCache.expire(key, seconds);
  },
};

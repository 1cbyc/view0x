import { cacheRedis } from "../config/database";
import { logger } from "./logger";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

/**
 * Enhanced caching utility with Redis
 */
export class CacheService {
  private defaultTTL: number;
  private prefix: string;

  constructor(defaultTTL: number = 3600, prefix: string = "view0x:cache:") {
    this.defaultTTL = defaultTTL;
    this.prefix = prefix;
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = `${this.prefix}${key}`;
      const value = await cacheRedis.get(fullKey);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = `${this.prefix}${key}`;
      const ttl = options?.ttl || this.defaultTTL;
      await cacheRedis.set(fullKey, JSON.stringify(value), "EX", ttl);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const fullKey = `${this.prefix}${key}`;
      await cacheRedis.del(fullKey);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const fullPattern = `${this.prefix}${pattern}`;
      const keys = await cacheRedis.keys(fullPattern);
      if (keys.length > 0) {
        return await cacheRedis.del(...keys);
      }
      return 0;
    } catch (error) {
      logger.error(`Cache deletePattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = `${this.prefix}${key}`;
      const result = await cacheRedis.exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set with automatic caching
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Invalidate cache for a specific key pattern
   */
  async invalidate(pattern: string): Promise<void> {
    await this.deletePattern(pattern);
  }
}

// Export singleton instance
export const cacheService = new CacheService();

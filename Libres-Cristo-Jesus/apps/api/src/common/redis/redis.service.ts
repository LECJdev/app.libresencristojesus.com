import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../config/app-config.service';

/**
 * Thin, injectable wrapper around an `ioredis` client. No business
 * logic lives here yet — this phase only needs a working, connected
 * client and a health-check method future modules (sessions, caching,
 * rate limiting, etc.) can build on.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(configService: AppConfigService) {
    this.client = new Redis(configService.redisUrl, {
      // Connect explicitly in onModuleInit so a Redis outage surfaces as a
      // clear bootstrap failure instead of a silently-queued command later.
      lazyConnect: true,
      // Below ioredis' default of 20: a command against a degraded Redis
      // should fail fast and let the caller degrade, not stall the request
      // for 20 round-trips.
      maxRetriesPerRequest: 3,
    });
  }

  /** Escape hatch for future modules that need the raw ioredis client. */
  getClient(): Redis {
    return this.client;
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.log('Redis connected');
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }

  /**
   * Returns true if Redis replies to PING, false otherwise.
   *
   * Deliberately swallows the error instead of rethrowing: this is a
   * health probe, so "Redis is down" is a valid ANSWER (false), not an
   * exception. A future /health endpoint must be able to report Redis as
   * degraded while still returning 200 for the parts that do work.
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response === 'PONG';
    } catch (error) {
      this.logger.warn(`Redis ping failed: ${error instanceof Error ? error.message : 'unknown'}`);
      return false;
    }
  }
}

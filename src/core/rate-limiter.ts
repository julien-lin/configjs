/**
 * Rate Limiter for DoS Protection
 *
 * Implements token bucket algorithm for flexible rate limiting:
 * - Per-user rate limits (1 call/second default)
 * - Global rate limits (10 calls/second default)
 * - Sliding window with token refill
 * - User feedback with cooldown timers
 *
 * @security Layer 8: DoS protection via rate limiting
 */

interface TokenBucket {
  tokens: number
  lastRefillTime: number
}

interface RateLimitConfig {
  perUserLimit?: number
  globalLimit?: number
  refillInterval?: number
  burstSize?: number
  cooldownDuration?: number
}

interface RateLimitResult {
  allowed: boolean
  remainingTokens: number
  resetTime: number
  cooldownMs: number
  message?: string
}

/**
 * Rate Limiter using Token Bucket algorithm
 *
 * Token bucket algorithm:
 * - Each user/global gets a bucket with N tokens (capacity)
 * - Each request costs 1 token
 * - Tokens refill at a rate: capacity / interval
 * - If no tokens available, request is rate-limited
 *
 * Benefits:
 * - Allows burst traffic (up to capacity)
 * - Smooth rate limiting (no hard cutoffs)
 * - Fair allocation between users
 * - Simple to implement and reason about
 */
export class RateLimiter {
  private perUserBuckets: Map<string, TokenBucket> = new Map()
  private globalBucket: TokenBucket

  private readonly perUserLimit: number
  private readonly globalLimit: number
  private readonly refillInterval: number
  private readonly burstSize: number
  private readonly cooldownDuration: number

  constructor(config: RateLimitConfig = {}) {
    this.perUserLimit = config.perUserLimit ?? 1 // 1 call per second per user
    this.globalLimit = config.globalLimit ?? 10 // 10 calls per second globally
    this.refillInterval = config.refillInterval ?? 1000 // 1 second
    this.burstSize = config.burstSize ?? 3 // Allow burst of 3 calls
    this.cooldownDuration = config.cooldownDuration ?? 5000 // 5 second cooldown when rate limited

    this.globalBucket = {
      tokens: this.globalLimit * this.burstSize,
      lastRefillTime: Date.now(),
    }
  }

  /**
   * Check if a request is allowed for a specific user
   * @param userId - Unique identifier for the user/client
   * @returns RateLimitResult with status and timing info
   */
  checkUserLimit(userId: string): RateLimitResult {
    const now = Date.now()

    // Get or create user bucket
    if (!this.perUserBuckets.has(userId)) {
      this.perUserBuckets.set(userId, {
        tokens: this.perUserLimit * this.burstSize,
        lastRefillTime: now,
      })
    }

    const userBucket = this.perUserBuckets.get(userId)
    if (!userBucket) {
      throw new Error(`Failed to get or create user bucket for ${userId}`)
    }

    // Refill tokens based on elapsed time
    const elapsedMs = now - userBucket.lastRefillTime
    const tokensToAdd = (elapsedMs / this.refillInterval) * this.perUserLimit
    userBucket.tokens = Math.min(
      this.perUserLimit * this.burstSize,
      userBucket.tokens + tokensToAdd
    )
    userBucket.lastRefillTime = now

    // Check if tokens available
    if (userBucket.tokens >= 1) {
      userBucket.tokens -= 1
      const remainingTokens = Math.floor(userBucket.tokens)
      return {
        allowed: true,
        remainingTokens,
        resetTime: now + this.refillInterval,
        cooldownMs: 0,
      }
    }

    // Rate limited - calculate cooldown
    const timeToNextToken = this.refillInterval
    return {
      allowed: false,
      remainingTokens: 0,
      resetTime: now + timeToNextToken,
      cooldownMs: this.cooldownDuration,
      message: `Rate limit exceeded. Please wait ${(this.cooldownDuration / 1000).toFixed(1)}s before retrying.`,
    }
  }

  /**
   * Check if global rate limit is exceeded
   * @returns RateLimitResult with status and timing info
   */
  checkGlobalLimit(): RateLimitResult {
    const now = Date.now()

    // Refill tokens based on elapsed time
    const elapsedMs = now - this.globalBucket.lastRefillTime
    const tokensToAdd = (elapsedMs / this.refillInterval) * this.globalLimit
    this.globalBucket.tokens = Math.min(
      this.globalLimit * this.burstSize,
      this.globalBucket.tokens + tokensToAdd
    )
    this.globalBucket.lastRefillTime = now

    // Check if tokens available
    if (this.globalBucket.tokens >= 1) {
      this.globalBucket.tokens -= 1
      const remainingTokens = Math.floor(this.globalBucket.tokens)
      return {
        allowed: true,
        remainingTokens,
        resetTime: now + this.refillInterval,
        cooldownMs: 0,
      }
    }

    // Rate limited globally
    const timeToNextToken = this.refillInterval
    return {
      allowed: false,
      remainingTokens: 0,
      resetTime: now + timeToNextToken,
      cooldownMs: this.cooldownDuration,
      message: `Global rate limit exceeded. Service is temporarily throttled. Please wait ${(this.cooldownDuration / 1000).toFixed(1)}s.`,
    }
  }

  /**
   * Check both user and global rate limits
   * @param userId - Unique identifier for the user/client
   * @returns RateLimitResult - will be denied if EITHER limit is exceeded
   */
  checkRequest(userId: string): RateLimitResult {
    // Check user limit first
    const userResult = this.checkUserLimit(userId)
    if (!userResult.allowed) {
      return userResult
    }

    // Check global limit
    const globalResult = this.checkGlobalLimit()
    if (!globalResult.allowed) {
      return globalResult
    }

    // Both limits allow request
    const userBucketTokens = this.perUserBuckets.get(userId)?.tokens ?? 0
    return {
      allowed: true,
      remainingTokens: Math.min(
        Math.floor(userBucketTokens),
        Math.floor(this.globalBucket.tokens)
      ),
      resetTime: Math.min(userResult.resetTime, globalResult.resetTime),
      cooldownMs: 0,
    }
  }

  /**
   * Middleware for Express/similar frameworks
   * Adds rate limiting headers to response
   * @param userId - Unique identifier for the user/client
   * @returns Headers to add to HTTP response
   */
  getHeaders(userId: string): Record<string, string> {
    const result = this.checkUserLimit(userId)
    return {
      'X-RateLimit-Limit': String(this.perUserLimit),
      'X-RateLimit-Remaining': String(result.remainingTokens),
      'X-RateLimit-Reset': String(result.resetTime),
    }
  }

  /**
   * Get current rate limit status for debugging
   */
  getStatus(userId: string): {
    userId: string
    tokens: number
    lastRefillTime: number
  }
  getStatus(): {
    global: { tokens: number; lastRefillTime: number }
    users: Array<{ userId: string; tokens: number; lastRefillTime: number }>
  }
  getStatus(userId?: string): {
    userId?: string
    tokens?: number
    lastRefillTime?: number
    global?: { tokens: number; lastRefillTime: number }
    users?: Array<{ userId: string; tokens: number; lastRefillTime: number }>
  } {
    if (userId) {
      const bucket = this.perUserBuckets.get(userId)
      if (!bucket) {
        return {
          userId,
          tokens: this.perUserLimit * this.burstSize,
          lastRefillTime: Date.now(),
        }
      }
      return {
        userId,
        tokens: bucket.tokens,
        lastRefillTime: bucket.lastRefillTime,
      }
    }

    return {
      global: {
        tokens: this.globalBucket.tokens,
        lastRefillTime: this.globalBucket.lastRefillTime,
      },
      users: Array.from(this.perUserBuckets.entries()).map(([id, bucket]) => ({
        userId: id,
        tokens: bucket.tokens,
        lastRefillTime: bucket.lastRefillTime,
      })),
    }
  }

  /**
   * Reset rate limiter (useful for testing)
   */
  reset(): void {
    this.perUserBuckets.clear()
    this.globalBucket = {
      tokens: this.globalLimit * this.burstSize,
      lastRefillTime: Date.now(),
    }
  }

  /**
   * Clean up old user buckets (older than 1 hour)
   * Prevents memory leaks from abandoned sessions
   */
  cleanup(maxAge: number = 3600000): number {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [userId, bucket] of this.perUserBuckets.entries()) {
      if (now - bucket.lastRefillTime > maxAge) {
        toDelete.push(userId)
      }
    }

    for (const userId of toDelete) {
      this.perUserBuckets.delete(userId)
    }

    return toDelete.length
  }
}

/**
 * Global rate limiter instance
 * Singleton pattern for CLI usage
 */
let globalRateLimiter: RateLimiter | null = null

/**
 * Get or create global rate limiter
 */
export function getGlobalRateLimiter(config?: RateLimitConfig): RateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter(config)
  }
  return globalRateLimiter
}

/**
 * Reset global rate limiter (useful for testing)
 */
export function resetGlobalRateLimiter(): void {
  if (globalRateLimiter) {
    globalRateLimiter.reset()
  }
  globalRateLimiter = null
}

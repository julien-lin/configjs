import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  RateLimiter,
  getGlobalRateLimiter,
  resetGlobalRateLimiter,
} from '../../../src/core/rate-limiter'

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      perUserLimit: 2,
      globalLimit: 5,
      refillInterval: 100,
      burstSize: 3,
      cooldownDuration: 500,
    })
  })

  afterEach(() => {
    resetGlobalRateLimiter()
  })

  describe('Token Bucket Algorithm', () => {
    it('should allow requests up to burst capacity', () => {
      const userId = 'user1'

      // With perUserLimit=2 and burstSize=3, can make 6 requests total
      const results: boolean[] = []
      for (let i = 0; i < 7; i++) {
        const result = rateLimiter.checkUserLimit(userId)
        results.push(result.allowed)
      }

      // First 6 should succeed (burst capacity), 7th should fail
      expect(results.slice(0, 6).every((r) => r)).toBe(true)
      expect(results[6]).toBe(false)
    })

    it('should refill tokens over time', async () => {
      const userId = 'user1'

      // Exhaust tokens
      for (let i = 0; i < 6; i++) {
        rateLimiter.checkUserLimit(userId)
      }

      // Next request should be denied
      let result = rateLimiter.checkUserLimit(userId)
      expect(result.allowed).toBe(false)

      // Wait for token refill
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should allow new request after refill
      result = rateLimiter.checkUserLimit(userId)
      expect(result.allowed).toBe(true)
    })

    it('should cap tokens at burst size', () => {
      const limiter = new RateLimiter({
        perUserLimit: 1,
        globalLimit: 10,
        refillInterval: 100,
        burstSize: 2,
      })

      const status = limiter.getStatus('new-user')
      expect(status.tokens).toBeLessThanOrEqual(2)
    })
  })

  describe('Per-User Rate Limits', () => {
    it('should track separate limits per user', () => {
      const user1Result1 = rateLimiter.checkUserLimit('user1')
      const user2Result1 = rateLimiter.checkUserLimit('user2')

      expect(user1Result1.allowed).toBe(true)
      expect(user2Result1.allowed).toBe(true)

      // Exhaust user1 (6 requests max with config)
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkUserLimit('user1')
      }
      const user1Result7 = rateLimiter.checkUserLimit('user1')
      expect(user1Result7.allowed).toBe(false)

      // User2 should still have tokens
      const user2Result2 = rateLimiter.checkUserLimit('user2')
      expect(user2Result2.allowed).toBe(true)
    })

    it('should isolate rate limits between users', () => {
      // User1: 6 requests (max with burst)
      for (let i = 0; i < 6; i++) {
        rateLimiter.checkUserLimit('user1')
      }

      // User1 should be rate limited
      const user1Denied = rateLimiter.checkUserLimit('user1')
      expect(user1Denied.allowed).toBe(false)

      // User2 should still have tokens (different bucket)
      const user2Allowed = rateLimiter.checkUserLimit('user2')
      expect(user2Allowed.allowed).toBe(true)
    })
  })

  describe('Global Rate Limits', () => {
    it('should enforce global rate limit', () => {
      // With globalLimit=5 and burstSize=3, can make 15 global requests total
      const results: boolean[] = []

      for (let i = 0; i < 16; i++) {
        const result = rateLimiter.checkGlobalLimit()
        results.push(result.allowed)
      }

      // First 15 should succeed, 16th should fail
      expect(results.slice(0, 15).every((r) => r)).toBe(true)
      expect(results[15]).toBe(false)
    })

    it('should deny if global limit exceeded', () => {
      // Exhaust global limit
      for (let i = 0; i < 15; i++) {
        rateLimiter.checkGlobalLimit()
      }

      // Should be denied globally
      const result = rateLimiter.checkGlobalLimit()
      expect(result.allowed).toBe(false)
    })
  })

  describe('Combined User + Global Limits', () => {
    it('should check both limits in checkRequest', () => {
      // First request should pass both checks
      const result1 = rateLimiter.checkRequest('user1')
      expect(result1.allowed).toBe(true)

      // Repeated requests should eventually fail
      let lastResult: ReturnType<typeof rateLimiter.checkRequest> | null = null
      for (let i = 0; i < 20; i++) {
        lastResult = rateLimiter.checkRequest('user1')
        if (!lastResult.allowed) break
      }

      expect(lastResult?.allowed).toBe(false)
      expect(lastResult?.message).toBeTruthy()
    })
  })

  describe('Cooldown Timing', () => {
    it('should provide reset time information', () => {
      const result = rateLimiter.checkUserLimit('user1')
      expect(result.resetTime).toBeGreaterThan(Date.now())
    })

    it('should provide cooldown duration when rate limited', () => {
      // Exhaust tokens
      for (let i = 0; i < 6; i++) {
        rateLimiter.checkUserLimit('user1')
      }

      // Request when rate limited
      const result = rateLimiter.checkUserLimit('user1')
      expect(result.allowed).toBe(false)
      expect(result.cooldownMs).toBe(500)
    })

    it('should return 0 cooldown when allowed', () => {
      const result = rateLimiter.checkUserLimit('user1')
      expect(result.allowed).toBe(true)
      expect(result.cooldownMs).toBe(0)
    })
  })

  describe('HTTP Headers', () => {
    it('should generate rate limit headers', () => {
      const headers = rateLimiter.getHeaders('user1')

      expect(headers['X-RateLimit-Limit']).toBe('2')
      expect(headers['X-RateLimit-Remaining']).toBeDefined()
      expect(headers['X-RateLimit-Reset']).toBeDefined()
    })

    it('should update remaining tokens in headers', () => {
      rateLimiter.checkUserLimit('user1')
      const headers1 = rateLimiter.getHeaders('user1')
      const remaining1 = parseInt(headers1['X-RateLimit-Remaining'] ?? '0', 10)

      rateLimiter.checkUserLimit('user1')
      const headers2 = rateLimiter.getHeaders('user1')
      const remaining2 = parseInt(headers2['X-RateLimit-Remaining'] ?? '0', 10)

      // Second check should have fewer tokens
      expect(remaining2).toBeLessThan(remaining1)
    })
  })

  describe('Status Reporting', () => {
    it('should report global status', () => {
      const status = rateLimiter.getStatus()

      expect(status.global).toBeDefined()
      expect(status.global.tokens).toBeGreaterThan(0)
      expect(status.global.lastRefillTime).toBeGreaterThan(0)
    })

    it('should report per-user status', () => {
      rateLimiter.checkUserLimit('user1')
      rateLimiter.checkUserLimit('user1')

      const status = rateLimiter.getStatus('user1')
      expect(status.userId).toBe('user1')
      expect(status.tokens).toBeLessThan(6) // burst size
    })

    it('should list all users in status', () => {
      rateLimiter.checkUserLimit('user1')
      rateLimiter.checkUserLimit('user2')
      rateLimiter.checkUserLimit('user3')

      const status = rateLimiter.getStatus()
      expect(status.users).toHaveLength(3)
      expect(status.users[0]).toHaveProperty('userId')
    })
  })

  describe('Reset and Cleanup', () => {
    it('should reset rate limiter', () => {
      // Exhaust tokens
      for (let i = 0; i < 6; i++) {
        rateLimiter.checkUserLimit('user1')
      }

      // Should be rate limited
      let result = rateLimiter.checkUserLimit('user1')
      expect(result.allowed).toBe(false)

      // After reset
      rateLimiter.reset()
      result = rateLimiter.checkUserLimit('user1')
      expect(result.allowed).toBe(true)
    })

    it('should clean up old user buckets', async () => {
      rateLimiter.checkUserLimit('user1')
      rateLimiter.checkUserLimit('user2')

      const status1 = rateLimiter.getStatus()
      expect(status1.users.length).toBe(2)

      // Wait a bit then cleanup with very short maxAge
      await new Promise((resolve) => setTimeout(resolve, 10))
      const deleted = rateLimiter.cleanup(1)
      expect(deleted).toBeGreaterThan(0)

      // Most buckets should be deleted
      const status2 = rateLimiter.getStatus()
      expect(status2.users.length).toBeLessThan(2)
    })

    it('should not delete recent buckets during cleanup', () => {
      rateLimiter.checkUserLimit('user1')

      // Cleanup with long maxAge
      const deleted = rateLimiter.cleanup(60000)
      expect(deleted).toBe(0)

      const status = rateLimiter.getStatus()
      expect(status.users.length).toBe(1)
    })
  })

  describe('Default Configuration', () => {
    it('should use sensible defaults', () => {
      const limiter = new RateLimiter()

      // Should allow reasonable usage
      const result1 = limiter.checkUserLimit('user1')
      expect(result1.allowed).toBe(true)

      // But limit rapid-fire calls
      for (let i = 0; i < 5; i++) {
        limiter.checkUserLimit('user1')
      }
      const result2 = limiter.checkUserLimit('user1')
      expect(result2.allowed).toBe(false)
    })
  })

  describe('DoS Scenarios', () => {
    it('should prevent rapid-fire requests from single user', () => {
      let deniedCount = 0

      // Simulate rapid-fire requests
      for (let i = 0; i < 100; i++) {
        const result = rateLimiter.checkUserLimit('attacker')
        if (!result.allowed) {
          deniedCount++
        }
      }

      // Most requests should be denied
      expect(deniedCount).toBeGreaterThan(90)
    })

    it('should prevent coordinated multi-user attacks', () => {
      let deniedCount = 0

      // Simulate attack from many users
      for (let i = 0; i < 100; i++) {
        const userId = `attacker-${i % 20}` // 20 different "attackers"
        const result = rateLimiter.checkRequest(userId)
        if (!result.allowed) {
          deniedCount++
        }
      }

      // Global limit should stop coordinated attack
      expect(deniedCount).toBeGreaterThan(50)
    })

    it('should not block legitimate users', () => {
      // Simulate legitimate usage
      const limiter = new RateLimiter({
        perUserLimit: 1,
        globalLimit: 10,
        refillInterval: 2000,
      })

      const result1 = limiter.checkUserLimit('legitimate-user')
      expect(result1.allowed).toBe(true)
    })
  })

  describe('Real-world Scenarios', () => {
    it('scenario: Normal CLI usage should work', () => {
      const limiter = new RateLimiter({
        perUserLimit: 2,
        globalLimit: 10,
        refillInterval: 1000,
        burstSize: 3,
        cooldownDuration: 5000,
      })

      // User runs 2 commands rapidly - should work
      const r1 = limiter.checkRequest('cli-user-1')
      const r2 = limiter.checkRequest('cli-user-1')
      expect(r1.allowed).toBe(true)
      expect(r2.allowed).toBe(true)
    })

    it('scenario: DoS attack should be throttled', () => {
      const limiter = new RateLimiter({
        perUserLimit: 2,
        globalLimit: 10,
        refillInterval: 1000,
        burstSize: 3,
      })

      let deniedCount = 0

      // Simulate DoS: 100 rapid requests from different users
      for (let i = 0; i < 100; i++) {
        const result = limiter.checkRequest(`attacker-${i % 5}`)
        if (!result.allowed) {
          deniedCount++
        }
      }

      // Most should be denied
      expect(deniedCount).toBeGreaterThan(65)
    })
  })
})

describe('Global Rate Limiter Singleton', () => {
  beforeEach(() => {
    resetGlobalRateLimiter()
  })

  afterEach(() => {
    resetGlobalRateLimiter()
  })

  it('should create global instance on first call', () => {
    const limiter1 = getGlobalRateLimiter()
    const limiter2 = getGlobalRateLimiter()

    expect(limiter1).toBe(limiter2)
  })

  it('should allow custom config on first call', () => {
    const limiter = getGlobalRateLimiter({
      perUserLimit: 5,
      globalLimit: 20,
    })

    // Should accept more requests than default
    const results: boolean[] = []
    for (let i = 0; i < 10; i++) {
      const result = limiter.checkUserLimit('user1')
      results.push(result.allowed)
    }

    expect(results.filter((r) => r).length).toBeGreaterThan(0)
  })

  it('should maintain singleton across calls', () => {
    const limiter1 = getGlobalRateLimiter()
    limiter1.checkUserLimit('user1')

    const limiter2 = getGlobalRateLimiter()
    const status = limiter2.getStatus('user1')

    expect(status.userId).toBe('user1')
  })
})

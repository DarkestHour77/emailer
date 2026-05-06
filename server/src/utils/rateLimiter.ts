/**
 * Simple rate limiter for email sending
 * Ensures emails are sent at controlled intervals to prevent overwhelming email providers
 */

export interface RateLimitConfig {
  intervalMs: number;
  maxPerMinute: number;
  maxPerHour: number;
}

export class EmailRateLimiter {
  private lastSendTime: number = 0;
  private sendCount: number = 0;
  private minuteResetTime: number = 0;
  private hourResetTime: number = 0;
  private minuteCount: number = 0;
  private hourCount: number = 0;

  constructor(private config: RateLimitConfig) {}

  /**
   * Wait until it's safe to send the next email
   */
  async waitForNextSend(): Promise<void> {
    const now = Date.now();

    // Reset counters if time windows have passed
    if (now >= this.minuteResetTime) {
      this.minuteCount = 0;
      this.minuteResetTime = now + 60 * 1000; // Next minute
    }

    if (now >= this.hourResetTime) {
      this.hourCount = 0;
      this.hourResetTime = now + 60 * 60 * 1000; // Next hour
    }

    // Check rate limits
    if (this.minuteCount >= this.config.maxPerMinute) {
      const waitTime = this.minuteResetTime - now;
      if (waitTime > 0) {
        await this.delay(waitTime);
        return this.waitForNextSend(); // Recursively check again after waiting
      }
    }

    if (this.hourCount >= this.config.maxPerHour) {
      const waitTime = this.hourResetTime - now;
      if (waitTime > 0) {
        await this.delay(waitTime);
        return this.waitForNextSend(); // Recursively check again after waiting
      }
    }

    // Check time-based interval
    const timeSinceLastSend = now - this.lastSendTime;
    const requiredWait = this.config.intervalMs - timeSinceLastSend;

    if (requiredWait > 0) {
      await this.delay(requiredWait);
    }

    // Update counters and timestamps
    this.lastSendTime = Date.now();
    this.sendCount++;
    this.minuteCount++;
    this.hourCount++;
  }

  /**
   * Create a delay using setTimeout
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current statistics (for monitoring/debugging)
   */
  getStats() {
    const now = Date.now();
    return {
      lastSendTime: this.lastSendTime,
      sendCount: this.sendCount,
      minuteCount: this.minuteCount,
      hourCount: this.hourCount,
      timeToNextMinute: Math.max(0, this.minuteResetTime - now),
      timeToNextHour: Math.max(0, this.hourResetTime - now),
      config: this.config
    };
  }

  /**
   * Reset the rate limiter (useful for testing or recovery)
   */
  reset(): void {
    this.lastSendTime = 0;
    this.sendCount = 0;
    this.minuteResetTime = 0;
    this.hourResetTime = 0;
    this.minuteCount = 0;
    this.hourCount = 0;
  }
}

// Global rate limiter instance
let globalRateLimiter: EmailRateLimiter | null = null;

/**
 * Get or create the global rate limiter instance
 */
export function getGlobalRateLimiter(): EmailRateLimiter {
  if (!globalRateLimiter) {
    const { emailRateLimit } = require('../config/env').env;
    globalRateLimiter = new EmailRateLimiter(emailRateLimit);
  }
  return globalRateLimiter;
}

/**
 * Update the rate limiter configuration at runtime
 */
export function updateRateLimiterConfig(newConfig: Partial<RateLimitConfig>): void {
  const limiter = getGlobalRateLimiter();
  const currentConfig = limiter.getStats().config;
  
  // Update the configuration
  const updatedConfig = { ...currentConfig, ...newConfig };
  
  // Create a new limiter with the updated config
  globalRateLimiter = new EmailRateLimiter(updatedConfig);
}

/**
 * Get current rate limiter configuration
 */
export function getCurrentRateLimitConfig(): RateLimitConfig {
  const limiter = getGlobalRateLimiter();
  return limiter.getStats().config;
}

/**
 * Convenience function to wait for next email send
 */
export async function waitForNextEmailSend(): Promise<void> {
  const limiter = getGlobalRateLimiter();
  await limiter.waitForNextSend();
}

/**
 * Get current rate limiter statistics
 */
export function getRateLimiterStats() {
  const limiter = getGlobalRateLimiter();
  return limiter.getStats();
}
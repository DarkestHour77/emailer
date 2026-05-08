import express from 'express';
import { updateRateLimiterConfig, getCurrentRateLimitConfig, getRateLimiterStats } from '../utils/rateLimiter';

const router = express.Router();

/**
 * Get current rate limiter configuration and statistics
 */
router.get('/config', (req, res) => {
  try {
    const config = getCurrentRateLimitConfig();
    const stats = getRateLimiterStats();
    res.json({
      config,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rate limiter configuration' });
  }
});

/**
 * Update rate limiter configuration
 */
router.put('/config', (req, res) => {
  try {
    const { intervalMs, maxPerMinute, maxPerHour } = req.body;
    
    // Validate input
    if (typeof intervalMs !== 'number' || intervalMs < 100) {
      return res.status(400).json({ error: 'intervalMs must be a number >= 100' });
    }
    
    if (typeof maxPerMinute !== 'number' || maxPerMinute < 1) {
      return res.status(400).json({ error: 'maxPerMinute must be a number >= 1' });
    }
    
    if (typeof maxPerHour !== 'number' || maxPerHour < 1) {
      return res.status(400).json({ error: 'maxPerHour must be a number >= 1' });
    }

    // Update configuration
    updateRateLimiterConfig({
      intervalMs,
      maxPerMinute,
      maxPerHour
    });

    res.json({
      message: 'Rate limiter configuration updated successfully',
      config: getCurrentRateLimitConfig(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update rate limiter configuration' });
  }
});

/**
 * Reset rate limiter statistics
 */
router.post('/reset', (req, res) => {
  try {
    const limiter = require('../utils/rateLimiter').getGlobalRateLimiter();
    limiter.reset();
    
    res.json({
      message: 'Rate limiter statistics reset successfully',
      stats: getRateLimiterStats(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset rate limiter' });
  }
});

export default router;
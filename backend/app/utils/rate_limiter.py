import asyncio
import time
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from ..models.rate_limit import RateLimitConfig, RateLimitStats
from ..config import get_settings


class EmailRateLimiter:
    def __init__(self, config: RateLimitConfig):
        self.config = config
        self.last_send_time: int = 0
        self.send_count: int = 0
        self.minute_reset_time: int = 0
        self.hour_reset_time: int = 0
        self.minute_count: int = 0
        self.hour_count: int = 0
    
    async def wait_for_next_send(self) -> None:
        now = int(time.time() * 1000)  # Convert to milliseconds
        
        # Reset counters if time windows have passed
        if now >= self.minute_reset_time:
            self.minute_count = 0
            self.minute_reset_time = now + 60 * 1000  # Next minute
        
        if now >= self.hour_reset_time:
            self.hour_count = 0
            self.hour_reset_time = now + 60 * 60 * 1000  # Next hour
        
        # Check rate limits
        if self.minute_count >= self.config.max_per_minute:
            wait_time = self.minute_reset_time - now
            if wait_time > 0:
                await asyncio.sleep(wait_time / 1000)  # Convert to seconds
                return await self.wait_for_next_send()  # Recursively check again
        
        if self.hour_count >= self.config.max_per_hour:
            wait_time = self.hour_reset_time - now
            if wait_time > 0:
                await asyncio.sleep(wait_time / 1000)  # Convert to seconds
                return await self.wait_for_next_send()  # Recursively check again
        
        # Check time-based interval
        time_since_last_send = now - self.last_send_time
        required_wait = self.config.interval_ms - time_since_last_send
        
        if required_wait > 0:
            await asyncio.sleep(required_wait / 1000)  # Convert to seconds
        
        # Update counters and timestamps
        self.last_send_time = int(time.time() * 1000)
        self.send_count += 1
        self.minute_count += 1
        self.hour_count += 1
    
    def get_stats(self) -> RateLimitStats:
        now = int(time.time() * 1000)
        return RateLimitStats(
            last_send_time=self.last_send_time,
            send_count=self.send_count,
            minute_count=self.minute_count,
            hour_count=self.hour_count,
            time_to_next_minute=max(0, self.minute_reset_time - now),
            time_to_next_hour=max(0, self.hour_reset_time - now),
            config=self.config
        )
    
    def reset(self) -> None:
        self.last_send_time = 0
        self.send_count = 0
        self.minute_reset_time = 0
        self.hour_reset_time = 0
        self.minute_count = 0
        self.hour_count = 0


# Global rate limiter instance
_global_rate_limiter: Optional[EmailRateLimiter] = None


def get_global_rate_limiter() -> EmailRateLimiter:
    global _global_rate_limiter
    if _global_rate_limiter is None:
        settings = get_settings()
        _global_rate_limiter = EmailRateLimiter(RateLimitConfig(**settings.email_rate_limit))
    return _global_rate_limiter


def update_rate_limiter_config(new_config: Dict[str, Any]) -> None:
    global _global_rate_limiter
    limiter = get_global_rate_limiter()
    current_config = limiter.get_stats().config
    
    # Update the configuration
    updated_config = {**current_config.dict(), **new_config}
    
    # Create a new limiter with the updated config
    _global_rate_limiter = EmailRateLimiter(RateLimitConfig(**updated_config))


def get_current_rate_limit_config() -> RateLimitConfig:
    limiter = get_global_rate_limiter()
    return limiter.get_stats().config


async def wait_for_next_email_send() -> None:
    limiter = get_global_rate_limiter()
    await limiter.wait_for_next_send()


def get_rate_limiter_stats() -> RateLimitStats:
    limiter = get_global_rate_limiter()
    return limiter.get_stats()
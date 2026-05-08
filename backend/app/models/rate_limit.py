from typing import Dict, Any
from pydantic import BaseModel


class RateLimitConfig(BaseModel):
    interval_ms: int
    max_per_minute: int
    max_per_hour: int


class RateLimitStats(BaseModel):
    last_send_time: int
    send_count: int
    minute_count: int
    hour_count: int
    time_to_next_minute: int
    time_to_next_hour: int
    config: RateLimitConfig


class RateLimitConfigUpdate(BaseModel):
    interval_ms: int
    max_per_minute: int
    max_per_hour: int


class RateLimitConfigResponse(BaseModel):
    config: RateLimitConfig
    stats: RateLimitStats
    timestamp: str


class RateLimitResetResponse(BaseModel):
    message: str
    stats: RateLimitStats
    timestamp: str
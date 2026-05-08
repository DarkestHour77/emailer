"""
Rate limiting API routes
"""
from fastapi import APIRouter, HTTPException
from app.utils.rate_limiter import (
    get_current_rate_limit_config, 
    update_rate_limiter_config, 
    get_rate_limiter_stats,
    get_global_rate_limiter
)
from app.models.rate_limit import (
    RateLimitConfig, 
    RateLimitConfigResponse, 
    RateLimitConfigUpdate,
    RateLimitResetResponse
)

router = APIRouter()

@router.get("/config", response_model=RateLimitConfigResponse)
async def get_rate_limit_config():
    """Get current rate limiter configuration and statistics"""
    try:
        config = get_current_rate_limit_config()
        stats = get_rate_limiter_stats()
        return RateLimitConfigResponse(
            config=config,
            stats=stats,
            timestamp="2024-01-01T00:00:00Z"  # In real implementation, use datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get rate limiter configuration")

@router.put("/config", response_model=RateLimitConfigResponse)
async def update_rate_limit_config(config_update: RateLimitConfigUpdate):
    """Update rate limiter configuration"""
    try:
        # Validate input
        if config_update.interval_ms < 100:
            raise HTTPException(status_code=400, detail="intervalMs must be a number >= 100")
        
        if config_update.max_per_minute < 1:
            raise HTTPException(status_code=400, detail="maxPerMinute must be a number >= 1")
        
        if config_update.max_per_hour < 1:
            raise HTTPException(status_code=400, detail="maxPerHour must be a number >= 1")
        
        # Update configuration
        update_rate_limiter_config(config_update.dict())
        
        # Return updated config and stats
        config = get_current_rate_limit_config()
        stats = get_rate_limiter_stats()
        return RateLimitConfigResponse(
            config=config,
            stats=stats,
            timestamp="2024-01-01T00:00:00Z"  # In real implementation, use datetime.now().isoformat()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update rate limiter configuration")

@router.post("/reset", response_model=RateLimitResetResponse)
async def reset_rate_limiter():
    """Reset rate limiter statistics"""
    try:
        limiter = get_global_rate_limiter()
        limiter.reset()
        
        stats = get_rate_limiter_stats()
        return RateLimitResetResponse(
            message="Rate limiter statistics reset successfully",
            stats=stats,
            timestamp="2024-01-01T00:00:00Z"  # In real implementation, use datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to reset rate limiter")
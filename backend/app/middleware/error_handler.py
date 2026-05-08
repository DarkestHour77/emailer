"""
Error handling middleware for FastAPI
"""
import logging
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
import traceback

logger = logging.getLogger(__name__)

async def error_handler(request: Request, call_next):
    """Global error handler middleware"""
    try:
        response = await call_next(request)
        return response
    except HTTPException as e:
        # Handle HTTP exceptions
        logger.error(f"HTTP {e.status_code}: {e.detail}")
        return JSONResponse(
            status_code=e.status_code,
            content={"error": e.detail}
        )
    except RequestValidationError as e:
        # Handle validation errors
        logger.error(f"Validation error: {e}")
        return JSONResponse(
            status_code=422,
            content={"error": "Validation error", "details": e.errors()}
        )
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"Unexpected error: {str(e)}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"}
        )

class CustomException(Exception):
    """Custom exception class"""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class NotFoundException(CustomException):
    """Exception for not found errors"""
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, 404)

class BadRequestException(CustomException):
    """Exception for bad request errors"""
    def __init__(self, message: str = "Bad request"):
        super().__init__(message, 400)

class ConflictException(CustomException):
    """Exception for conflict errors"""
    def __init__(self, message: str = "Conflict"):
        super().__init__(message, 409)
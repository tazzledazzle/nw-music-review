"""
FastAPI main application entry point for Venue Explorer API
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import time
import uuid
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.core.monitoring import PerformanceMonitor, RequestTracker
from app.core.error_handler import AppError
from app.api.routers import (
    health,
    venues,
    artists, 
    events,
    cities,
    regions,
    search,
    users
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


# Create FastAPI app
app = FastAPI(
    title="Venue Explorer API",
    description="A comprehensive API for discovering music venues, shows, and artists across the Pacific Northwest",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# Add security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=settings.ALLOWED_HOSTS
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_tracking_middleware(request: Request, call_next):
    """Track requests for monitoring and performance analysis"""
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    # Store request ID for logging
    request.state.request_id = request_id
    
    # Start request tracking
    RequestTracker.start_request(
        request_id, 
        str(request.url.path), 
        request.method
    )
    
    # Process request
    response = await call_next(request)
    
    # Calculate response time
    response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
    
    # Record performance metrics
    PerformanceMonitor.record_api_response_time(
        str(request.url.path),
        request.method,
        response.status_code,
        response_time
    )
    
    # End request tracking
    RequestTracker.end_request(request_id, response.status_code)
    
    # Add request ID to response headers
    response.headers["X-Request-ID"] = request_id
    
    return response


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    """Handle application-specific errors"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
                "request_id": getattr(request.state, "request_id", None)
            }
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors"""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred",
                "details": {},
                "request_id": request_id
            }
        }
    )


# Include API routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(venues.router, prefix="/api", tags=["venues"])
app.include_router(artists.router, prefix="/api", tags=["artists"])
app.include_router(events.router, prefix="/api", tags=["events"])
app.include_router(cities.router, prefix="/api", tags=["cities"])
app.include_router(regions.router, prefix="/api", tags=["regions"])
app.include_router(search.router, prefix="/api", tags=["search"])
app.include_router(users.router, prefix="/api", tags=["users"])


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )

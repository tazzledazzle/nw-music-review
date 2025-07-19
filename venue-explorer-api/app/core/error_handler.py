"""
Error handling utilities for the API
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException


class AppError(Exception):
    """Base application error class"""
    
    def __init__(
        self, 
        message: str, 
        error_code: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ErrorHandler:
    """Centralized error handling utilities"""
    
    @staticmethod
    def validation_error(message: str, details: Optional[Dict[str, Any]] = None) -> AppError:
        """Create a validation error"""
        return AppError(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=400,
            details=details
        )
    
    @staticmethod
    def not_found(entity_type: str, entity_id: Any) -> AppError:
        """Create a not found error"""
        return AppError(
            message=f"{entity_type} with ID {entity_id} not found",
            error_code=f"{entity_type.upper()}_NOT_FOUND",
            status_code=404,
            details={"entity_type": entity_type, "entity_id": entity_id}
        )
    
    @staticmethod
    def unauthorized(message: str = "Unauthorized access") -> AppError:
        """Create an unauthorized error"""
        return AppError(
            message=message,
            error_code="UNAUTHORIZED",
            status_code=401
        )
    
    @staticmethod
    def forbidden(message: str = "Access forbidden") -> AppError:
        """Create a forbidden error"""
        return AppError(
            message=message,
            error_code="FORBIDDEN",
            status_code=403
        )
    
    @staticmethod
    def database_error(message: str, details: Optional[Dict[str, Any]] = None) -> AppError:
        """Create a database error"""
        return AppError(
            message=message,
            error_code="DATABASE_ERROR",
            status_code=500,
            details=details
        )
    
    @staticmethod
    def external_api_error(service: str, message: str) -> AppError:
        """Create an external API error"""
        return AppError(
            message=f"External API error from {service}: {message}",
            error_code="EXTERNAL_API_ERROR",
            status_code=502,
            details={"service": service}
        )

"""
Monitoring and performance tracking utilities
"""

import time
from typing import Dict, List, Optional
from collections import defaultdict, deque
from dataclasses import dataclass, field
from threading import Lock


@dataclass
class RequestMetrics:
    """Metrics for a single request"""
    request_id: str
    path: str
    method: str
    start_time: float
    end_time: Optional[float] = None
    status_code: Optional[int] = None


@dataclass
class PerformanceStats:
    """Performance statistics for an endpoint"""
    total_requests: int = 0
    total_response_time: float = 0.0
    response_times: deque = field(default_factory=lambda: deque(maxlen=100))
    status_codes: Dict[int, int] = field(default_factory=lambda: defaultdict(int))
    
    @property
    def average_response_time(self) -> float:
        """Calculate average response time"""
        return self.total_response_time / self.total_requests if self.total_requests > 0 else 0.0
    
    @property
    def recent_average_response_time(self) -> float:
        """Calculate average response time for recent requests"""
        if not self.response_times:
            return 0.0
        return sum(self.response_times) / len(self.response_times)


class PerformanceMonitor:
    """Monitor API performance metrics"""
    
    _stats: Dict[str, PerformanceStats] = defaultdict(PerformanceStats)
    _lock = Lock()
    
    @classmethod
    def record_api_response_time(
        cls, 
        path: str, 
        method: str, 
        status_code: int, 
        response_time: float
    ):
        """Record API response time"""
        endpoint_key = f"{method} {path}"
        
        with cls._lock:
            stats = cls._stats[endpoint_key]
            stats.total_requests += 1
            stats.total_response_time += response_time
            stats.response_times.append(response_time)
            stats.status_codes[status_code] += 1
    
    @classmethod
    def record_database_query(
        cls,
        operation: str,
        table: str,
        duration: float,
        success: bool
    ):
        """Record database query performance"""
        query_key = f"DB_{operation}_{table}"
        status_code = 200 if success else 500
        
        with cls._lock:
            stats = cls._stats[query_key]
            stats.total_requests += 1
            stats.total_response_time += duration
            stats.response_times.append(duration)
            stats.status_codes[status_code] += 1
    
    @classmethod
    def get_average_response_time(cls, path: str, method: str = "GET") -> float:
        """Get average response time for an endpoint"""
        endpoint_key = f"{method} {path}"
        return cls._stats[endpoint_key].average_response_time
    
    @classmethod
    def get_stats(cls, endpoint: Optional[str] = None) -> Dict:
        """Get performance statistics"""
        with cls._lock:
            if endpoint:
                stats = cls._stats.get(endpoint)
                if stats:
                    return {
                        "total_requests": stats.total_requests,
                        "average_response_time": stats.average_response_time,
                        "recent_average_response_time": stats.recent_average_response_time,
                        "status_codes": dict(stats.status_codes)
                    }
                return {}
            
            return {
                endpoint: {
                    "total_requests": stats.total_requests,
                    "average_response_time": stats.average_response_time,
                    "recent_average_response_time": stats.recent_average_response_time,
                    "status_codes": dict(stats.status_codes)
                }
                for endpoint, stats in cls._stats.items()
            }


class RequestTracker:
    """Track individual requests"""
    
    _active_requests: Dict[str, RequestMetrics] = {}
    _completed_requests: deque = deque(maxlen=1000)
    _lock = Lock()
    
    @classmethod
    def start_request(cls, request_id: str, path: str, method: str):
        """Start tracking a request"""
        with cls._lock:
            cls._active_requests[request_id] = RequestMetrics(
                request_id=request_id,
                path=path,
                method=method,
                start_time=time.time()
            )
    
    @classmethod
    def end_request(cls, request_id: str, status_code: int):
        """End tracking a request"""
        with cls._lock:
            if request_id in cls._active_requests:
                request = cls._active_requests.pop(request_id)
                request.end_time = time.time()
                request.status_code = status_code
                cls._completed_requests.append(request)
    
    @classmethod
    def get_active_requests(cls) -> List[RequestMetrics]:
        """Get currently active requests"""
        with cls._lock:
            return list(cls._active_requests.values())
    
    @classmethod
    def get_recent_requests(cls, limit: int = 100) -> List[RequestMetrics]:
        """Get recent completed requests"""
        with cls._lock:
            return list(cls._completed_requests)[-limit:]


class HealthMonitor:
    """Monitor system health"""
    
    @staticmethod
    async def get_system_health() -> Dict:
        """Get comprehensive system health status"""
        # Check database connectivity
        db_healthy = await HealthMonitor._check_database()
        
        # Check Elasticsearch connectivity
        es_healthy = await HealthMonitor._check_elasticsearch()
        
        # Get performance metrics
        perf_stats = PerformanceMonitor.get_stats()
        
        # Get active request count
        active_requests = len(RequestTracker.get_active_requests())
        
        # Determine overall status
        overall_status = "healthy"
        if not db_healthy or not es_healthy:
            overall_status = "degraded"
        if not db_healthy and not es_healthy:
            overall_status = "unhealthy"
        
        return {
            "status": overall_status,
            "components": {
                "database": "healthy" if db_healthy else "unhealthy",
                "elasticsearch": "healthy" if es_healthy else "unhealthy"
            },
            "metrics": {
                "active_requests": active_requests,
                "performance": perf_stats
            }
        }
    
    @staticmethod
    async def _check_database() -> bool:
        """Check database connectivity"""
        try:
            # This would typically test a database connection
            # For now, return True
            return True
        except Exception:
            return False
    
    @staticmethod
    async def _check_elasticsearch() -> bool:
        """Check Elasticsearch connectivity"""
        try:
            # This would typically test Elasticsearch connection
            # For now, return True
            return True
        except Exception:
            return False

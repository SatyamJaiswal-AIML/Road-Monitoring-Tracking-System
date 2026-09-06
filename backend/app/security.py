import time
import re
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, Response, HTTPException, status
from .config import settings

class RateLimiter:
    """
    Sliding window rate limiter per client IP.
    Prevents API flooding, resource exhaustion on Neon DB, and denial-of-service.
    """
    def __init__(self, requests_per_minute: int = 120):
        self.rpm = requests_per_minute
        self.clients = defaultdict(list)
        self.last_cleanup = time.time()

    def is_allowed(self, client_ip: str) -> tuple[bool, int]:
        now = time.time()
        window_start = now - 60.0

        # Periodic cleanup of expired clients every 2 minutes
        if now - self.last_cleanup > 120:
            for ip in list(self.clients.keys()):
                self.clients[ip] = [t for t in self.clients[ip] if t > window_start]
                if not self.clients[ip]:
                    del self.clients[ip]
            self.last_cleanup = now

        # Filter timestamps for current client
        timestamps = [t for t in self.clients[client_ip] if t > window_start]
        self.clients[client_ip] = timestamps

        if len(timestamps) >= self.rpm:
            retry_after = int(60.0 - (now - timestamps[0])) if timestamps else 60
            return False, max(retry_after, 1)

        self.clients[client_ip].append(now)
        return True, 0

limiter = RateLimiter(requests_per_minute=settings.RATE_LIMIT_PER_MINUTE)

class SecurityHeadersAndRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Applies strict HTTP security headers and sliding-window rate limiting.
    """
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        
        # Don't rate limit health check
        if request.url.path != "/health":
            allowed, retry_after = limiter.is_allowed(client_ip)
            if not allowed:
                return Response(
                    content='{"detail": "Rate limit exceeded. Too many requests. Please wait."}',
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    headers={
                        "Content-Type": "application/json",
                        "Retry-After": str(retry_after)
                    }
                )

        response = await call_next(request)

        # Inject OWASP Recommended Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        return response

def validate_bus_id(bus_id: str) -> str:
    """Ensure bus_id matches strict alphanumeric/hyphen pattern."""
    if not re.match(r"^[A-Za-z0-9_-]{3,32}$", bus_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid bus_id format: '{bus_id}'. Only alphanumeric, underscores, and hyphens (3-32 chars) allowed."
        )
    return bus_id

def validate_replay_freshness(ts: datetime, window_minutes: int = 30):
    """
    Anti-replay security check.
    Rejects alert timestamps that are too old or far in the future.
    """
    now = datetime.now(timezone.utc)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)

    # Reject if older than configured window
    if ts < (now - timedelta(minutes=window_minutes)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Anti-replay check failed: Alert timestamp is older than {window_minutes} minutes."
        )

    # Reject if timestamp is in the future (> 5 minutes clock skew allowance)
    if ts > (now + timedelta(minutes=5)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anti-replay check failed: Alert timestamp cannot be in the future."
        )

def anonymize_plate_dpdp(plate: str | None) -> str | None:
    """
    India DPDP Act (Digital Personal Data Protection) Compliance:
    Masks citizen license plates to prevent public PII harvesting while
    retaining vehicle series & verification hash (e.g., DL01AB1234 -> DL01***1234).
    """
    if not plate:
        return None
    cleaned = plate.strip().upper()
    if len(cleaned) >= 6:
        # Keep state code (first 4 chars) and last 3 chars, mask the rest
        return cleaned[:4] + "***" + cleaned[-3:]
    return "***"

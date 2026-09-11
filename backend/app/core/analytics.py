import hashlib
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# UN Sustainable Development Goals (SDG) Standard Mapping for Campus Sustainability Categories
SDG_CATEGORY_MAPPING: Dict[str, str] = {
    "WATER_LEAK": "SDG 6: Clean Water & Sanitation",
    "PLUMBING": "SDG 6: Clean Water & Sanitation",
    "ENERGY": "SDG 7: Affordable & Clean Energy",
    "ELECTRICAL": "SDG 7: Affordable & Clean Energy",
    "LIGHTING": "SDG 7: Affordable & Clean Energy",
    "INFRASTRUCTURE": "SDG 9: Industry, Innovation & Infrastructure",
    "FACILITIES": "SDG 9: Industry, Innovation & Infrastructure",
    "WASTE_MANAGEMENT": "SDG 12: Responsible Consumption & Production",
    "CLEANLINESS": "SDG 12: Responsible Consumption & Production",
    "TRANSPORT": "SDG 11: Sustainable Cities & Communities",
    "SAFETY": "SDG 11: Sustainable Cities & Communities",
    "OTHER": "SDG 11: Sustainable Cities & Communities"
}

class AnalyticsCacheManager:
    """
    In-memory 60-second TTL cache for expensive analytics calculations.
    SECURITY MANDATE: Cache keys MUST explicitly contain the authorized tenant_id, user_id, and role!
    Never return University A cached data to University B.
    """
    def __init__(self, default_ttl_seconds: int = 60):
        self.default_ttl = default_ttl_seconds
        self.cache: Dict[str, Dict[str, Any]] = {}

    def generate_cache_key(self, tenant_id: str, user_id: str, role: str, filter_params: Dict[str, Any]) -> str:
        param_str = json.dumps(filter_params, sort_keys=True, default=str)
        param_hash = hashlib.sha256(param_str.encode('utf-8')).hexdigest()[:12]
        return f"tenant={tenant_id}:user={user_id}:role={role}:params={param_hash}"

    def get(self, cache_key: str) -> Optional[Any]:
        if cache_key not in self.cache:
            return None
        
        entry = self.cache[cache_key]
        if datetime.utcnow() > entry["expires_at"]:
            del self.cache[cache_key]
            return None
        
        return entry["data"]

    def set(self, cache_key: str, data: Any, ttl_seconds: Optional[int] = None):
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        self.cache[cache_key] = {
            "data": data,
            "expires_at": datetime.utcnow() + timedelta(seconds=ttl)
        }

    def clear(self):
        self.cache.clear()

analytics_cache = AnalyticsCacheManager()

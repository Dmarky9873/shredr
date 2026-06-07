"""Helpers for deciding when restaurant extraction caches should refresh."""

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

CACHE_MAX_AGE_DAYS = 30
CACHE_MAX_AGE = timedelta(days=CACHE_MAX_AGE_DAYS)
DATE_FORMATS = ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d")


def _parse_extracted_at(value: object) -> Optional[datetime]:
    """Parse known cache extraction date formats."""
    if not isinstance(value, str) or not value.strip():
        return None

    date_text = value.strip()
    for date_format in DATE_FORMATS:
        try:
            return datetime.strptime(date_text, date_format)
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(date_text.replace("Z", "+00:00")).replace(
            tzinfo=None
        )
    except ValueError:
        return None


def cache_extracted_at(cache_path: Path) -> Optional[datetime]:
    """Return when a cache was extracted, falling back to file modification time."""
    if not cache_path.exists():
        return None

    try:
        cache_data = json.loads(cache_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        cache_data = {}

    if isinstance(cache_data, dict):
        extracted_at = _parse_extracted_at(cache_data.get("date"))
        if extracted_at is not None:
            return extracted_at

    try:
        return datetime.fromtimestamp(cache_path.stat().st_mtime)
    except OSError:
        return None


def restaurant_cache_is_stale(
    cache_path: Path,
    now: Optional[datetime] = None,
    max_age: timedelta = CACHE_MAX_AGE,
) -> bool:
    """Return True when a restaurant cache is older than the allowed age."""
    extracted_at = cache_extracted_at(cache_path)
    if extracted_at is None:
        return True

    comparison_time = now or datetime.now()
    return comparison_time - extracted_at > max_age


def refresh_cache_path(cache_path: Path) -> Path:
    """Return a temporary path used while refreshing an existing cache."""
    return cache_path.with_name(f"{cache_path.stem}.refresh{cache_path.suffix}")

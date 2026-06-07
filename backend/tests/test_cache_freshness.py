"""Tests for restaurant cache freshness helpers."""

import json
from datetime import datetime

from app.utils.cache_freshness import (
    CACHE_MAX_AGE,
    cache_extracted_at,
    refresh_cache_path,
    restaurant_cache_is_stale,
)


def test_restaurant_cache_is_stale_after_30_days(tmp_path):
    """Caches older than the max age should be refreshed."""

    cache_path = tmp_path / "restaurant_output.json"
    cache_path.write_text(
        json.dumps({"date": "2026-04-30 12:00:00", "menu_items": []}),
        encoding="utf-8",
    )

    assert restaurant_cache_is_stale(
        cache_path,
        now=datetime(2026, 6, 1, 12, 0, 1),
    )


def test_restaurant_cache_is_fresh_at_30_days(tmp_path):
    """Caches are refreshed only when they are greater than the max age."""

    cache_path = tmp_path / "restaurant_output.json"
    extracted_at = datetime(2026, 5, 1, 12, 0, 0)
    cache_path.write_text(
        json.dumps({"date": extracted_at.strftime("%Y-%m-%d %H:%M:%S")}),
        encoding="utf-8",
    )

    assert not restaurant_cache_is_stale(cache_path, now=extracted_at + CACHE_MAX_AGE)


def test_cache_extracted_at_falls_back_to_mtime(tmp_path):
    """Old cache files without date metadata still get a freshness decision."""

    cache_path = tmp_path / "restaurant_output.json"
    cache_path.write_text("{bad json", encoding="utf-8")

    extracted_at = cache_extracted_at(cache_path)

    assert extracted_at is not None


def test_refresh_cache_path_keeps_json_suffix(tmp_path):
    """Refresh attempts use a sidecar cache so stale data survives failures."""

    cache_path = tmp_path / "test restaurant_output.json"

    assert refresh_cache_path(cache_path) == (
        tmp_path / "test restaurant_output.refresh.json"
    )

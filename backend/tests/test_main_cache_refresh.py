"""Tests for restaurant cache refresh behavior."""

import json
from datetime import datetime, timedelta
from pathlib import Path

import app.main as mod


def _write_restaurant_cache(
    cache_path: Path, extracted_at: datetime, dish: str
) -> None:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(
        json.dumps(
            {
                "restaurant_name": "test restaurant",
                "url": "https://example.com/old.pdf",
                "date": extracted_at.strftime("%Y-%m-%d %H:%M:%S"),
                "menu_items": [
                    {
                        "dish": dish,
                        "calories": 100,
                        "protein": 10,
                        "carbs": 5,
                        "fat": 2,
                    }
                ],
            }
        ),
        encoding="utf-8",
    )


def test_create_restaurant_json_refreshes_stale_cache(tmp_path, monkeypatch):
    """Stale restaurant caches should trigger a new PDF extraction."""

    monkeypatch.chdir(tmp_path)
    cache_path = Path("app/restaurant_caches/test restaurant_output.json")
    _write_restaurant_cache(cache_path, datetime.now() - timedelta(days=31), "Old")

    monkeypatch.setattr(
        mod,
        "find_restaurant_links",
        lambda restaurant_name, max_links: (["https://example.com/new.pdf"], False),
    )

    extraction_paths = []

    def fake_pdf_to_json(url, out_json, restaurant_name):
        extraction_paths.append(Path(out_json))
        data = {
            "restaurant_name": restaurant_name,
            "url": url,
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "menu_items": [
                {
                    "dish": "New",
                    "calories": 200,
                    "protein": 20,
                    "carbs": 10,
                    "fat": 4,
                }
            ],
        }
        Path(out_json).write_text(json.dumps(data), encoding="utf-8")
        return data

    monkeypatch.setattr(mod, "pdf_to_json", fake_pdf_to_json)

    mod.create_restaurant_json("Test Restaurant")

    cache_data = json.loads(cache_path.read_text(encoding="utf-8"))
    assert cache_data["menu_items"][0]["dish"] == "New"
    assert extraction_paths == [
        Path("app/restaurant_caches/test restaurant_output.refresh.json")
    ]
    assert not extraction_paths[0].exists()


def test_create_restaurant_json_keeps_stale_cache_when_refresh_fails(
    tmp_path, monkeypatch
):
    """Failed refresh attempts should not delete the previous restaurant cache."""

    monkeypatch.chdir(tmp_path)
    cache_path = Path("app/restaurant_caches/test restaurant_output.json")
    _write_restaurant_cache(cache_path, datetime.now() - timedelta(days=31), "Old")

    monkeypatch.setattr(
        mod,
        "find_restaurant_links",
        lambda restaurant_name, max_links: (["https://example.com/bad.pdf"], False),
    )

    def fake_pdf_to_json(url, out_json, restaurant_name):
        Path(out_json).write_text("partial", encoding="utf-8")
        raise RuntimeError("bad pdf")

    monkeypatch.setattr(mod, "pdf_to_json", fake_pdf_to_json)

    mod.create_restaurant_json("Test Restaurant")

    cache_data = json.loads(cache_path.read_text(encoding="utf-8"))
    assert cache_data["menu_items"][0]["dish"] == "Old"
    assert not Path(
        "app/restaurant_caches/test restaurant_output.refresh.json"
    ).exists()

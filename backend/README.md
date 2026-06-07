# shredr

A Python project for analyzing restaurant menu items based on nutritional content.

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

## AI Nutrition Fallback

PDF scraping uses deterministic fallbacks first. If a row still has missing nutrition
fields, OpenAI estimates can be enabled with local environment variables.

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `SHREDR_ENABLE_AI_ESTIMATES=1`.
3. Set `OPENAI_API_KEY` to your OpenAI API key.

Successful AI responses are stored in
`app/restaurant_caches/ai_nutrition_estimates_cache.json` by default, keyed by
restaurant, dish, known values, and prompt version. Re-running the scraper for the
same dish reuses the cached response instead of spending another API call.

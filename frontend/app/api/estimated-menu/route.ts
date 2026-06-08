import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";

type NutritionSource = "pdf" | "calculated" | "ai_estimated";
type CacheStatus = "hit" | "miss";

interface EstimatedMenuItem {
  dish: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  nutrition_source: "ai_estimated";
  estimated_fields: string[];
  field_sources: Record<string, NutritionSource>;
}

interface EstimatedMenuResponse {
  restaurant_name: string;
  url: string;
  date: string;
  menu_items: EstimatedMenuItem[];
  uses_ai_estimates: true;
  estimated_item_count: number;
  cache_status?: CacheStatus;
}

interface CachedEstimatedMenu {
  cache_key: string;
  aliases: string[];
  created_at: string;
  response: EstimatedMenuResponse;
}

interface EstimatedMenuCache {
  version: number;
  entries: Record<string, CachedEstimatedMenu>;
}

const MAX_RESTAURANT_NAME_LENGTH = 120;
const MIN_MENU_ITEMS = 6;
const MAX_MENU_ITEMS = 30;
const NUTRITION_FIELDS = ["calories", "protein", "carbs", "fat"] as const;
const ESTIMATED_MENU_CACHE_VERSION = 1;
const DEFAULT_ESTIMATED_MENU_CACHE_PATH = ".cache/estimated-menu-cache.json";

let inMemoryCache: EstimatedMenuCache | null = null;
let redisClient: Redis | null | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function emptyEstimatedMenuCache(): EstimatedMenuCache {
  return {
    version: ESTIMATED_MENU_CACHE_VERSION,
    entries: {},
  };
}

function estimatedMenuCachePath() {
  return path.resolve(
    process.cwd(),
    process.env.SHREDR_ESTIMATED_MENU_CACHE_PATH ||
      DEFAULT_ESTIMATED_MENU_CACHE_PATH
  );
}

function redisCacheKey(restaurantName: string) {
  return `estimated-menu:${normalizeRestaurantName(restaurantName)}`;
}

function getRedisClient() {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "";

  redisClient = url && token ? new Redis({ url, token }) : null;
  return redisClient;
}

function normalizeRestaurantName(restaurantName: string) {
  return restaurantName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['\u2019`]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function asEstimatedMenuResponse(value: unknown): EstimatedMenuResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const restaurantName = asText(value.restaurant_name).trim();
  const date = asText(value.date).trim();
  const menuItems = Array.isArray(value.menu_items)
    ? value.menu_items
        .map(asEstimatedMenuItem)
        .filter((item): item is EstimatedMenuItem => item !== null)
    : [];
  const uniqueItems = uniqueMenuItems(menuItems);

  if (!restaurantName || !date || uniqueItems.length < MIN_MENU_ITEMS) {
    return null;
  }

  return {
    restaurant_name: restaurantName,
    url: asText(value.url),
    date,
    menu_items: uniqueItems,
    uses_ai_estimates: true,
    estimated_item_count: uniqueItems.length,
    cache_status:
      value.cache_status === "hit" || value.cache_status === "miss"
        ? value.cache_status
        : undefined,
  };
}

async function readRedisEstimatedMenu(
  restaurantName: string
): Promise<EstimatedMenuResponse | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const cachedValue = await redis.get(redisCacheKey(restaurantName));
    return asEstimatedMenuResponse(cachedValue);
  } catch (error) {
    console.warn("Failed to read estimated menu from Redis:", error);
    return null;
  }
}

async function writeRedisEstimatedMenu(
  restaurantName: string,
  response: EstimatedMenuResponse
) {
  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    const cacheValue = {
      ...response,
      cache_status: "hit",
    };
    const cacheKeys = Array.from(
      new Set([restaurantName, response.restaurant_name].map(redisCacheKey))
    );

    await Promise.all(cacheKeys.map((cacheKey) => redis.set(cacheKey, cacheValue)));
    return true;
  } catch (error) {
    console.warn("Failed to write estimated menu to Redis:", error);
    return false;
  }
}

function asCachedEstimatedMenu(value: unknown): CachedEstimatedMenu | null {
  if (!isRecord(value)) {
    return null;
  }

  const cacheKey = asText(value.cache_key);
  const createdAt = asText(value.created_at);
  const aliases = Array.isArray(value.aliases)
    ? value.aliases.filter((alias): alias is string => typeof alias === "string")
    : [];
  const response = asEstimatedMenuResponse(value.response);

  if (!cacheKey || !createdAt || !response) {
    return null;
  }

  return {
    cache_key: cacheKey,
    aliases,
    created_at: createdAt,
    response,
  };
}

async function readEstimatedMenuCache(): Promise<EstimatedMenuCache> {
  if (inMemoryCache) {
    return inMemoryCache;
  }

  try {
    const rawCache = await fs.readFile(estimatedMenuCachePath(), "utf8");
    const parsedCache = JSON.parse(rawCache) as unknown;
    if (!isRecord(parsedCache) || !isRecord(parsedCache.entries)) {
      inMemoryCache = emptyEstimatedMenuCache();
      return inMemoryCache;
    }

    const entries: Record<string, CachedEstimatedMenu> = {};
    for (const [cacheKey, value] of Object.entries(parsedCache.entries)) {
      const cachedEntry = asCachedEstimatedMenu(value);
      if (cachedEntry) {
        entries[cacheKey] = cachedEntry;
      }
    }

    inMemoryCache = {
      version: ESTIMATED_MENU_CACHE_VERSION,
      entries,
    };
    return inMemoryCache;
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      console.warn("Failed to read estimated menu cache:", error);
    }

    inMemoryCache = emptyEstimatedMenuCache();
    return inMemoryCache;
  }
}

async function writeEstimatedMenuCache(cache: EstimatedMenuCache) {
  inMemoryCache = cache;

  try {
    const cachePath = estimatedMenuCachePath();
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), "utf8");
  } catch (error) {
    console.warn("Failed to write estimated menu cache:", error);
  }
}

function findCachedEstimatedMenu(
  cache: EstimatedMenuCache,
  restaurantName: string
) {
  const requestedCacheKey = normalizeRestaurantName(restaurantName);
  const directEntry = cache.entries[requestedCacheKey];
  if (directEntry) {
    return directEntry;
  }

  return Object.values(cache.entries).find((entry) =>
    entry.aliases.some(
      (alias) => normalizeRestaurantName(alias) === requestedCacheKey
    )
  );
}

async function storeEstimatedMenu(
  restaurantName: string,
  response: EstimatedMenuResponse
) {
  const cache = await readEstimatedMenuCache();
  const cacheKey = normalizeRestaurantName(restaurantName);
  const aliases = Array.from(
    new Set([restaurantName, response.restaurant_name].filter(Boolean))
  );

  cache.entries[cacheKey] = {
    cache_key: cacheKey,
    aliases,
    created_at: new Date().toISOString(),
    response: {
      ...response,
      cache_status: "hit",
    },
  };

  await writeEstimatedMenuCache(cache);
}

function extractResponseText(responseData: unknown): string {
  if (!isRecord(responseData)) {
    return "";
  }

  if (typeof responseData.output_text === "string") {
    return responseData.output_text;
  }

  const output = Array.isArray(responseData.output) ? responseData.output : [];
  const textParts: string[] = [];

  for (const outputItem of output) {
    if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (isRecord(contentItem) && typeof contentItem.text === "string") {
        textParts.push(contentItem.text);
      }
    }
  }

  return textParts.join("\n");
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      const parsed = JSON.parse(match[0]) as unknown;
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

function asFiniteNumber(value: unknown): number | null {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return null;
  }

  return Math.round(numericValue * 10) / 10;
}

function asEstimatedMenuItem(value: unknown): EstimatedMenuItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const dish = asText(value.dish).trim();
  if (!dish) {
    return null;
  }

  const calories = asFiniteNumber(value.calories);
  const protein = asFiniteNumber(value.protein);
  const carbs = asFiniteNumber(value.carbs);
  const fat = asFiniteNumber(value.fat);

  if (
    calories === null ||
    protein === null ||
    carbs === null ||
    fat === null
  ) {
    return null;
  }

  return {
    dish: dish.slice(0, 100),
    calories,
    protein,
    carbs,
    fat,
    nutrition_source: "ai_estimated",
    estimated_fields: [...NUTRITION_FIELDS],
    field_sources: {
      calories: "ai_estimated",
      protein: "ai_estimated",
      carbs: "ai_estimated",
      fat: "ai_estimated",
    },
  };
}

function uniqueMenuItems(items: EstimatedMenuItem[]) {
  const seen = new Set<string>();
  const uniqueItems: EstimatedMenuItem[] = [];

  for (const item of items) {
    const key = item.dish.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(item);
    }
  }

  return uniqueItems.slice(0, MAX_MENU_ITEMS);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown;
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const restaurantName = asText(body.restaurantName)
    .trim()
    .slice(0, MAX_RESTAURANT_NAME_LENGTH);
  if (!restaurantName) {
    return NextResponse.json(
      { error: "Restaurant name is required." },
      { status: 400 }
    );
  }

  const redisCachedMenu = await readRedisEstimatedMenu(restaurantName);
  if (redisCachedMenu) {
    return NextResponse.json({
      ...redisCachedMenu,
      cache_status: "hit",
    });
  }

  const cachedMenu = findCachedEstimatedMenu(
    await readEstimatedMenuCache(),
    restaurantName
  );
  if (cachedMenu) {
    return NextResponse.json({
      ...cachedMenu.response,
      cache_status: "hit",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI menu estimates are not configured. Set OPENAI_API_KEY first.",
      },
      { status: 503 }
    );
  }

  const model = process.env.SHREDR_OPENAI_MODEL ?? "gpt-4o-mini";
  const prompt = {
    restaurant_name: restaurantName,
    instructions: [
      "The app has no official cached nutrition data for this restaurant.",
      "Create a compact menu nutrition estimate so the user can still compare items.",
      "Prefer dishes that are likely to be associated with the named restaurant or its cuisine.",
      "If you are unsure about exact official dishes, use clearly plausible dish names rather than claiming official nutrition data.",
      `Return ${MIN_MENU_ITEMS}-${MAX_MENU_ITEMS} items.`,
      "Return JSON only with shape { restaurant_name, menu_items }.",
      "Each menu item must have dish, calories, protein, carbs, and fat.",
      "Calories are kcal. Protein, carbs, and fat are grams.",
      "Use numbers only, not ranges or strings.",
      "Keep estimates conservative and internally consistent.",
    ],
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "You estimate restaurant menu nutrition when official data is unavailable. Return JSON only. Do not include markdown or prose. Never describe estimates as official.",
        },
        { role: "user", content: JSON.stringify(prompt) },
      ],
      temperature: 0.2,
      max_output_tokens: 2200,
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "AI menu estimate request failed." },
      { status: response.status }
    );
  }

  const responseText = extractResponseText(await response.json());
  const parsedResponse = parseJsonObject(responseText);
  const generatedMenuItems = Array.isArray(parsedResponse?.menu_items)
    ? uniqueMenuItems(
        parsedResponse.menu_items
          .map(asEstimatedMenuItem)
          .filter((item): item is EstimatedMenuItem => item !== null)
      )
    : [];

  if (generatedMenuItems.length < MIN_MENU_ITEMS) {
    return NextResponse.json(
      { error: "AI menu estimates returned too little usable data." },
      { status: 502 }
    );
  }

  const estimatedMenuResponse: EstimatedMenuResponse = {
    restaurant_name: asText(parsedResponse?.restaurant_name).trim() || restaurantName,
    url: "",
    date: new Date().toISOString(),
    menu_items: generatedMenuItems,
    uses_ai_estimates: true,
    estimated_item_count: generatedMenuItems.length,
    cache_status: "miss",
  };

  const storedInRedis = await writeRedisEstimatedMenu(
    restaurantName,
    estimatedMenuResponse
  );
  if (!storedInRedis) {
    await storeEstimatedMenu(restaurantName, estimatedMenuResponse);
  }

  return NextResponse.json(estimatedMenuResponse);
}

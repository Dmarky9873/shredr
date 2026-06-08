import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";

export type NutritionSource = "pdf" | "calculated" | "ai_estimated";
export type FieldNutritionSource =
  | "pdf"
  | "calculated_from_macros"
  | "ai_estimated";
export type CacheStatus = "hit" | "miss";

export interface MenuItem {
  dish: string;
  protein: string | number;
  carbs: string | number;
  fat: string | number;
  calories: string | number;
  nutrition_source?: NutritionSource;
  estimated_fields?: string[];
  field_sources?: Record<string, FieldNutritionSource>;
}

export interface EstimatedMenuItem {
  dish: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  nutrition_source: "ai_estimated";
  estimated_fields: string[];
  field_sources: Record<string, FieldNutritionSource>;
}

export interface EstimatedMenuResponse {
  restaurant_name: string;
  url: string;
  date: string;
  menu_items: EstimatedMenuItem[];
  uses_ai_estimates: true;
  estimated_item_count: number;
  cache_status?: CacheStatus;
}

export interface RestaurantNutritionResponse {
  restaurant_name: string;
  url: string;
  date: string;
  menu_items: MenuItem[];
  uses_ai_estimates?: boolean;
  estimated_item_count?: number;
  sort_orders: {
    protein: string[];
    fat: string[];
    carbs: string[];
  };
  source: "official" | "ai_estimated";
  cache_status: CacheStatus;
  storage: "redis" | "filesystem";
}

interface MenuItemsCache {
  restaurant_name: string;
  url: string;
  date: string;
  menu_items: MenuItem[];
  uses_ai_estimates?: boolean;
  estimated_item_count?: number;
}

interface MacroCache {
  menu: string[];
}

const RESTAURANT_CACHE_DIR =
  process.env.SHREDR_RESTAURANT_CACHE_DIR || "public/restaurant_caches";
const ESTIMATED_RESTAURANT_NAMES_KEY = "estimated-menu:names";

let redisClient: Redis | null | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function asNutritionScalar(value: unknown): string | number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return null;
}

function asNutritionSource(value: unknown): NutritionSource | undefined {
  return value === "pdf" || value === "calculated" || value === "ai_estimated"
    ? value
    : undefined;
}

function asFieldNutritionSource(value: unknown): FieldNutritionSource | null {
  return value === "pdf" ||
    value === "calculated_from_macros" ||
    value === "ai_estimated"
    ? value
    : null;
}

function uniqueNames(names: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const name of names) {
    const normalized = normalizeRestaurantName(name);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push(name);
  }

  return unique;
}

function officialCacheVersion() {
  return (
    process.env.SHREDR_NUTRITION_CACHE_VERSION ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    "v1"
  );
}

function officialRestaurantListKey() {
  return `nutrition:official:${officialCacheVersion()}:restaurants`;
}

function officialNutritionKey(restaurantName: string) {
  return `nutrition:official:${officialCacheVersion()}:menu:${normalizeRestaurantName(
    restaurantName
  )}`;
}

function restaurantCacheRoot() {
  return path.resolve(process.cwd(), RESTAURANT_CACHE_DIR);
}

function restaurantCachePath(...parts: string[]) {
  return path.join(restaurantCacheRoot(), ...parts);
}

export function normalizeRestaurantName(restaurantName: string) {
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

export function estimatedMenuRedisKey(restaurantName: string) {
  return `estimated-menu:${normalizeRestaurantName(restaurantName)}`;
}

export function getRedisClient() {
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

async function readJsonFile(filePath: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
  } catch (error) {
    if (error instanceof Error) {
      console.warn(`Failed to read nutrition cache file ${filePath}:`, error);
    }
    return null;
  }
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asFieldSources(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const fieldSources: Record<string, FieldNutritionSource> = {};
  for (const [field, source] of Object.entries(value)) {
    const parsedSource = asFieldNutritionSource(source);
    if (parsedSource) {
      fieldSources[field] = parsedSource;
    }
  }

  return Object.keys(fieldSources).length ? fieldSources : undefined;
}

function asMenuItem(value: unknown): MenuItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const dish = asText(value.dish).trim();
  const calories = asNutritionScalar(value.calories);
  const protein = asNutritionScalar(value.protein);
  const carbs = asNutritionScalar(value.carbs);
  const fat = asNutritionScalar(value.fat);

  if (!dish || calories === null || protein === null || carbs === null || fat === null) {
    return null;
  }

  return {
    dish,
    calories,
    protein,
    carbs,
    fat,
    nutrition_source: asNutritionSource(value.nutrition_source),
    estimated_fields: asStringArray(value.estimated_fields) ?? undefined,
    field_sources: asFieldSources(value.field_sources),
  };
}

function asMenuItemsCache(value: unknown): MenuItemsCache | null {
  if (!isRecord(value)) {
    return null;
  }

  const restaurantName = asText(value.restaurant_name).trim();
  const menuItems = Array.isArray(value.menu_items)
    ? value.menu_items
        .map(asMenuItem)
        .filter((item): item is MenuItem => item !== null)
    : [];

  if (!restaurantName || menuItems.length === 0) {
    return null;
  }

  return {
    restaurant_name: restaurantName,
    url: asText(value.url),
    date: asText(value.date),
    menu_items: menuItems,
    uses_ai_estimates: asBoolean(value.uses_ai_estimates),
    estimated_item_count: asNumber(value.estimated_item_count),
  };
}

function asMacroCache(value: unknown): MacroCache | null {
  if (!isRecord(value)) {
    return null;
  }

  const menu = asStringArray(value.menu);
  return menu ? { menu } : null;
}

function asEstimatedMenuItem(value: unknown): EstimatedMenuItem | null {
  const menuItem = asMenuItem(value);
  if (!menuItem) {
    return null;
  }

  const calories = Number(menuItem.calories);
  const protein = Number(menuItem.protein);
  const carbs = Number(menuItem.carbs);
  const fat = Number(menuItem.fat);

  if (
    !Number.isFinite(calories) ||
    !Number.isFinite(protein) ||
    !Number.isFinite(carbs) ||
    !Number.isFinite(fat)
  ) {
    return null;
  }

  return {
    dish: menuItem.dish,
    calories,
    protein,
    carbs,
    fat,
    nutrition_source: "ai_estimated",
    estimated_fields: menuItem.estimated_fields ?? [
      "calories",
      "protein",
      "carbs",
      "fat",
    ],
    field_sources: {
      calories: "ai_estimated",
      protein: "ai_estimated",
      carbs: "ai_estimated",
      fat: "ai_estimated",
    },
  };
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

  if (!restaurantName || !date || menuItems.length === 0) {
    return null;
  }

  return {
    restaurant_name: restaurantName,
    url: asText(value.url),
    date,
    menu_items: menuItems,
    uses_ai_estimates: true,
    estimated_item_count: menuItems.length,
    cache_status:
      value.cache_status === "hit" || value.cache_status === "miss"
        ? value.cache_status
        : undefined,
  };
}

async function readRedisValue(key: string): Promise<unknown | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    return await redis.get(key);
  } catch (error) {
    console.warn(`Failed to read Redis key ${key}:`, error);
    return null;
  }
}

async function writeRedisValue(key: string, value: unknown) {
  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    await redis.set(key, value);
    return true;
  } catch (error) {
    console.warn(`Failed to write Redis key ${key}:`, error);
    return false;
  }
}

async function readRestaurantNamesFromFile() {
  const parsed = await readJsonFile(
    restaurantCachePath("list_of_cached_restaurants.json")
  );
  return asStringArray(parsed) ?? [];
}

export async function getOfficialRestaurantNames() {
  const redisNames = asStringArray(await readRedisValue(officialRestaurantListKey()));
  if (redisNames?.length) {
    return redisNames;
  }

  const fileNames = await readRestaurantNamesFromFile();
  if (fileNames.length) {
    await writeRedisValue(officialRestaurantListKey(), fileNames);
  }

  return fileNames;
}

export async function getEstimatedRestaurantNames() {
  const redis = getRedisClient();
  if (!redis) {
    return [];
  }

  try {
    const names = await redis.smembers(ESTIMATED_RESTAURANT_NAMES_KEY);
    return asStringArray(names) ?? [];
  } catch (error) {
    console.warn("Failed to read estimated restaurant names from Redis:", error);
    return [];
  }
}

export async function getRestaurantSearchNames() {
  const [officialNames, estimatedNames] = await Promise.all([
    getOfficialRestaurantNames(),
    getEstimatedRestaurantNames(),
  ]);

  return uniqueNames([...officialNames, ...estimatedNames]);
}

export async function readEstimatedMenuFromRedis(restaurantName: string) {
  return asEstimatedMenuResponse(
    await readRedisValue(estimatedMenuRedisKey(restaurantName))
  );
}

export async function writeEstimatedMenuToRedis(
  restaurantName: string,
  response: EstimatedMenuResponse
) {
  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    const aliases = uniqueNames([restaurantName, response.restaurant_name]);
    const cacheValue = {
      ...response,
      cache_status: "hit" as CacheStatus,
    };
    const cacheKeys = aliases.map(estimatedMenuRedisKey);

    await Promise.all([
      ...cacheKeys.map((cacheKey) => redis.set(cacheKey, cacheValue)),
      ...aliases.map((alias) =>
        redis.sadd(ESTIMATED_RESTAURANT_NAMES_KEY, alias)
      ),
    ]);

    return true;
  } catch (error) {
    console.warn("Failed to write estimated menu to Redis:", error);
    return false;
  }
}

function resolveRestaurantName(restaurantName: string, restaurantNames: string[]) {
  const requestedName = normalizeRestaurantName(restaurantName);
  return (
    restaurantNames.find(
      (name) => normalizeRestaurantName(name) === requestedName
    ) ?? null
  );
}

function ratioFor(item: MenuItem, macro: "protein" | "fat" | "carbs") {
  const calories = Number(item.calories);
  const macroValue = Number(item[macro]);

  if (
    !Number.isFinite(calories) ||
    calories <= 0 ||
    !Number.isFinite(macroValue)
  ) {
    return 0;
  }

  return macroValue / calories;
}

function fallbackOrder(menuItems: MenuItem[], macro: "protein" | "fat" | "carbs") {
  return [...menuItems]
    .sort((a, b) => ratioFor(b, macro) - ratioFor(a, macro))
    .map((item) => item.dish);
}

function toEstimatedNutritionResponse(
  response: EstimatedMenuResponse
): RestaurantNutritionResponse {
  const menuItems = response.menu_items;

  return {
    restaurant_name: response.restaurant_name,
    url: response.url,
    date: response.date,
    menu_items: menuItems,
    uses_ai_estimates: true,
    estimated_item_count: response.estimated_item_count,
    sort_orders: {
      protein: fallbackOrder(menuItems, "protein"),
      fat: fallbackOrder(menuItems, "fat"),
      carbs: fallbackOrder(menuItems, "carbs"),
    },
    source: "ai_estimated",
    cache_status: "hit",
    storage: "redis",
  };
}

function toOfficialNutritionResponse(
  menuItemsData: MenuItemsCache,
  proteinCache: MacroCache | null,
  fatCache: MacroCache | null,
  carbsCache: MacroCache | null
): RestaurantNutritionResponse {
  return {
    restaurant_name: menuItemsData.restaurant_name,
    url: menuItemsData.url,
    date: menuItemsData.date,
    menu_items: menuItemsData.menu_items,
    uses_ai_estimates: menuItemsData.uses_ai_estimates,
    estimated_item_count: menuItemsData.estimated_item_count,
    sort_orders: {
      protein:
        proteinCache?.menu ?? fallbackOrder(menuItemsData.menu_items, "protein"),
      fat: fatCache?.menu ?? fallbackOrder(menuItemsData.menu_items, "fat"),
      carbs: carbsCache?.menu ?? fallbackOrder(menuItemsData.menu_items, "carbs"),
    },
    source: "official",
    cache_status: "miss",
    storage: "filesystem",
  };
}

function asRestaurantNutritionResponse(
  value: unknown
): RestaurantNutritionResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const menuItemsData = asMenuItemsCache(value);
  if (!menuItemsData || !isRecord(value.sort_orders)) {
    return null;
  }

  const proteinOrder = asStringArray(value.sort_orders.protein);
  const fatOrder = asStringArray(value.sort_orders.fat);
  const carbsOrder = asStringArray(value.sort_orders.carbs);
  if (!proteinOrder || !fatOrder || !carbsOrder) {
    return null;
  }

  return {
    ...menuItemsData,
    sort_orders: {
      protein: proteinOrder,
      fat: fatOrder,
      carbs: carbsOrder,
    },
    source: value.source === "ai_estimated" ? "ai_estimated" : "official",
    cache_status: "hit",
    storage: "redis",
  };
}

async function readOfficialNutritionFromFiles(restaurantName: string) {
  const [menuItemsData, proteinCache, fatCache, carbsCache] = await Promise.all([
    readJsonFile(restaurantCachePath(`${restaurantName}_output.json`)).then(
      asMenuItemsCache
    ),
    readJsonFile(
      restaurantCachePath(
        "highest_lowest_protein",
        `${restaurantName}_protein_cache.json`
      )
    ).then(asMacroCache),
    readJsonFile(
      restaurantCachePath("highest_lowest_fat", `${restaurantName}_fat_cache.json`)
    ).then(asMacroCache),
    readJsonFile(
      restaurantCachePath(
        "highest_lowest_carbs",
        `${restaurantName}_carbs_cache.json`
      )
    ).then(asMacroCache),
  ]);

  if (!menuItemsData) {
    return null;
  }

  return toOfficialNutritionResponse(
    menuItemsData,
    proteinCache,
    fatCache,
    carbsCache
  );
}

async function readOfficialNutritionFromRedis(restaurantName: string) {
  return asRestaurantNutritionResponse(
    await readRedisValue(officialNutritionKey(restaurantName))
  );
}

async function writeOfficialNutritionToRedis(
  restaurantName: string,
  response: RestaurantNutritionResponse
) {
  return writeRedisValue(officialNutritionKey(restaurantName), {
    ...response,
    cache_status: "hit",
    storage: "redis",
  });
}

export async function getRestaurantNutrition(restaurantName: string) {
  const officialRestaurantNames = await getOfficialRestaurantNames();
  const officialRestaurantName = resolveRestaurantName(
    restaurantName,
    officialRestaurantNames
  );

  if (officialRestaurantName) {
    const redisNutrition =
      await readOfficialNutritionFromRedis(officialRestaurantName);
    if (redisNutrition) {
      return redisNutrition;
    }

    const fileNutrition =
      await readOfficialNutritionFromFiles(officialRestaurantName);
    if (fileNutrition) {
      await writeOfficialNutritionToRedis(officialRestaurantName, fileNutrition);
      return fileNutrition;
    }
  }

  const estimatedMenu = await readEstimatedMenuFromRedis(restaurantName);
  return estimatedMenu ? toEstimatedNutritionResponse(estimatedMenu) : null;
}

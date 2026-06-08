import { NextResponse } from "next/server";

type NutritionSource = "pdf" | "calculated" | "ai_estimated";

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

const MAX_RESTAURANT_NAME_LENGTH = 120;
const MIN_MENU_ITEMS = 6;
const MAX_MENU_ITEMS = 30;
const NUTRITION_FIELDS = ["calories", "protein", "carbs", "fat"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
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

  return NextResponse.json({
    restaurant_name: asText(parsedResponse?.restaurant_name).trim() || restaurantName,
    url: "",
    date: new Date().toISOString(),
    menu_items: generatedMenuItems,
    uses_ai_estimates: true,
    estimated_item_count: generatedMenuItems.length,
  });
}

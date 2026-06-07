import { NextResponse } from "next/server";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface MenuItem {
  dish: string;
  calories: string | number;
  protein: string | number;
  carbs: string | number;
  fat: string | number;
  nutrition_source?: string;
  estimated_fields?: string[];
}

const MAX_MENU_ITEMS = 350;
const MAX_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 1200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asMenuItem(value: unknown): MenuItem | null {
  if (!isRecord(value) || typeof value.dish !== "string") {
    return null;
  }

  return {
    dish: value.dish,
    calories:
      typeof value.calories === "number" || typeof value.calories === "string"
        ? value.calories
        : "",
    protein:
      typeof value.protein === "number" || typeof value.protein === "string"
        ? value.protein
        : "",
    carbs:
      typeof value.carbs === "number" || typeof value.carbs === "string"
        ? value.carbs
        : "",
    fat:
      typeof value.fat === "number" || typeof value.fat === "string"
        ? value.fat
        : "",
    nutrition_source:
      typeof value.nutrition_source === "string"
        ? value.nutrition_source
        : undefined,
    estimated_fields: Array.isArray(value.estimated_fields)
      ? value.estimated_fields.filter(
          (field): field is string => typeof field === "string"
        )
      : undefined,
  };
}

function asChatMessage(value: unknown): ChatMessage | null {
  if (!isRecord(value)) {
    return null;
  }

  const role = value.role;
  const content = asText(value.content).trim();
  if ((role !== "user" && role !== "assistant") || !content) {
    return null;
  }

  return {
    role,
    content: content.slice(0, MAX_MESSAGE_LENGTH),
  };
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

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Menu chat is not configured. Set OPENAI_API_KEY first." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as unknown;
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const restaurantName = asText(body.restaurantName).trim();
  const menuItems = Array.isArray(body.menuItems)
    ? body.menuItems.map(asMenuItem).filter((item): item is MenuItem => item !== null)
    : [];
  const messages = Array.isArray(body.messages)
    ? body.messages
        .map(asChatMessage)
        .filter((message): message is ChatMessage => message !== null)
        .slice(-MAX_MESSAGES)
    : [];
  const usesAiEstimates = body.usesAiEstimates === true;

  if (!restaurantName || menuItems.length === 0 || messages.length === 0) {
    return NextResponse.json(
      { error: "Restaurant, menu items, and a message are required." },
      { status: 400 }
    );
  }

  const compactMenu = menuItems.slice(0, MAX_MENU_ITEMS).map((item) => ({
    dish: item.dish,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    source: item.nutrition_source ?? "pdf",
    estimated_fields: item.estimated_fields ?? [],
  }));
  const menuWasTrimmed = menuItems.length > compactMenu.length;

  const systemPrompt = [
    "You answer questions about one restaurant menu using only the provided menu data.",
    "Be concise and practical. If the answer requires data not included here, say so.",
    "Use calories as kcal and macros as grams.",
    "When comparing items, cite the dish names and relevant nutrition numbers.",
    usesAiEstimates
      ? "Some values are AI estimates from the PDF scraper; mention approximations when relevant."
      : "The provided nutrition values come from extracted restaurant cache data.",
    menuWasTrimmed
      ? `Only the first ${MAX_MENU_ITEMS} of ${menuItems.length} items are included.`
      : `All ${menuItems.length} menu items are included.`,
    `Restaurant: ${restaurantName}`,
    `Menu JSON: ${JSON.stringify(compactMenu)}`,
  ].join("\n");

  const model = process.env.SHREDR_OPENAI_MODEL ?? "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: systemPrompt },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      temperature: 0.2,
      max_output_tokens: 700,
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Menu chat request failed." },
      { status: response.status }
    );
  }

  const answer = extractResponseText(await response.json());
  if (!answer) {
    return NextResponse.json(
      { error: "Menu chat returned an empty answer." },
      { status: 502 }
    );
  }

  return NextResponse.json({ answer });
}

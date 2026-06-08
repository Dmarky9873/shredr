import { NextResponse } from "next/server";
import { getRestaurantNutrition } from "../../../server/nutrition-store";

const MAX_RESTAURANT_NAME_LENGTH = 120;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const restaurantName =
    url.searchParams.get("restaurantName")?.trim().slice(0, MAX_RESTAURANT_NAME_LENGTH) ||
    "";

  if (!restaurantName) {
    return NextResponse.json(
      { error: "Restaurant name is required." },
      { status: 400 }
    );
  }

  const nutrition = await getRestaurantNutrition(restaurantName);
  if (!nutrition) {
    return NextResponse.json(
      { error: "Restaurant nutrition data was not found." },
      { status: 404 }
    );
  }

  return NextResponse.json(nutrition);
}

import { NextResponse } from "next/server";
import { getRestaurantSearchNames } from "../../server/nutrition-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const restaurantNames = await getRestaurantSearchNames();
  return NextResponse.json(restaurantNames);
}

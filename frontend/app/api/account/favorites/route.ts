import { NextResponse } from "next/server";
import {
  addFavoriteRestaurant,
  getFavoritesForUser,
  removeFavoriteRestaurant,
  requireCurrentAccount,
} from "../../../server/account-store";
import {
  accountErrorResponse,
  getStringField,
  readJsonBody,
} from "../account-route-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireCurrentAccount();
    const favorites = await getFavoritesForUser(user.id);

    return NextResponse.json({ favorites });
  } catch (error) {
    return accountErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentAccount();
    const body = await readJsonBody(request);
    const favorites = await addFavoriteRestaurant(
      user.id,
      getStringField(body, "restaurantName")
    );

    return NextResponse.json({ favorites });
  } catch (error) {
    return accountErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireCurrentAccount();
    const body = await readJsonBody(request);
    const url = new URL(request.url);
    const restaurantName =
      getStringField(body, "restaurantName") ||
      url.searchParams.get("restaurantName") ||
      "";
    const favorites = await removeFavoriteRestaurant(user.id, restaurantName);

    return NextResponse.json({ favorites });
  } catch (error) {
    return accountErrorResponse(error);
  }
}

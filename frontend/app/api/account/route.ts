import { NextResponse } from "next/server";
import {
  getCurrentAccount,
  getFavoritesForUser,
} from "../../server/account-store";
import { accountErrorResponse } from "./account-route-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentAccount();
    if (!user) {
      return NextResponse.json({ user: null, favorites: [] });
    }

    const favorites = await getFavoritesForUser(user.id);
    return NextResponse.json({ user, favorites });
  } catch (error) {
    return accountErrorResponse(error);
  }
}

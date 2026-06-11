import { NextResponse } from "next/server";
import { clearSessionCookie } from "../account-route-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);

  return response;
}

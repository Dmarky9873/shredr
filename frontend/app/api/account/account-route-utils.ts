import { NextResponse } from "next/server";
import {
  AccountStoreError,
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "../../server/account-store";

export function accountErrorResponse(error: unknown) {
  if (error instanceof AccountStoreError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status }
    );
  }

  console.error("Account API error:", error);
  return NextResponse.json(
    { error: "Something went wrong." },
    { status: 500 }
  );
}

export async function readJsonBody(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

export function getStringField(
  body: unknown,
  fieldName: string,
  fallback = ""
) {
  if (typeof body !== "object" || body === null || !(fieldName in body)) {
    return fallback;
  }

  const value = (body as Record<string, unknown>)[fieldName];
  return typeof value === "string" ? value : fallback;
}

export function setSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

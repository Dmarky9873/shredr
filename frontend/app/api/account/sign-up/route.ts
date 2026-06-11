import { NextResponse } from "next/server";
import { createAccount } from "../../../server/account-store";
import {
  accountErrorResponse,
  getStringField,
  readJsonBody,
  setSessionCookie,
} from "../account-route-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const user = await createAccount(
      getStringField(body, "email"),
      getStringField(body, "password")
    );
    const response = NextResponse.json(
      { user, favorites: [] },
      { status: 201 }
    );

    setSessionCookie(response, user.id);

    return response;
  } catch (error) {
    return accountErrorResponse(error);
  }
}

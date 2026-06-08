import { NextResponse } from "next/server";

export default function middleware() {
  return NextResponse.json(
    { error: "Restaurant nutrition data is available through /api/restaurants." },
    { status: 404 }
  );
}

export const config = {
  matcher: "/restaurant_caches/:path*",
};

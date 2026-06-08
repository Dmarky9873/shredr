import { NextResponse } from "next/server";

export const runtime = "nodejs";

const STRIPE_API_VERSION = "2026-02-25.clover";
const MIN_DONATION_CENTS = 100;
const MAX_DONATION_CENTS = 50000;

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseAmountToCents(value: string): number | null {
  const normalizedValue = value.replace(/^\$/, "");

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    return null;
  }

  const [dollarPart, centPart = ""] = normalizedValue.split(".");
  const dollars = Number(dollarPart);
  const cents = Number((centPart + "00").slice(0, 2));
  const amount = dollars * 100 + cents;

  if (
    !Number.isSafeInteger(amount) ||
    amount < MIN_DONATION_CENTS ||
    amount > MAX_DONATION_CENTS
  ) {
    return null;
  }

  return amount;
}

function getCurrency(): string {
  const currency = (process.env.SHREDR_DONATION_CURRENCY ?? "cad")
    .trim()
    .toLowerCase();

  return /^[a-z]{3}$/.test(currency) ? currency : "cad";
}

function getSiteUrl(request: Request): string {
  const requestOrigin = request.headers.get("origin");

  if (requestOrigin) {
    return requestOrigin;
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(/\/$/, "");
  }

  return new URL(request.url).origin;
}

function redirectToDonate(request: Request, reason: string): NextResponse {
  const redirectUrl = new URL("/donate", getSiteUrl(request));
  redirectUrl.searchParams.set("error", reason);

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!stripeSecretKey) {
    return redirectToDonate(request, "configuration");
  }

  const formData = await request.formData();
  const frequency =
    asString(formData.get("frequency")) === "monthly" ? "monthly" : "one-time";
  const amountSelection = asString(formData.get("amount"));
  const customAmount = asString(formData.get("customAmount"));
  const amountCents = parseAmountToCents(
    amountSelection === "custom" ? customAmount : amountSelection
  );

  if (amountCents === null) {
    return redirectToDonate(request, "amount");
  }

  const siteUrl = getSiteUrl(request);
  const checkoutParams = new URLSearchParams({
    mode: frequency === "monthly" ? "subscription" : "payment",
    success_url: `${siteUrl}/donate?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/donate?canceled=1`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": getCurrency(),
    "line_items[0][price_data][unit_amount]": String(amountCents),
    "line_items[0][price_data][product_data][name]": "Shredr donation",
    "line_items[0][price_data][product_data][description]":
      frequency === "monthly"
        ? "Monthly support for Shredr."
        : "One-time support for Shredr.",
    "metadata[donation_frequency]": frequency,
    "metadata[source]": "shredr_donate_page",
  });

  if (frequency === "monthly") {
    checkoutParams.set(
      "line_items[0][price_data][recurring][interval]",
      "month"
    );
  } else {
    checkoutParams.set("submit_type", "donate");
  }

  const stripeResponse = await fetch(
    "https://api.stripe.com/v1/checkout/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": STRIPE_API_VERSION,
      },
      body: checkoutParams.toString(),
    }
  );

  const checkoutSession = (await stripeResponse.json().catch(() => null)) as
    | { url?: unknown; error?: { message?: string } }
    | null;

  if (!stripeResponse.ok) {
    console.error("Stripe Checkout Session creation failed", {
      status: stripeResponse.status,
      error: checkoutSession?.error?.message,
    });

    return redirectToDonate(request, "stripe");
  }

  if (typeof checkoutSession?.url !== "string") {
    return redirectToDonate(request, "stripe");
  }

  return NextResponse.redirect(checkoutSession.url, { status: 303 });
}

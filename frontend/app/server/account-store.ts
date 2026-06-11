import "server-only";

import { cookies } from "next/headers";
import {
  createHmac,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";
import { getRedisClient, normalizeRestaurantName } from "./nutrition-store";

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE_NAME = "shredr_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const RESTAURANT_NAME_MAX_LENGTH = 120;
const SESSION_VERSION = 1;
const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AccountUser {
  id: string;
  email: string;
  createdAt: string;
}

interface StoredAccountUser extends AccountUser {
  passwordHash: string;
}

export interface FavoriteRestaurant {
  restaurantName: string;
  normalizedName: string;
  createdAt: string;
}

interface SessionPayload {
  version: number;
  userId: string;
  expiresAt: number;
}

export class AccountStoreError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AccountStoreError";
    this.status = status;
  }
}

function accountEmailKey(email: string) {
  return `account:email:${email}`;
}

function accountUserKey(userId: string) {
  return `account:user:${userId}`;
}

function accountFavoritesKey(userId: string) {
  return `account:favorites:${userId}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function publicUser(user: StoredAccountUser): AccountUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireRedis() {
  const redis = getRedisClient();
  if (!redis) {
    throw new AccountStoreError(
      "Accounts require Redis configuration.",
      503
    );
  }

  return redis;
}

function validateEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const valid =
    normalizedEmail.length > 3 &&
    normalizedEmail.length <= EMAIL_MAX_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  if (!valid) {
    throw new AccountStoreError("Enter a valid email address.");
  }

  return normalizedEmail;
}

function validatePassword(password: string) {
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new AccountStoreError(
      `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters.`
    );
  }
}

function validateRestaurantName(restaurantName: string) {
  const cleanedName = restaurantName.trim().slice(0, RESTAURANT_NAME_MAX_LENGTH);
  const normalizedName = normalizeRestaurantName(cleanedName);

  if (!cleanedName || !normalizedName) {
    throw new AccountStoreError("Restaurant name is required.");
  }

  return { cleanedName, normalizedName };
}

function asStoredUser(value: unknown): StoredAccountUser | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id : "";
  const email = typeof value.email === "string" ? value.email : "";
  const createdAt = typeof value.createdAt === "string" ? value.createdAt : "";
  const passwordHash =
    typeof value.passwordHash === "string" ? value.passwordHash : "";

  if (!USER_ID_PATTERN.test(id) || !email || !createdAt || !passwordHash) {
    return null;
  }

  return { id, email, createdAt, passwordHash };
}

function asFavorite(value: unknown): FavoriteRestaurant | null {
  if (!isRecord(value)) {
    return null;
  }

  const restaurantName =
    typeof value.restaurantName === "string" ? value.restaurantName.trim() : "";
  const normalizedName =
    typeof value.normalizedName === "string" ? value.normalizedName : "";
  const createdAt = typeof value.createdAt === "string" ? value.createdAt : "";

  if (!restaurantName || !normalizedName || !createdAt) {
    return null;
  }

  return { restaurantName, normalizedName, createdAt };
}

function asFavoriteList(value: unknown): FavoriteRestaurant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const favorites = value
    .map(asFavorite)
    .filter((favorite): favorite is FavoriteRestaurant => favorite !== null);

  return favorites.sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:v1:${salt}:${derivedKey.toString("base64url")}`;
}

async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, version, salt, hash] = passwordHash.split(":");

  if (algorithm !== "scrypt" || version !== "v1" || !salt || !hash) {
    return false;
  }

  const storedHash = Buffer.from(hash, "base64url");
  const derivedKey = (await scrypt(password, salt, storedHash.length)) as Buffer;

  if (storedHash.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedHash, derivedKey);
}

function getSessionSecret() {
  const secret = process.env.SHREDR_SESSION_SECRET || process.env.AUTH_SECRET;
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return "development-only-shredr-session-secret";
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signSessionPayload(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createSessionToken(userId: string) {
  const secret = getSessionSecret();
  if (!secret) {
    throw new AccountStoreError(
      "SHREDR_SESSION_SECRET must be configured in production.",
      503
    );
  }

  const payload: SessionPayload = {
    version: SESSION_VERSION,
    userId,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signSessionPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token: string) {
  const secret = getSessionSecret();
  if (!secret) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signSessionPayload(encodedPayload, secret);
  const signatureBuffer = Buffer.from(signature, "base64url");
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "base64url");

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as unknown;
    if (!isRecord(payload)) {
      return null;
    }

    const userId = typeof payload.userId === "string" ? payload.userId : "";
    const version =
      typeof payload.version === "number" ? payload.version : undefined;
    const expiresAt =
      typeof payload.expiresAt === "number" ? payload.expiresAt : 0;

    if (
      version !== SESSION_VERSION ||
      !USER_ID_PATTERN.test(userId) ||
      expiresAt <= Date.now()
    ) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}

async function readStoredUser(userId: string) {
  const redis = requireRedis();
  return asStoredUser(await redis.get(accountUserKey(userId)));
}

export async function createAccount(email: string, password: string) {
  const normalizedEmail = validateEmail(email);
  validatePassword(password);

  const redis = requireRedis();
  const existingUserId = await redis.get(accountEmailKey(normalizedEmail));
  if (existingUserId) {
    throw new AccountStoreError("An account already exists for this email.", 409);
  }

  const user: StoredAccountUser = {
    id: randomUUID(),
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  await redis.set(accountUserKey(user.id), user);
  await redis.set(accountEmailKey(normalizedEmail), user.id);

  return publicUser(user);
}

export async function verifyAccountCredentials(email: string, password: string) {
  const normalizedEmail = validateEmail(email);
  const redis = requireRedis();
  const userId = await redis.get<string>(accountEmailKey(normalizedEmail));

  if (!userId) {
    throw new AccountStoreError("Email or password is incorrect.", 401);
  }

  const storedUser = await readStoredUser(userId);
  const passwordIsValid =
    storedUser && (await verifyPassword(password, storedUser.passwordHash));

  if (!storedUser || !passwordIsValid) {
    throw new AccountStoreError("Email or password is incorrect.", 401);
  }

  return publicUser(storedUser);
}

export async function getSessionUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return token ? verifySessionToken(token) : null;
}

export async function getCurrentAccount() {
  const userId = await getSessionUserId();
  if (!userId) {
    return null;
  }

  const storedUser = await readStoredUser(userId);
  return storedUser ? publicUser(storedUser) : null;
}

export async function requireCurrentAccount() {
  const account = await getCurrentAccount();
  if (!account) {
    throw new AccountStoreError("Sign in to continue.", 401);
  }

  return account;
}

export async function getFavoritesForUser(userId: string) {
  const redis = requireRedis();
  return asFavoriteList(await redis.get(accountFavoritesKey(userId)));
}

async function writeFavoritesForUser(
  userId: string,
  favorites: FavoriteRestaurant[]
) {
  const redis = requireRedis();
  await redis.set(accountFavoritesKey(userId), favorites);
}

export async function addFavoriteRestaurant(
  userId: string,
  restaurantName: string
) {
  const { cleanedName, normalizedName } = validateRestaurantName(restaurantName);
  const favorites = await getFavoritesForUser(userId);
  const now = new Date().toISOString();
  const nextFavorites = [
    {
      restaurantName: cleanedName,
      normalizedName,
      createdAt: now,
    },
    ...favorites.filter((favorite) => favorite.normalizedName !== normalizedName),
  ];

  await writeFavoritesForUser(userId, nextFavorites);

  return nextFavorites;
}

export async function removeFavoriteRestaurant(
  userId: string,
  restaurantName: string
) {
  const { normalizedName } = validateRestaurantName(restaurantName);
  const favorites = await getFavoritesForUser(userId);
  const nextFavorites = favorites.filter(
    (favorite) => favorite.normalizedName !== normalizedName
  );

  await writeFavoritesForUser(userId, nextFavorites);

  return nextFavorites;
}

// Authentication, Cryptography & RBAC Utility for Urban Mart
import crypto from "crypto";
import { User, UserRole, UserSession } from "../types";

const SALT_LENGTH = 16;
const ITERATIONS = 10000;
const KEY_LENGTH = 64;
const DIGEST = "sha256";
const TOKEN_SECRET = process.env.AUTH_SECRET || "urbanmart-pos-supermarket-secret-key-2026";

/**
 * Hash a plaintext password using PBKDF2 with a cryptographically random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plaintext password against a stored salt:hash string
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(":");
    if (!salt || !originalHash) return false;
    const computedHash = crypto
      .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
      .toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, "hex"),
      Buffer.from(originalHash, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Create a signed session token for a user
 */
export function createSessionToken(user: User, durationHours = 12): UserSession {
  const expiresAt = Date.now() + durationHours * 60 * 60 * 1000;
  const payload = JSON.stringify({
    userId: user.id,
    role: user.role,
    expiresAt,
  });

  const hmac = crypto.createHmac("sha256", TOKEN_SECRET);
  hmac.update(payload);
  const signature = hmac.digest("hex");
  const token = Buffer.from(payload).toString("base64url") + "." + signature;

  return {
    token,
    user: sanitizeUser(user),
    expires_at: expiresAt,
  };
}

/**
 * Verify and decode a session token
 */
export function verifySessionToken(
  token: string
): { userId: string; role: UserRole; expiresAt: number } | null {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;

    const payload = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const hmac = crypto.createHmac("sha256", TOKEN_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      )
    ) {
      return null;
    }

    const data = JSON.parse(payload);
    if (Date.now() > data.expiresAt) {
      return null; // Expired
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Strips password hash from User object for safe client consumption
 */
export function sanitizeUser(user: User): Omit<User, "password_hash"> {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

/**
 * Check if a user role matches allowed roles
 */
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

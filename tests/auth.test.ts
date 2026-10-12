import { describe, it, expect } from "vitest";
import {
  createSessionToken,
  hashPassword,
  hasRole,
  verifyPassword,
  verifySessionToken,
} from "../src/lib/auth";
import { User } from "../src/types";

describe("PBKDF2 Authentication & RBAC Tests", () => {
  it("successfully hashes passwords and verifies valid plaintext", () => {
    const plaintext = "Admin@123";
    const hashed = hashPassword(plaintext);

    expect(hashed).toContain(":");
    expect(verifyPassword(plaintext, hashed)).toBe(true);
    expect(verifyPassword("WrongPassword", hashed)).toBe(false);
  });

  it("generates unique salts for identical passwords", () => {
    const p1 = hashPassword("Cashier@123");
    const p2 = hashPassword("Cashier@123");
    expect(p1).not.toBe(p2);
  });

  it("creates and verifies signed HMAC session tokens", () => {
    const mockUser: User = {
      id: "usr-01",
      name: "Ramesh Pawar",
      email: "cashier@urbanmart.com",
      password_hash: "mock",
      role: "CASHIER",
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const session = createSessionToken(mockUser, 1);
    expect(session.token).toBeDefined();

    const decoded = verifySessionToken(session.token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe("usr-01");
    expect(decoded?.role).toBe("CASHIER");
  });

  it("rejects tampered session tokens", () => {
    const mockUser: User = {
      id: "usr-01",
      name: "Ramesh",
      email: "r@urbanmart.com",
      password_hash: "mock",
      role: "CASHIER",
      is_active: true,
      created_at: new Date().toISOString(),
    };
    const session = createSessionToken(mockUser, 1);
    const tampered = session.token.slice(0, -4) + "abcd";
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("properly validates RBAC role permissions", () => {
    expect(hasRole("ADMIN", ["ADMIN", "CASHIER"])).toBe(true);
    expect(hasRole("GRN_OPERATOR", ["ADMIN"])).toBe(false);
    expect(hasRole("CASHIER", ["CASHIER"])).toBe(true);
  });
});

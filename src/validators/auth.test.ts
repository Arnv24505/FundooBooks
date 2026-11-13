import { describe, expect, it } from "vitest";
import {
  loginSchema,
  passwordSchema,
  registerSchema,
  updateProfileSchema,
} from "@/validators/auth";

describe("passwordSchema", () => {
  it("requires letters, numbers and at least 8 characters", () => {
    expect(passwordSchema.safeParse("reader2026").success).toBe(true);
    expect(passwordSchema.safeParse("reader").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
    expect(passwordSchema.safeParse("read2026").success).toBe(true);
    expect(passwordSchema.safeParse("20262026").success).toBe(false);
  });

  it("rejects passwords longer than bcrypt's 72-byte limit", () => {
    expect(passwordSchema.safeParse(`a1${"x".repeat(71)}`).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("normalises the email and accepts an optional mobile", () => {
    const result = registerSchema.parse({
      name: "  Ada Lovelace  ",
      email: "  ADA@Example.COM ",
      password: "analytical1",
      mobile: "",
    });
    expect(result.email).toBe("ada@example.com");
    expect(result.name).toBe("Ada Lovelace");
    expect(result.mobile).toBe("");
  });

  it("rejects an invalid email address", () => {
    const result = registerSchema.safeParse({
      name: "Ada Lovelace",
      email: "not-an-email",
      password: "analytical1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed mobile numbers", () => {
    const result = registerSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "analytical1",
      mobile: "123",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts an email and any non-empty password", () => {
    expect(loginSchema.safeParse({ email: "ada@example.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "ada@example.com", password: "" }).success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("allows changing the name or mobile alone", () => {
    expect(updateProfileSchema.safeParse({ name: "Ada Lovelace" }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ mobile: "" }).success).toBe(true);
  });

  it("requires the current password when setting a new one", () => {
    const result = updateProfileSchema.safeParse({ newPassword: "analytical1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["currentPassword"]);
    }
  });

  it("accepts a password change with the current password", () => {
    expect(
      updateProfileSchema.safeParse({
        currentPassword: "old-password",
        newPassword: "analytical1",
      }).success
    ).toBe(true);
  });
});

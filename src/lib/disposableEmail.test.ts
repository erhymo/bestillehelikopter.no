import { describe, it, expect } from "vitest";
import {
  validateEmail,
  extractDomain,
  isDisposableDomain,
} from "./disposableEmail";

// ── extractDomain ───────────────────────────────────────────────────────────

describe("extractDomain", () => {
  it("extracts domain from normal email", () => {
    expect(extractDomain("user@example.com")).toBe("example.com");
  });

  it("lowercases domain", () => {
    expect(extractDomain("User@EXAMPLE.COM")).toBe("example.com");
  });

  it("handles subdomains", () => {
    expect(extractDomain("a@sub.domain.co.uk")).toBe("sub.domain.co.uk");
  });

  it("returns null for no @", () => {
    expect(extractDomain("nope")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractDomain("")).toBeNull();
  });

  it("returns null for @ at start with no local part", () => {
    expect(extractDomain("@domain.com")).toBeNull();
  });

  it("returns null for @ with no domain", () => {
    expect(extractDomain("user@")).toBeNull();
  });
});

// ── isDisposableDomain ──────────────────────────────────────────────────────

describe("isDisposableDomain", () => {
  it("detects mailinator.com", () => {
    expect(isDisposableDomain("mailinator.com")).toBe(true);
  });

  it("detects guerrillamail.com", () => {
    expect(isDisposableDomain("guerrillamail.com")).toBe(true);
  });

  it("detects yopmail.com", () => {
    expect(isDisposableDomain("yopmail.com")).toBe(true);
  });

  it("detects temp-mail.org", () => {
    expect(isDisposableDomain("temp-mail.org")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isDisposableDomain("MAILINATOR.COM")).toBe(true);
  });

  it("allows gmail.com", () => {
    expect(isDisposableDomain("gmail.com")).toBe(false);
  });

  it("allows outlook.com", () => {
    expect(isDisposableDomain("outlook.com")).toBe(false);
  });

  it("allows company domain", () => {
    expect(isDisposableDomain("statnett.no")).toBe(false);
  });
});

// ── validateEmail ───────────────────────────────────────────────────────────

describe("validateEmail", () => {
  it("accepts valid email", () => {
    const result = validateEmail("ola@firma.no");
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.message).toBeUndefined();
  });

  it("accepts email with + alias", () => {
    expect(validateEmail("ola+test@firma.no").valid).toBe(true);
  });

  it("rejects empty string", () => {
    const result = validateEmail("");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("invalid_format");
  });

  it("rejects missing @", () => {
    const result = validateEmail("olafirma.no");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("invalid_format");
  });

  it("rejects missing TLD", () => {
    const result = validateEmail("ola@firma");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("invalid_format");
  });

  it("rejects spaces in email", () => {
    const result = validateEmail("ola @firma.no");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("invalid_format");
  });

  it("rejects disposable email (mailinator)", () => {
    const result = validateEmail("test@mailinator.com");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("disposable_domain");
    expect(result.message).toContain("Midlertidige");
  });

  it("rejects disposable email (yopmail)", () => {
    const result = validateEmail("foo@yopmail.com");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("disposable_domain");
  });

  it("rejects disposable email case-insensitive", () => {
    const result = validateEmail("Foo@GUERRILLAMAIL.COM");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("disposable_domain");
  });

  it("trims whitespace before validating", () => {
    const result = validateEmail("  ola@firma.no  ");
    expect(result.valid).toBe(true);
  });

  it("accepts Norwegian characters in local part", () => {
    expect(validateEmail("ølansen@firma.no").valid).toBe(true);
  });

  it("returns Norwegian message for disposable", () => {
    const result = validateEmail("x@trashmail.com");
    expect(result.message).toMatch(/Midlertidige e-postadresser/);
  });

  it("returns Norwegian message for invalid format", () => {
    const result = validateEmail("not-an-email");
    expect(result.message).toMatch(/Ugyldig e-postadresse/);
  });
});


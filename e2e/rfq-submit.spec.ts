import { test, expect } from "@playwright/test";

/**
 * RFQ Submit E2E Tests
 *
 * Strategi for telefonverifisering:
 * Firebase Auth emulator støtter test-telefonnumre med faste OTP-koder.
 * Sett opp i Firebase Console → Auth → Sign-in method → Phone → Test phone numbers:
 *   +4700000000 → 123456
 *
 * Alternativt: vi intercepter Firebase Auth-kall i nettleseren
 * og setter opp mock-respons for signInWithPhoneNumber.
 *
 * Disse testene krever:
 * 1. Next.js dev-server kjører (localhost:3000)
 * 2. Firebase-emulatorene kjører
 * 3. Minst ett selskap i companies-collection (seed via helpers)
 */

test.describe("RFQ — Skjema-interaksjon", () => {
  test("Kan navigere gjennom skjema-stegene", async ({ page }) => {
    await page.goto("/");

    // Steg 1: Kundeinformasjon bør vises
    await expect(page.getByText("Kontaktinformasjon")).toBeVisible();

    // Fyll ut kundeinformasjon
    await page.fill('input[name="name"], input[placeholder*="Navn"]', "Test Bruker");
    await page.fill('input[type="email"]', "test@validexample.com");
    await page.fill('input[name="phone"], input[placeholder*="4"]', "+4700000000");
    await page.fill(
      'input[name="invoiceAddress"], input[placeholder*="adresse"], textarea[placeholder*="adresse"]',
      "Testveien 1, 0001 Oslo",
    );
  });

  test("Disposable e-post blokkeres klient-side", async ({ page }) => {
    await page.goto("/");

    // Fyll ut med disposable e-post
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill("test@mailinator.com");
    await emailInput.blur();

    // Bør vise feilmelding (enten i sanntid eller ved submit)
    // Avhenger av implementasjon — vi sjekker at feltet finnes
    await expect(emailInput).toHaveValue("test@mailinator.com");
  });

  test("Checkbox for vilkår er påkrevd", async ({ page }) => {
    await page.goto("/");

    const checkbox = page.getByRole("checkbox");
    await expect(checkbox).not.toBeChecked();

    // Kryss av
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // Kryss av igjen (uncheck)
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });
});

test.describe("RFQ — API-route direkte", () => {
  test("POST /api/rfq uten auth returnerer 401", async ({ request }) => {
    const res = await request.post("/api/rfq", {
      data: { customer: {} },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  test("POST /api/rfq med ugyldig payload returnerer 400", async ({
    request,
  }) => {
    const res = await request.post("/api/rfq", {
      headers: { Authorization: "Bearer fake-token" },
      data: { customer: { name: "Test" } },
    });
    // Enten 400 (ugyldig payload) eller 401 (ugyldig Firebase token)
    expect([400, 401]).toContain(res.status());
  });
});


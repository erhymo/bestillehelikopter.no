import { test, expect } from "@playwright/test";
import {
  mintTestToken,
  seedFirestoreDoc,
  clearEmulatorData,
  TEST_JOB_ID,
  TEST_COMPANY_ID,
  TEST_OFFER_ID,
  TEST_JOB,
  TEST_COMPANY,
} from "./helpers";

/**
 * Company Map View E2E Tests
 *
 * Tester at selskapet kan åpne kartvisningen med gyldig token.
 *
 * Krever: Firebase-emulatorene kjører (Firestore på localhost:8080)
 */

test.describe("Selskap — Kartvisning (/c/[token]/map)", () => {
  let token: string;

  test.beforeAll(async () => {
    // Seed test data
    await seedFirestoreDoc("companies", TEST_COMPANY_ID, TEST_COMPANY);
    await seedFirestoreDoc("jobs", TEST_JOB_ID, TEST_JOB);
    await seedFirestoreDoc(
      `jobs/${TEST_JOB_ID}/offers`,
      TEST_OFFER_ID,
      {
        _v: 1,
        companyId: TEST_COMPANY_ID,
        status: "sent",
        price: null,
        createdAt: new Date().toISOString(),
      },
    );

    token = mintTestToken();
  });

  test.afterAll(async () => {
    await clearEmulatorData();
  });

  test("Gyldig token viser kartsiden", async ({ page }) => {
    await page.goto(`/c/${encodeURIComponent(token)}/map`);

    // Bør vise oppdragsinformasjon (ikke feilmelding)
    // Sjekk at vi IKKE ser "Ugyldig" feilmelding
    await expect(page.getByText(/Ugyldig eller utløpt/i)).not.toBeVisible();

    // Bør vise "Gi tilbud"-lenke
    await expect(
      page.getByRole("link", { name: /Gi tilbud/i }),
    ).toBeVisible();
  });

  test("Ugyldig token viser feilmelding", async ({ page }) => {
    await page.goto("/c/invalid-token/map");

    await expect(page.getByText(/Ugyldig eller utløpt/i)).toBeVisible();
  });

  test("Gi tilbud-lenke navigerer til tilbudsskjema", async ({ page }) => {
    await page.goto(`/c/${encodeURIComponent(token)}/map`);

    const offerLink = page.getByRole("link", { name: /Gi tilbud/i });
    await expect(offerLink).toBeVisible();

    // Sjekk at lenken peker til riktig URL
    const href = await offerLink.getAttribute("href");
    expect(href).toContain("/c/");
    expect(href).toContain("/offer");
  });
});


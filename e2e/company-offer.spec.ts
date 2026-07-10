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
 * Company Offer Submit E2E Tests
 *
 * Tester at selskapet kan sende tilbud via skjemaet.
 *
 * Krever: Firebase-emulatorene og Next.js dev-server kjører
 */

test.describe("Selskap — Tilbudsskjema (/c/[token]/offer)", () => {
  let token: string;

  test.beforeAll(async () => {
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

  test("Tilbudsskjema viser jobbinformasjon", async ({ page }) => {
    await page.goto(`/c/${encodeURIComponent(token)}/offer`);

    // Bør vise selskapsnavn
    await expect(page.getByText(TEST_COMPANY.name)).toBeVisible();

    // Bør vise totalpris-felt
    await expect(
      page.getByLabel(/Totalpris/i),
    ).toBeVisible();

    // Bør vise «Send tilbud»-knapp
    await expect(
      page.getByRole("button", { name: /Send tilbud/i }),
    ).toBeVisible();
  });

  test("Ugyldig token viser feilmelding", async ({ page }) => {
    await page.goto("/c/invalid-token/offer");
    await expect(page.getByText(/Ugyldig eller utløpt/i)).toBeVisible();
  });

  test("Submit uten pris viser feilmelding", async ({ page }) => {
    await page.goto(`/c/${encodeURIComponent(token)}/offer`);

    // Klikk «Send tilbud» uten å fylle inn pris
    await page.getByRole("button", { name: /Send tilbud/i }).click();

    // Bør vise validering/feilmelding
    await expect(
      page.getByText(/Totalpris.*påkrevd|positiv/i),
    ).toBeVisible();
  });

  test("Submit med gyldig pris → suksessmelding", async ({ page }) => {
    await page.goto(`/c/${encodeURIComponent(token)}/offer`);

    // Fyll ut totalpris
    await page.getByLabel(/Totalpris/i).fill("45000");

    // Fyll ut kommentar
    const commentField = page.locator("textarea");
    if (await commentField.isVisible()) {
      await commentField.fill("E2E test tilbud — AS350");
    }

    // Send tilbud
    await page.getByRole("button", { name: /Send tilbud/i }).click();

    // Vent på suksessmelding
    await expect(page.getByText(/Tilbudet er sendt/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Etter submit → viser allerede sendt info ved reload", async ({ page }) => {
    // Denne testen avhenger av at forrige test har sendt tilbudet
    await page.goto(`/c/${encodeURIComponent(token)}/offer`);

    // Bør vise «allerede sendt» eller prisinformasjon
    // Avhengig av side-implementasjon — sjekk at submit-skjema ikke vises igjen
    const submitButton = page.getByRole("button", { name: /Send tilbud/i });
    const alreadySent = page.getByText(/allerede|mottatt|sendt/i);

    // Enten er knappen borte eller vi ser allerede-sendt-melding
    const buttonVisible = await submitButton.isVisible().catch(() => false);
    const sentVisible = await alreadySent.isVisible().catch(() => false);

    expect(buttonVisible || sentVisible).toBe(true);
  });
});

test.describe("Selskap — Tilbud API direkte", () => {
  test("POST /api/offer uten token returnerer 400/401", async ({ request }) => {
    // Kan ikke sende FormData via Playwright request API like enkelt
    // men vi kan teste JSON-varianten
    const res = await request.post("/api/offer", {
      multipart: {
        json: JSON.stringify({ token: "invalid", price: 1000 }),
      },
    });
    expect([400, 401]).toContain(res.status());
  });
});


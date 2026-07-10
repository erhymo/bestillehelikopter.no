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
 * Customer Accept E2E Tests
 *
 * Tester at kunden kan akseptere et tilbud via signert lenke.
 * Krever at tilbudet har status "replied" (selskapet har sendt pris).
 *
 * Krever: Firebase-emulatorene og Next.js dev-server kjører
 */

test.describe("Kunde — Aksepter tilbud (/a/[token]/accept)", () => {
  let token: string;

  test.beforeAll(async () => {
    // Seed med offer i "replied" status (selskapet har gitt pris)
    await seedFirestoreDoc("companies", TEST_COMPANY_ID, TEST_COMPANY);
    await seedFirestoreDoc("jobs", TEST_JOB_ID, TEST_JOB);
    await seedFirestoreDoc(
      `jobs/${TEST_JOB_ID}/offers`,
      TEST_OFFER_ID,
      {
        _v: 1,
        companyId: TEST_COMPANY_ID,
        status: "replied",
        price: 45000,
        hourlyRate: 25000,
        hivRate: 35000,
        comment: "E2E tilbud med AS350",
        createdAt: new Date().toISOString(),
        repliedAt: new Date().toISOString(),
      },
    );

    token = mintTestToken();
  });

  test.afterAll(async () => {
    await clearEmulatorData();
  });

  test("Ugyldig token viser feilmelding", async ({ page }) => {
    await page.goto("/a/invalid-token/accept");
    await expect(page.getByText(/Ugyldig eller utløpt/i)).toBeVisible();
  });

  test("Gyldig token viser tilbudsdetaljer", async ({ page }) => {
    await page.goto(`/a/${encodeURIComponent(token)}/accept`);

    // Bør vise selskapsnavn
    await expect(page.getByText(TEST_COMPANY.name)).toBeVisible();

    // Bør vise pris
    await expect(page.getByText(/45.*000/)).toBeVisible();

    // Bør vise «Aksepter tilbud»-knapp
    await expect(
      page.getByRole("button", { name: /Aksepter tilbud/i }),
    ).toBeVisible();
  });

  test("Aksept-flyten: klikk → bekreft → suksess", async ({ page }) => {
    await page.goto(`/a/${encodeURIComponent(token)}/accept`);

    // Steg 1: Klikk «Aksepter tilbud»
    await page.getByRole("button", { name: /Aksepter tilbud/i }).click();

    // Steg 2: Bekreftelsesdialog vises
    await expect(page.getByText(/Er du sikker/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Ja, aksepter/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Avbryt/i }),
    ).toBeVisible();

    // Steg 3: Bekreft
    await page.getByRole("button", { name: /Ja, aksepter/i }).click();

    // Steg 4: Suksessmelding
    await expect(page.getByText(/Tilbudet er akseptert/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Etter aksept: reload viser allerede akseptert", async ({ page }) => {
    // Denne avhenger av at forrige test aksepterte tilbudet
    await page.goto(`/a/${encodeURIComponent(token)}/accept`);

    // Bør se "allerede akseptert" + vurderingslenke
    await expect(
      page.getByText(/allerede akseptert/i),
    ).toBeVisible();

    // Vurderingslenke bør vises
    await expect(
      page.getByRole("link", { name: /vurdering/i }),
    ).toBeVisible();
  });
});

test.describe("Kunde — Accept API direkte", () => {
  test("POST /api/accept uten token returnerer 400", async ({ request }) => {
    const res = await request.post("/api/accept", {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/accept med ugyldig token returnerer 401", async ({
    request,
  }) => {
    const res = await request.post("/api/accept", {
      data: { token: "this.is.invalid" },
    });
    expect(res.status()).toBe(401);
  });
});


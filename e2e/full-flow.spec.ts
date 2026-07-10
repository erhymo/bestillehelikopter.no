import { test, expect } from "@playwright/test";
import {
  mintTestToken,
  seedFirestoreDoc,
  clearEmulatorData,
  TEST_COMPANY,
} from "./helpers";

/**
 * Full E2E Flow — RFQ → Tilbud → Aksept → Lukking
 *
 * Denne testen kjører hele flyten i sekvens med unike IDer per kjøring.
 * Krever: Firebase-emulatorene og Next.js dev-server kjører.
 *
 * Flyten:
 * 1. Seed job + company + offer (status: "sent") i Firestore
 * 2. Selskap åpner kartvisning → navigerer til tilbudsskjema
 * 3. Selskap sender tilbud (pris: 50000)
 * 4. Kunde åpner aksept-lenke → ser tilbudsdetaljer
 * 5. Kunde aksepterer → suksessmelding
 * 6. Reload → "allerede akseptert" + vurderingslenke
 */

const FLOW_JOB_ID = `e2e-flow-${Date.now()}`;
const FLOW_COMPANY_ID = `e2e-flow-co-${Date.now()}`;
const FLOW_OFFER_ID = `e2e-flow-off-${Date.now()}`;

test.describe.serial("Full flyt: Tilbud → Aksept", () => {
  let token: string;

  test.beforeAll(async () => {
    // Seed company
    await seedFirestoreDoc("companies", FLOW_COMPANY_ID, {
      ...TEST_COMPANY,
      name: "Flytjenester E2E AS",
    });

    // Seed job
    await seedFirestoreDoc("jobs", FLOW_JOB_ID, {
      _v: 1,
      status: "open",
      customer: {
        name: "Kari Nordmann",
        email: "kari@validexample.com",
        phone: "+4799887766",
        invoiceAddress: "Testveien 2, 0002 Oslo",
        firebaseUid: "flow-test-uid",
      },
      pickup: { lat: 59.9139, lng: 10.7522, elevation: 20 },
      drops: [
        { lat: 60.3913, lng: 5.3221, elevation: 50, hpieces: 2, loadItems: [] },
      ],
      nettbruk: true,
      over15m: false,
      desiredDate: "2026-07-01",
      flexibleDate: false,
      notes: "Full flow test",
      selectedCompanyIds: [FLOW_COMPANY_ID],
      imageRefs: [],
      estimates: [{ legIndex: 0, distanceKm: 300, flightTimeMin: 90 }],
      totalFlightTimeMin: 90,
      pdfRef: null,
      acceptedCompanyId: null,
      acceptedAt: null,
    });

    // Seed offer (status: "sent")
    await seedFirestoreDoc(
      `jobs/${FLOW_JOB_ID}/offers`,
      FLOW_OFFER_ID,
      {
        _v: 1,
        companyId: FLOW_COMPANY_ID,
        status: "sent",
        price: null,
        createdAt: new Date().toISOString(),
      },
    );

    token = mintTestToken(FLOW_JOB_ID, FLOW_COMPANY_ID, FLOW_OFFER_ID);
  });

  test.afterAll(async () => {
    await clearEmulatorData();
  });

  test("1. Selskap åpner kartvisning", async ({ page }) => {
    await page.goto(`/c/${encodeURIComponent(token)}/map`);

    await expect(page.getByText(/Ugyldig/i)).not.toBeVisible();
    await expect(
      page.getByRole("link", { name: /Gi tilbud/i }),
    ).toBeVisible();
  });

  test("2. Selskap sender tilbud", async ({ page }) => {
    await page.goto(`/c/${encodeURIComponent(token)}/offer`);

    await expect(page.getByText("Flytjenester E2E AS")).toBeVisible();

    await page.getByLabel(/Totalpris/i).fill("50000");
    await page.locator("textarea").fill("Full flow test — Bell 412");

    await page.getByRole("button", { name: /Send tilbud/i }).click();

    await expect(page.getByText(/Tilbudet er sendt/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("3. Kunde ser tilbudsdetaljer", async ({ page }) => {
    await page.goto(`/a/${encodeURIComponent(token)}/accept`);

    await expect(page.getByText("Flytjenester E2E AS")).toBeVisible();
    await expect(page.getByText(/50.*000/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Aksepter tilbud/i }),
    ).toBeVisible();
  });

  test("4. Kunde aksepterer tilbudet", async ({ page }) => {
    await page.goto(`/a/${encodeURIComponent(token)}/accept`);

    await page.getByRole("button", { name: /Aksepter tilbud/i }).click();
    await expect(page.getByText(/Er du sikker/i)).toBeVisible();

    await page.getByRole("button", { name: /Ja, aksepter/i }).click();

    await expect(page.getByText(/Tilbudet er akseptert/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("5. Reload viser allerede akseptert + vurderingslenke", async ({
    page,
  }) => {
    await page.goto(`/a/${encodeURIComponent(token)}/accept`);

    await expect(page.getByText(/allerede akseptert/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /vurdering/i }),
    ).toBeVisible();
  });
});


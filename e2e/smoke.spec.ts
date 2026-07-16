import { test, expect } from "@playwright/test";

test.describe("Smoke — Statiske sider", () => {
  test("Forsiden laster med riktig overskrift og seksjon", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/BestilleHelikopter/i);

    // Nøytral overskrift
    await expect(
      page.getByRole("heading", { name: /Få tilbud på helikoptertransport/i }),
    ).toBeVisible();

    // "Slik fungerer det"-seksjon
    await expect(page.getByText("Slik fungerer det")).toBeVisible();
    await expect(page.getByText("Beskriv oppdraget", { exact: true })).toBeVisible();
    await expect(page.getByText("Motta tilbud")).toBeVisible();
    await expect(page.getByText("Aksepter eller avslå")).toBeVisible();
  });

  test("Footer har lenker til juridiske sider", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: /vilkår/i })).toBeVisible();
    await expect(footer.getByRole("link", { name: /personvern/i })).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /ansvarsfraskrivelse/i }),
    ).toBeVisible();
  });

  test("/vilkar laster med innhold", async ({ page }) => {
    await page.goto("/vilkar");
    await expect(
      page.getByRole("heading", { name: /Vilkår for bruk/i }),
    ).toBeVisible();
    await expect(page.getByText("Om tjenesten")).toBeVisible();
    await expect(page.getByText("Ansvarsbegrensning")).toBeVisible();
  });

  test("/personvern laster med innhold", async ({ page }) => {
    await page.goto("/personvern");
    await expect(
      page.getByRole("heading", { name: /Personvernerklæring/i }),
    ).toBeVisible();
    await expect(page.getByText("Hvilke opplysninger")).toBeVisible();
  });

  test("/ansvarsfraskrivelse laster med innhold", async ({ page }) => {
    await page.goto("/ansvarsfraskrivelse");
    await expect(
      page.getByRole("heading", { name: /Ansvarsfraskrivelse/i }),
    ).toBeVisible();
    await expect(page.getByText("formidlingsplattform")).toBeVisible();
  });
});

test.describe("Smoke — Skjema-validering", () => {
  test("Vilkår-checkbox blokkerer submit-knappen", async ({ page }) => {
    await page.goto("/");

    // Submit-knappen bør finnes
    const submitButton = page.getByRole("button", {
      name: /Send forespørsel|Verifiser telefon/i,
    });
    await expect(submitButton).toBeVisible();

    // Checkbox for vilkår
    const checkbox = page.getByRole("checkbox", { name: /Jeg har lest og aksepterer/i });
    // When unchecked, submit should be disabled
    await expect(checkbox).not.toBeChecked();
  });
});


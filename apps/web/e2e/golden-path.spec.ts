import { test, expect } from "@playwright/test";
import { E2E_CLAIM_CODE } from "./fixtures.js";

/**
 * T-50 e2e golden path: register -> success screen -> login -> empty
 * dashboard -> claim the device seeded by boot-api.ts -> see it listed.
 * Runs against a real apps/api instance + a real Next.js dev server (see
 * playwright.config.ts) — no mocking.
 */
test("register, login, claim device, see it on the dashboard", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.invalid`;
  const password = "Password123!";

  await page.goto("/register");
  await page.getByLabel("Nama").fill("E2E Test User");
  await page.getByLabel("Email").fill(email);
  // Not getByLabel: the password field's "show password" toggle button has
  // an aria-label ("Tampilkan kata sandi") that also matches "Kata sandi",
  // so getByLabel resolves to both. getByRole scopes to the textbox only.
  await page.getByRole("textbox", { name: "Kata sandi" }).fill(password);
  await page.getByRole("button", { name: "Daftar" }).click();

  await expect(page.getByRole("heading", { name: "Pendaftaran berhasil" })).toBeVisible();
  await page.getByRole("button", { name: "Ke halaman masuk" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Kata sandi" }).fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(page.getByRole("heading", { name: "Ringkasan" })).toBeVisible();
  await expect(page.getByText("Belum ada perangkat")).toBeVisible();

  await page.getByRole("button", { name: "Klaim perangkat", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Kode klaim").fill(E2E_CLAIM_CODE);
  await dialog.getByLabel("Nama tanaman / perangkat").fill("Monstera E2E");
  await dialog.getByLabel("Lokasi").fill("Ruang Tamu");
  await dialog.getByRole("button", { name: "Klaim perangkat" }).click();

  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("Monstera E2E")).toBeVisible();
});

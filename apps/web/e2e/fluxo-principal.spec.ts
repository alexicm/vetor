import { expect, test } from "@playwright/test";
import path from "node:path";

const email = `teste.${Date.now()}@vetor.local`;
const password = "senha-segura-123";

test("cadastro, login e abertura do estúdio", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL("**/app");
  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();

  const fixture = path.resolve(process.cwd(), "../../tests/fixtures/logo-monocromatico.png");
  await page.locator('input[type="file"]').setInputFiles(fixture);
  await page.waitForURL("**/app/estudio**");
  await expect(page.getByText(/LOGO-MONOCROMATICO|logo-monocromatico/i)).toBeVisible();
});

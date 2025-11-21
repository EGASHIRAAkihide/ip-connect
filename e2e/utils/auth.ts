import type { Page } from "@playwright/test";

export async function registerUser(page: Page, role: "creator" | "company") {
  const id = Math.random().toString(36).slice(2, 10);
  const email = `test_${role}_${id}@example.com`;
  const password = "TestPass123!";

  await page.goto("/auth/register");

  await page.getByLabel(/Email/i).fill(email);
  await page.getByLabel(/Password/i).fill(password);

  const roleSelect = page.getByLabel(/Role/i);
  if ((await roleSelect.count()) > 0) {
    await roleSelect.selectOption(role);
  } else {
    const roleButton =
      role === "creator"
        ? page.getByRole("button", { name: /Creator/i })
        : page.getByRole("button", { name: /Company/i });
    if ((await roleButton.count()) > 0) {
      await roleButton.first().click();
    }
  }

  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState("networkidle");

  return { email, password };
}

export async function loginUser(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.getByLabel(/Email/i).fill(email);
  await page.getByLabel(/Password/i).fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState("networkidle");
}

export async function registerCreator(page: Page) {
  return registerUser(page, "creator");
}

export async function registerCompany(page: Page) {
  return registerUser(page, "company");
}

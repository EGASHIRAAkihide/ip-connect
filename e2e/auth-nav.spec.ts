import { test, expect } from "@playwright/test";
import { loginUser, registerUser } from "./utils/auth";

test("creator registration/login updates MainNav immediately", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation");

  await expect(nav.getByText(/Login/i)).toBeVisible();
  await expect(nav.getByText(/Register/i)).toBeVisible();

  const { email, password } = await registerUser(page, "creator");

  await loginUser(page, email, password);
  await page.goto("/");

  const navAfter = page.getByRole("navigation");

  const anyCreatorLink = navAfter.locator('a[href*="/creator"]');
  await expect(anyCreatorLink.first()).toBeVisible();

  await navAfter.getByText(/Logout|ログアウト/i).click();

  const navGuest = page.getByRole("navigation");
  await expect(navGuest.getByText(/Login/i)).toBeVisible();
  await expect(navGuest.getByText(/Register/i)).toBeVisible();
});

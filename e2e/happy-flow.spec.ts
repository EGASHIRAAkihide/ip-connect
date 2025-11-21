import { test, expect } from "@playwright/test";
import {
  loginUser,
  registerCompany,
  registerCreator,
} from "./utils/auth";

test("creator publishes IP, company inquires, creator approves and marks payment, analytics updates", async ({
  browser,
}) => {
  const creatorContext = await browser.newContext();
  const creatorPage = await creatorContext.newPage();

  const creatorCreds = await registerCreator(creatorPage);
  await loginUser(creatorPage, creatorCreds.email, creatorCreds.password);

  await creatorPage.goto("/creator/ip/new");

  const title = `Test Voice Asset ${Date.now()}`;

  await creatorPage.getByLabel(/Title/i).fill(title);
  await creatorPage.getByLabel(/Category/i).selectOption("voice");
  await creatorPage
    .locator('input[type="file"]')
    .first()
    .setInputFiles("e2e/fixtures/sample-audio.mp3");
  await creatorPage.locator('button[type="submit"]').click();

  await creatorPage.waitForURL("**/ip/**");
  const assetUrl = creatorPage.url();

  const companyContext = await browser.newContext();
  const companyPage = await companyContext.newPage();
  const companyCreds = await registerCompany(companyPage);
  await loginUser(companyPage, companyCreds.email, companyCreds.password);

  await companyPage.goto(assetUrl);
  // Navigate to the inquiry form directly to avoid brittle link text assumptions
  await companyPage.goto(`${assetUrl}/inquire`);
  await companyPage.waitForURL("**/ip/**/inquire");

  await companyPage.getByLabel(/Usage purpose/i).selectOption("Ad");
  await companyPage.getByLabel(/Region/i).selectOption("JP");
  await companyPage.getByLabel(/Intended usage period/i).fill("3 months");
  await companyPage.getByLabel(/Budget/i).fill("500");
  await companyPage
    .getByLabel(/Message/i)
    .fill("We want to use this in a campaign.");

  await companyPage.locator('button[type="submit"]').click();
  await companyPage.waitForURL("**/ip");

  await creatorPage.goto("/creator/inquiries");
  const inquiryCard = creatorPage
    .getByRole("article")
    .filter({ hasText: title })
    .first();

  await inquiryCard.getByRole("button", { name: /Approve/i }).click();

  await inquiryCard
    .getByRole("link", { name: /View details/i })
    .click();

  await creatorPage.waitForURL("**/creator/inquiries/**");

  await creatorPage
    .getByRole("button", { name: /Mark as invoiced/i })
    .click();
  await creatorPage
    .getByRole("button", { name: /Mark as paid/i })
    .click();

  await expect(
    creatorPage.getByText(/Payment:/i).last()
  ).toContainText(/Paid/i);

  await companyPage.goto("/company/inquiries");
  const companyInquiryCard = companyPage
    .getByRole("article")
    .filter({ hasText: title })
    .first();
  await companyInquiryCard
    .getByRole("link", { name: /View details/i })
    .click();

  await expect(
    companyPage.getByText(/Payment status/i).locator("..")
  ).toContainText(/Paid/i);

  await creatorPage.goto("/analytics");

  await expect(creatorPage.getByText(/Creators/i)).toBeVisible();
  await expect(creatorPage.getByText(/IP Assets/i)).toBeVisible();
  await expect(creatorPage.getByText(/Inquiries/i)).toBeVisible();

  await creatorContext.close();
  await companyContext.close();
});

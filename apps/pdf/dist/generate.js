import { chromium } from "playwright";
import fs from "node:fs/promises";
const [, , url, outPath] = process.argv;
if (!url || !outPath) {
    // eslint-disable-next-line no-console
    console.error("Usage: node dist/generate.js <url> <outPath>");
    process.exit(2);
}
const cookieHeader = process.env.REPORT_COOKIE ?? "";
const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
try {
    const context = await browser.newContext({
        extraHTTPHeaders: cookieHeader ? { cookie: cookieHeader } : undefined,
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await page.waitForSelector('[data-report-ready="true"]', { state: "attached", timeout: 60000 });
    await page.waitForSelector('[data-report-results-ready="true"]', { state: "attached", timeout: 60000 });
    const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
    });
    await fs.writeFile(outPath, pdf);
}
finally {
    await browser.close();
}

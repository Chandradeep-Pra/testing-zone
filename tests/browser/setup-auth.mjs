import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const origin = process.env.AUTOMATION_ORIGIN || "https://urologics.co.uk";
const email = process.env.AUTOMATION_EMAIL;
const password = process.env.AUTOMATION_PASSWORD;
const output = path.resolve(
  process.env.AUTOMATION_AUTH_STATE || ".viva-test-artifacts/auth-state.json",
);

if (!email || !password) {
  throw new Error(
    "Set AUTOMATION_EMAIL and AUTOMATION_PASSWORD in the shell before running this script.",
  );
}

const chrome =
  process.env.CHROME_PATH ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find((candidate) => {
    return existsSync(candidate);
  });

if (!chrome) throw new Error("Set CHROME_PATH to an installed Chrome or Edge executable.");

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: process.env.HEADLESS !== "false",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage();
  await page.goto(`${origin}/web/login?redirect=%2Fweb%2Fai-viva%2Fcases`, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  await page.waitForFunction(
    () => Boolean(localStorage.getItem("urologics-testing-zone-auth")),
    { timeout: 30000 },
  );

  const auth = await page.evaluate(() => {
    const raw = localStorage.getItem("urologics-testing-zone-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      idToken: typeof parsed.idToken === "string" && parsed.idToken ? parsed.idToken : null,
      refreshToken:
        typeof parsed.refreshToken === "string" && parsed.refreshToken
          ? parsed.refreshToken
          : null,
    };
  });

  if (!auth?.idToken || !auth.refreshToken) {
    throw new Error("Login completed without usable authentication tokens.");
  }

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(auth, null, 2)}\n`, { mode: 0o600 });
  console.log(`Authenticated browser state saved to ${path.relative(process.cwd(), output)}`);
} finally {
  await browser.close();
}

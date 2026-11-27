// Standalone component regression: real React/canvas, no live viva or external services.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { compile } from "@tailwindcss/node";
import puppeteer from "puppeteer-core";

const files = ["components/ai-viva/AiPanel.tsx", "components/ai-viva/ExaminerOrb.tsx"];
const sources = await Promise.all(files.map(file => fs.readFile(file, "utf8")));
const compiler = await compile(await fs.readFile("app/globals.css", "utf8"), {
  base: process.cwd(),
  onDependency() {},
});
const css = compiler.build(sources.join(" ").split(/[\s"'`]+/));
const bundle = await build({
  stdin: {
    resolveDir: process.cwd(),
    loader: "tsx",
    contents: `
      import React, { useEffect } from "react";
      import { createRoot } from "react-dom/client";
      import { flushSync } from "react-dom";
      import { AiPanel } from "./components/ai-viva/AiPanel";
      window.avatarMounts = 0;
      window.avatarUnmounts = 0;
      function Avatar() {
        useEffect(() => {
          window.avatarMounts++;
          return () => { window.avatarUnmounts++; };
        }, []);
        return <video data-test-avatar autoPlay playsInline />;
      }
      const root = createRoot(document.getElementById("root"));
      window.renderOrbCase = ({ avatar = false, exhibit = false, ...props } = {}) => {
        flushSync(() => root.render(
          <AiPanel speaking={false} transcript="Existing examiner transcript" {...props}
            avatarVideo={avatar ? <Avatar /> : null}
            exhibit={exhibit ? <img data-test-exhibit alt="Test exhibit"
              src={'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="white"/></svg>')} /> : null}
          />
        ));
      };
      window.renderOrbCase();
    `,
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const chrome = process.env.CHROME_PATH || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].find(file => existsSync(file));
assert.ok(chrome, "Set CHROME_PATH to Chrome/Chromium");
const artifacts = path.resolve(".viva-test-artifacts/thinking-orbs");
await fs.mkdir(artifacts, { recursive: true });
const browser = await puppeteer.launch({ executablePath: chrome, headless: true });

try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewport({ width, height: width === 390 ? 844 : 1000, deviceScaleFactor: 2 });
    await page.setContent(`<style>${css}\nhtml,body,#root{height:100%;margin:0}</style><div id="root"></div>`);
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.waitForSelector("[data-examiner-orb] canvas");

    for (const [props, state, label] of [
      [{}, "breathing", "Ready"],
      [{ listening: true }, "listening", "Listening"],
      [{ thinking: true, listening: true }, "solving", "Preparing response"],
      [{ speaking: true, thinking: true }, "composing", "Examiner speaking"],
    ]) {
      await page.evaluate(props => window.renderOrbCase(props), props);
      assert.equal(await page.$eval("[data-examiner-orb]", node => node.dataset.examinerOrb), state);
      assert.equal(await page.$eval("canvas", canvas => canvas.getAttribute("aria-label")), label);
      assert.equal(await page.$eval("body", node => node.innerText), `${label.toUpperCase()}\n\nLIVE TRANSCRIPT\n\nExisting examiner transcript`);
    }

    // Inspect actual rendered pixels: green and blue match, red is near zero for #018888.
    await page.waitForFunction(() => {
      const canvas = document.querySelector("canvas");
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let teal = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 100 && data[i + 1] > data[i] + 15 && Math.abs(data[i + 1] - data[i + 2]) <= 2) teal++;
      }
      return teal > 10;
    });
    const rect = await page.$eval("canvas", canvas => {
      const r = canvas.getBoundingClientRect();
      return { left: r.left, right: r.right, width: r.width, height: r.height };
    });
    assert.ok(rect.left >= 0 && rect.right <= width);
    assert.equal(rect.width, width === 390 ? 160 : 192);
    assert.equal(rect.width, rect.height);
    await page.screenshot({ path: path.join(artifacts, `orb-${width}.png`) });

    await page.evaluate(() => window.renderOrbCase({ avatar: true }));
    assert.equal(await page.$("canvas"), null);
    assert.ok(await page.$("[data-test-avatar]"));
    await page.evaluate(() => { window.originalAvatar = document.querySelector("[data-test-avatar]"); });
    await page.evaluate(() => window.renderOrbCase({ avatar: true, exhibit: true }));
    assert.equal(await page.$("canvas"), null);
    assert.ok(await page.$("[data-test-exhibit]"));
    assert.equal(await page.evaluate(() => window.originalAvatar === document.querySelector("[data-test-avatar]")), true);
    await page.evaluate(() => window.renderOrbCase({ avatar: true }));
    assert.equal(await page.$("[data-test-exhibit]"), null);
    assert.equal(await page.evaluate(() => window.originalAvatar === document.querySelector("[data-test-avatar]")), true);
    assert.deepEqual(await page.evaluate(() => [window.avatarMounts, window.avatarUnmounts]), [1, 0]);

    // Losing avatar restores the orb; opening an exhibit removes it entirely.
    await page.evaluate(() => window.renderOrbCase({ thinking: true }));
    assert.ok(await page.$("canvas"));
    assert.equal(await page.$("[data-test-avatar]"), null);
    await page.evaluate(() => window.renderOrbCase({ exhibit: true, thinking: true }));
    assert.equal(await page.$("[data-examiner-orb]"), null);
    assert.ok(await page.$("[data-test-exhibit]"));
    await page.screenshot({ path: path.join(artifacts, `exhibit-${width}.png`) });
    await page.evaluate(() => window.renderOrbCase({ listening: true }));
    assert.ok(await page.$("canvas"));
    const animatedFrame = await page.$eval("canvas", canvas => canvas.toDataURL());
    await page.waitForFunction(frame => document.querySelector("canvas").toDataURL() !== frame, {}, animatedFrame);

    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.waitForFunction(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
    // Allow the preference event and React effect to paint their static frame.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const frame = await page.$eval("canvas", canvas => canvas.toDataURL());
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 200)));
    assert.equal(await page.$eval("canvas", canvas => canvas.toDataURL()), frame);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: teal pixels, status states, existing text, avatar continuity, exhibit priority, fallback recovery, animation, reduced motion`);
    await page.close();
  }
} finally {
  await browser.close();
}

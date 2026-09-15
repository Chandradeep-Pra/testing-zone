import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const base = process.env.COURSE_TEST_BASE_URL || 'http://127.0.0.1:3101';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use a local test server');
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => fs.existsSync(file));
const artifacts = path.resolve(process.env.COURSE_TEST_ARTIFACTS || '.course-test-artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const fixturePage = await browser.newPage();
  const bytes = await fixturePage.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 180;
    const context = canvas.getContext('2d');
    const chunks = [];
    const recorder = new MediaRecorder(canvas.captureStream(10), { mimeType: 'video/webm;codecs=vp8' });
    recorder.ondataavailable = event => chunks.push(event.data);
    const done = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start();
    for (let frame = 0; frame < 15; frame++) {
      context.fillStyle = '#e5f5ee'; context.fillRect(0, 0, 320, 180);
      context.fillStyle = '#207958'; context.fillRect(frame * 10, 50, 70, 70);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    recorder.stop(); await done;
    return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  });
  const media = Buffer.from(bytes);
  await fixturePage.close();

  for (const width of [1440, 390]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height: width === 390 ? 844 : 1000 });
    const errors = [];
    const calls = { library: 0, refresh: 0, stream: 0, media: 0 };
    let accessReady = false;
    let earlyLibrary = false;
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(() => localStorage.setItem('urologics-testing-zone-auth', JSON.stringify({
      uid: 'test', email: 'test@example.test', name: 'Test Candidate', idToken: 'test-token', refreshToken: 'test-refresh',
      expiresAt: Date.now() + 3_600_000, tier: 'paid', activeCourseIds: [],
    })));
    const videos = ['one', 'two'].map(id => ({ id, title: `Lecture ${id}`, provider: 'storage', sectionId: 'section', thumbnailUrl: `${base}/web/logo.png`, access: { allowed: true, mode: 'full' } }));
    await page.setRequestInterception(true);
    page.on('request', request => { void (async () => {
      const url = new URL(request.url());
      const json = body => request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.hostname === 'securetoken.googleapis.com') { calls.refresh++; return json({}); }
      if (url.pathname.endsWith('/api/urologics/access')) {
        await new Promise(resolve => setTimeout(resolve, 500));
        accessReady = true;
        return json({ tier: 'paid', profile: { uid: 'test', email: 'test@example.test', name: 'Test Candidate' } });
      }
      if (url.pathname.endsWith('/api/urologics/videos/library')) {
        calls.library++;
        if (!accessReady) earlyLibrary = true;
        return json({ sections: [{ id: 'section', title: 'Test course', videoCount: 2, videos }] });
      }
      if (url.pathname.endsWith('/play')) {
        const id = url.pathname.split('/').at(-2);
        await new Promise(resolve => setTimeout(resolve, id === 'one' ? 700 : 500));
        if (request.isInterceptResolutionHandled()) return;
        return json({ video: videos.find(video => video.id === id), playback: { provider: 'storage', url: `https://storage.test/${id}.webm`, expiresAt: Date.now() + 900_000 } });
      }
      if (url.pathname.endsWith('/stream')) { calls.stream++; return request.abort(); }
      if (url.hostname === 'storage.test') {
        calls.media++;
        return request.respond({ status: 200, contentType: 'video/webm', headers: { 'access-control-allow-origin': '*' }, body: media });
      }
      if (url.pathname.includes('/api/')) return json({});
      if (url.origin !== base && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    })().catch(error => { if (!/already handled|Invalid InterceptionId|Target closed/i.test(error.message)) errors.push(error.message); }); });
    await page.goto(`${base}/web/courses`, { waitUntil: 'networkidle0', timeout: 120_000 });
    await page.waitForFunction(() => document.body.textContent.includes('Test course'));
    assert.equal(earlyLibrary, false);
    assert.equal(calls.refresh, 0);
    // Development Strict Mode may remount the library subscription once.
    assert.ok(calls.library >= 1 && calls.library <= 2);
    await page.screenshot({ path: path.join(artifacts, `courses-${width}.png`), fullPage: true });
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.includes('Test course')).click());
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.includes('Lecture two')));
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.includes('Lecture two')).click());
    await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some(node => node.textContent.includes('Loading video')));
    await page.waitForFunction(() => document.querySelector('video')?.src.includes('two.webm'));
    await new Promise(resolve => setTimeout(resolve, 1000));
    assert.ok(await page.$eval('video', video => video.src.includes('two.webm')));
    assert.equal(calls.stream, 0);
    assert.ok(calls.media > 0);
    await page.waitForFunction(() => document.querySelector('video')?.currentTime > 0);
    await page.screenshot({ path: path.join(artifacts, `player-${width}.png`), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: authenticated library, no token refresh, direct media, loading indicator, automatic playback, no horizontal overflow`);
    await context.close();
  }
} finally { await browser.close(); }

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

(async () => {
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const artifacts = path.resolve('.viva-test-artifacts/mocks');
  fs.mkdirSync(artifacts, { recursive: true });
  const errors = [], writes = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1100 });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('urologics-testing-zone-auth', JSON.stringify({ uid: 'test', email: 'candidate@example.test', name: 'Test Candidate', idToken: 'test-token', refreshToken: 'test-refresh', expiresAt: Date.now() + 3600000, tier: 'paid', activeCourseIds: [] }));
      localStorage.setItem('mock-fixture-summary', JSON.stringify({ total: 10, correct: 10, wrong: 0, skipped: 0 }));
    });
    const results = Array.from({ length: 12 }, (_, index) => ({ rank: index + 1, name: index === 2 ? 'Test Candidate' : `Candidate ${index + 1}`, email: index === 2 ? 'candidate@example.test' : `candidate${index}@example.test`, marks: 10 - Math.floor(index / 2), maxMarks: 10, attended: 'Today' }));
    const description = 'A comprehensive mock covering core urology, clinical decision making and exam preparation.';
    const mock = { id: 'fixture', quizId: 'quiz', title: 'FRCS Urology Grand Mock', description, type: 'grand-mock', accessType: 'public', durationMinutes: 60, hasAttempted: true, userAttempt: { score: 1, answers: { q1: 1 } }, questions: [{ id: 'q1', questionText: 'Review fixture question', options: ['Option A', 'Option B', 'Option C', 'Option D', 'Option E'], correctAnswer: 1, explanation: { text: 'Review fixture explanation' } }] };
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/')) {
        if (request.method() === 'POST' && url.pathname.includes('/attempts')) writes.push(url.pathname);
        let payload = {};
        if (url.pathname.endsWith('/results')) payload = { mock: { title: mock.title }, results: [...results].reverse() };
        else if (url.pathname.endsWith('/api/mocks')) payload = { mocks: [mock] };
        else if (url.pathname.endsWith('/mocks/fixture')) payload = { mock };
        else if (url.pathname.endsWith('/urologics/access')) payload = { tier: 'paid', profile: { uid: 'test', email: 'candidate@example.test', name: 'Test Candidate', activeCourseIds: [] } };
        return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !url.protocol.startsWith('data')) return request.abort();
      return request.continue();
    });
    await page.goto('http://127.0.0.1:3022/web/mocks/fixture/rank', { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForSelector('table tbody tr', { timeout: 60000 });
    const ranks = await page.$$eval('table tbody tr td:first-child', cells => cells.map(cell => cell.textContent));
    assert.deepEqual(ranks, results.map(row => `#${row.rank}`));
    assert.match(await page.$eval('h1', node => node.textContent), /FRCS Urology Grand Mock/);
    assert.match(await page.$eval('body', node => node.textContent), /First attempts only/);
    await page.screenshot({ path: path.join(artifacts, 'rank-desktop.png'), fullPage: true });
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(artifacts, 'rank-mobile.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.goto('http://127.0.0.1:3022/web/mocks/fixture/result', { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForFunction(() => document.body.innerText.includes('Review fixture explanation'));
    assert.match(await page.$eval('body', node => node.textContent), /1\/1/);
    assert.equal(writes.length, 0, 'Review must never submit an attempt');
    await page.reload({ waitUntil: 'networkidle0' });
    assert.equal(writes.length, 0, 'Refreshing review must never submit an attempt');
    await page.goto('http://127.0.0.1:3022/web/mocks', { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForFunction(() => document.body.innerText.includes('Review Answers'));
    assert.match(await page.$eval('body', node => node.textContent), new RegExp(description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const buttons = await page.$$('article button');
    for (const button of buttons) {
      const text = await button.evaluate(node => node.textContent);
      if (text.includes('Review Answers')) { await button.click(); break; }
    }
    await page.waitForFunction(() => location.pathname.endsWith('/result'));
    assert.equal(writes.length, 0);
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: rank order (12 rows), desktop/mobile layout, description, direct review, read-only review and reload.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

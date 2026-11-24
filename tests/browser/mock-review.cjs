const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

(async () => {
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true, args: ['--no-sandbox'], timeout: 60000 });
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
    const mock = { id: 'fixture', quizId: 'quiz', title: 'FRCS Urology Grand Mock', description, type: 'grand-mock', accessType: 'public', durationMinutes: 60, hasAttempted: true, userAttempt: { score: 1, answers: { q1: 1, q2: 0 }, flaggedQuestionIds: ['q3', 'q5'] }, questions: Array.from({ length: 8 }, (_, index) => ({ id: `q${index + 1}`, questionText: `Review fixture question ${index + 1}`, options: ['Option A', 'Option B', 'Option C', 'Option D', 'Option E'], correctAnswer: 1, explanation: { text: `Review fixture explanation ${index + 1}. ${'Detailed explanation. '.repeat(index === 1 ? 120 : 5)}` } })) };
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
    await page.goto(`${process.env.MOCK_ORIGIN || 'http://127.0.0.1:3022'}/web/mocks/fixture/rank`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForSelector('table tbody tr', { timeout: 60000 });
    const ranks = await page.$$eval('table tbody tr td:first-child', cells => cells.map(cell => cell.textContent));
    assert.deepEqual(ranks, results.map(row => `#${row.rank}`));
    assert.match(await page.$eval('h1', node => node.textContent), /FRCS Urology Grand Mock/);
    assert.match(await page.$eval('body', node => node.textContent), /First attempts only/);
    await page.screenshot({ path: path.join(artifacts, 'rank-desktop.png'), fullPage: true });
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(artifacts, 'rank-mobile.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.goto(`${process.env.MOCK_ORIGIN || 'http://127.0.0.1:3022'}/web/mocks/fixture/result`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForFunction(() => document.body.innerText.includes('Review fixture explanation'));
    assert.match(await page.$eval('body', node => node.textContent), /1\/8/);
    assert.equal(await page.$$eval('[data-review-status]', cards => cards.length), 8, 'All questions remain available to scroll');
    assert.equal(await page.$eval('#review-question-1', card => card.dataset.reviewStatus), 'correct');
    assert.equal(await page.$eval('#review-question-2', card => card.dataset.reviewStatus), 'incorrect');
    assert.equal(await page.$eval('#review-question-3', card => card.dataset.reviewStatus), 'unanswered');

    const viewportSelector = '[role="region"][aria-label="Reviewed questions"]';
    const navigation = 'nav[aria-label="Review question navigation"]';
    async function waitForQuestion(number) {
      await page.waitForFunction((number, viewportSelector, navigation) => {
        const viewport = document.querySelector(viewportSelector);
        const card = document.getElementById(`review-question-${number}`);
        const current = document.querySelector(`${navigation} [aria-current="location"]`);
        const aligned = Math.abs(card.getBoundingClientRect().top - viewport.getBoundingClientRect().top) < 3;
        const atEnd = viewport.scrollTop >= viewport.scrollHeight - viewport.clientHeight - 2;
        return current?.textContent.trim() === String(number) && (aligned || atEnd);
      }, {}, number, viewportSelector, navigation);
      // A card can be within a pixel of its target while native smooth scrolling
      // is still running. Wait for it to settle before sending wheel/key input.
      await page.$eval(viewportSelector, viewport => new Promise(resolve => {
        let timer = setTimeout(done, 150);
        function done() {
          viewport.removeEventListener('scroll', restart);
          resolve();
        }
        function restart() {
          clearTimeout(timer);
          timer = setTimeout(done, 150);
        }
        viewport.addEventListener('scroll', restart, { passive: true });
      }));
    }
    async function selectQuestion(number) {
      await page.click(`${navigation} button[aria-label^="Question ${number}:"]`);
      await waitForQuestion(number);
    }
    async function wheelToNextQuestion(number) {
      const { x, y, distance } = await page.$eval(viewportSelector, (viewport, number) => {
        const bounds = viewport.getBoundingClientRect();
        const current = document.getElementById(`review-question-${number}`);
        const next = document.getElementById(`review-question-${number + 1}`);
        return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2,
          distance: next.getBoundingClientRect().top - current.getBoundingClientRect().top };
      }, number);
      await page.mouse.move(x, y);
      await page.mouse.wheel({ deltaY: distance });
      await page.waitForFunction((navigation, number) =>
        document.querySelector(`${navigation} [aria-current="location"]`)?.textContent.trim() === String(number),
      { timeout: 10000 }, navigation, number + 1).catch(async error => {
        console.log(await page.evaluate((viewportSelector, navigation) => {
          const viewport = document.querySelector(viewportSelector);
          return { scrollTop: viewport.scrollTop, height: viewport.clientHeight,
            active: document.querySelector(`${navigation} [aria-current]`)?.textContent,
            cards: [...document.querySelectorAll('[data-review-status]')].map(card => ({ id: card.id, top: card.getBoundingClientRect().top })),
            viewportTop: viewport.getBoundingClientRect().top, focus: document.activeElement?.outerHTML };
        }, viewportSelector, navigation));
        await page.screenshot({ path: path.join(artifacts, 'review-scroll-failure.png'), fullPage: true });
        throw error;
      });
    }

    // Exercise both compact and desktop layouts with real wheel input.
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1100 }]) {
      await page.setViewport(viewport);
      await selectQuestion(6);
      assert.equal(await page.$eval('nav', nav => nav.getBoundingClientRect().top >= 0), true, 'Navigation stays visible');
      await selectQuestion(2);
      await wheelToNextQuestion(2);
      await selectQuestion(8);
      await selectQuestion(1);
      await page.focus(viewportSelector);
      await page.keyboard.press('PageDown');
      await page.waitForFunction(selector => document.querySelector(selector).scrollTop > 100, {}, viewportSelector);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(artifacts, `review-scroll-${viewport.width}.png`), fullPage: true });
    }
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await selectQuestion(4);
    const jump = `${navigation} input`;
    await page.focus(jump);
    await page.type(jump, '7');
    await page.keyboard.press('Enter');
    await waitForQuestion(7);
    assert.equal(await page.$eval(jump, input => document.activeElement === input), true, 'Jump input retains keyboard focus');
    await page.click(`${navigation} button[aria-pressed]`);
    await waitForQuestion(3);
    assert.equal(await page.$$eval(`${navigation} button[aria-label^="Question "]`, buttons => buttons.length), 2);
    assert.equal(await page.$$eval('[data-review-status]', cards => cards.length), 8, 'Flag filter only filters navigation');
    await page.click(`${navigation} button[aria-pressed]`);
    await selectQuestion(5);
    assert.equal(writes.length, 0, 'Review must never submit an attempt');
    await page.reload({ waitUntil: 'networkidle0' });
    await waitForQuestion(5);
    assert.equal(writes.length, 0, 'Refreshing review must never submit an attempt');
    await page.goto(`${process.env.MOCK_ORIGIN || 'http://127.0.0.1:3022'}/web/mocks`, { waitUntil: 'networkidle0', timeout: 120000 });
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
    console.log('Browser checks passed: rank order (12 rows), desktop/mobile layout, description, continuous review, number/jump navigation, wheel and keyboard scrolling, reduced motion, flagged navigation, read-only review and hash reload.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

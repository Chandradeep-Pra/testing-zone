const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

(async () => {
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true, args: ['--no-sandbox'], timeout: 60000 });
  const origin = process.env.MOCK_ORIGIN || 'http://127.0.0.1:3028';
  const artifacts = path.resolve('.viva-test-artifacts/mocks/leaderboard-entry');
  fs.mkdirSync(artifacts, { recursive: true });
  const errors = [], writes = [];
  let scenario = 'normal';
  const mocks = Array.from({ length: 12 }, (_, index) => ({
    id: `entry-${index}`, title: `${index % 2 ? 'Renal' : 'Urology'} mock ${index + 1}`,
    description: 'Clinical questions for exam preparation.', durationMinutes: 30,
    accessType: 'public', hasAttempted: index === 1 || index === 10,
    ...(index === 1 || index === 10 ? { userAttempt: { marks: 12, totalQuestions: 20 } } : {}),
  }));
  const rankings = [
    { email: 'first@example.test', name: 'First Candidate', marks: 18, maxMarks: 20, rank: 1 },
    { email: 'candidate@example.test', name: 'Test Candidate', marks: 12, maxMarks: 20, rank: 2 },
    { email: 'third@example.test', name: 'Third Candidate', marks: 8, maxMarks: 20, rank: 3 },
  ];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1000 });
    const authScript = await page.evaluateOnNewDocument(() => localStorage.setItem('urologics-testing-zone-auth', JSON.stringify({
      uid: 'test', email: 'candidate@example.test', name: 'Test Candidate', idToken: 'fixture', refreshToken: 'fixture',
      expiresAt: Date.now() + 3600000, tier: 'paid', activeCourseIds: [],
    })));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/')) {
        if (!['GET', 'HEAD'].includes(request.method()) && /\/(attempts|start)$/.test(url.pathname)) writes.push(url.pathname);
        let payload = {}, status = 200;
        const id = url.pathname.match(/\/mocks\/(entry-\d+)/)?.[1];
        if (url.pathname.endsWith('/results')) {
          if (scenario === 'error') { status = 503; payload = { error: 'Rankings temporarily unavailable' }; }
          else payload = { mock: { title: mocks.find(mock => mock.id === id)?.title }, results: scenario === 'empty' ? [] : id === 'entry-1' ? rankings : rankings.filter(row => row.email !== 'candidate@example.test') };
        } else if (id) payload = { mock: mocks.find(mock => mock.id === id) };
        else if (url.pathname.endsWith('/mocks')) payload = { mocks };
        else if (url.pathname.endsWith('/urologics/access')) payload = { tier: 'paid', profile: { uid: 'test', email: 'candidate@example.test', name: 'Test Candidate', activeCourseIds: [] } };
        return request.respond({ status, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !url.protocol.startsWith('data')) return request.abort();
      return request.continue();
    });
    const cardLink = id => `article a[href$="/${id}/rank?from=mocks"]`;
    const waitForRank = async () => {
      await page.waitForSelector('table tbody tr', { timeout: 60000 });
      assert.equal(await page.$('canvas'), null, 'Browsing rankings does not trigger confetti');
      assert.doesNotMatch(await page.$eval('body', node => node.innerText), /Your attempt is being recorded/);
    };

    await page.goto(`${origin}/web/mocks`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForSelector(cardLink('entry-1'));
    assert.equal(await page.$$eval('article a', nodes => nodes.length), 2, 'Only attempted mocks show a leaderboard entry');
    assert.equal(await page.$(cardLink('entry-0')), null);
    assert.deepEqual(await page.$$eval('article:first-of-type button', nodes => nodes.map(node => node.textContent.trim())), ['Start Mock Session'], 'A fresh mock has only its start action');
    await page.screenshot({ path: path.join(artifacts, 'cards-desktop.png'), fullPage: true });
    await page.type('input[type="search"]', 'Urology');
    await page.$eval(cardLink('entry-10'), node => node.scrollIntoView({ block: 'center' }));
    const returnY = await page.evaluate(() => window.scrollY);
    await page.click(cardLink('entry-10'));
    await waitForRank();
    assert.notEqual(await page.$('#your-rank'), null);
    const start = await page.$('a.urologics-button-primary');
    assert.equal(await start.evaluate(node => node.textContent.trim()), 'View analysis');
    assert.match(await start.evaluate(node => node.getAttribute('href')), /entry-10\/result$/);
    await page.screenshot({ path: path.join(artifacts, 'leaderboard-attendee-desktop.png'), fullPage: true });
    await page.click('header a[href="/web/mocks"]');
    await page.waitForSelector(cardLink('entry-10'));
    await page.waitForFunction(() => document.querySelector('input[type="search"]')?.value === 'Urology');
    await page.waitForFunction(y => Math.abs(window.scrollY - y) < 3, {}, returnY);
    assert.equal(await page.$$eval('article', nodes => nodes.length), 6, 'Back preserves the filtered list');

    await page.$eval(cardLink('entry-10'), node => node.scrollIntoView());
    await page.focus(cardLink('entry-10'));
    await page.keyboard.press('Enter');
    await waitForRank();
    assert.match(page.url(), /entry-10\/rank/);
    assert.equal(await page.$('div.fixed.inset-0.z-50'), null, 'Leaderboard link does not open the card start modal');
    await page.goto(`${origin}/web/mocks/entry-0/rank?from=mocks`, { waitUntil: 'networkidle0' });
    await waitForRank();
    assert.equal(await page.$('#your-rank'), null);
    assert.equal(await page.$('a[href$="/result"]'), null, 'Non-attendees do not see answer review');
    await page.click('a.urologics-button-primary');
    await page.waitForFunction(() => location.pathname.endsWith('/entry-0/rules'));
    assert.equal(writes.length, 0, 'Opening the leaderboard and rules never starts or submits a mock');

    await page.evaluate(() => localStorage.setItem('mock-entry-0-started-at', String(Date.now())));
    await page.goto(`${origin}/web/mocks/entry-0/rank?from=mocks`, { waitUntil: 'networkidle0' });
    await waitForRank();
    assert.equal(await page.$eval('a.urologics-button-primary', node => node.textContent), 'Resume mock');
    assert.match(await page.$eval('a.urologics-button-primary', node => node.getAttribute('href')), /\/entry-0$/);

    await page.goto(`${origin}/web/mocks/entry-1/rank?from=mocks`, { waitUntil: 'networkidle0' });
    await waitForRank();
    assert.match(await page.$eval('#your-rank', node => node.innerText), /#2/);
    assert.equal(await page.$eval('a.urologics-button-primary', node => node.textContent.trim()), 'View analysis');
    assert.match(await page.$eval('a.urologics-button-primary', node => node.getAttribute('href')), /entry-1\/result$/);

    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${origin}/web/mocks`, { waitUntil: 'networkidle0' });
    await page.waitForSelector(cardLink('entry-10'));
    await page.screenshot({ path: path.join(artifacts, 'cards-mobile.png'), fullPage: true });
    assert.equal(await page.$(cardLink('entry-0')), null);
    assert.ok(await page.$eval(cardLink('entry-10'), node => node.getBoundingClientRect().height >= 44));
    await page.click(cardLink('entry-10'));
    await waitForRank();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(artifacts, 'leaderboard-mobile.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.screenshot({ path: path.join(artifacts, 'leaderboard-mobile-dark.png'), fullPage: true });
    await page.setViewport({ width: 320, height: 700 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

    scenario = 'error';
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('[role="alert"]');
    assert.equal(await page.$('table'), null, 'An outage is not shown as an empty leaderboard');
    scenario = 'empty';
    for (const button of await page.$$('button')) {
      if (await button.evaluate(node => node.textContent === 'Try again')) { await button.click(); break; }
    }
    await page.waitForSelector('table');
    assert.match(await page.$eval('table', node => node.innerText), /No attempts yet/);

    // A public visitor can browse without registering; starting uses the existing registration flow.
    await page.removeScriptToEvaluateOnNewDocument(authScript.identifier);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    scenario = 'normal';
    await page.goto(`${origin}/web/mocks/entry-0/rank?from=mocks`, { waitUntil: 'networkidle0' });
    await waitForRank();
    assert.match(await page.$eval('a.urologics-button-primary', node => node.getAttribute('href')), /public-mocks\/entry-0$/);
    assert.equal(await page.$('#your-rank'), null);
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
    console.log('Passed: card click and keyboard navigation, visitor/resume/completed actions, public browsing, filter/scroll return, error retry, empty state, mobile themes, and no mock writes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

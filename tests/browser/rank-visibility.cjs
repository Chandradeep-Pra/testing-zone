const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

(async () => {
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true, args: ['--no-sandbox'], timeout: 60000 });
  const artifacts = path.resolve('.viva-test-artifacts/mocks/rank-visibility');
  fs.mkdirSync(artifacts, { recursive: true });
  const origin = process.env.MOCK_ORIGIN || 'http://127.0.0.1:3028';
  const errors = [], writes = [], photoReferrers = [];
  let scenario = "normal";
  const fullLeaderboard = Array.from({ length: 25 }, (_, index) => ({
    rank: index + 1,
    email: index === 24 ? 'candidate@example.test' : `candidate-${index}@example.test`,
    name: index === 24 ? 'Second Candidate' : `Candidate ${index + 1}`,
    marks: 25 - index,
    maxMarks: 25,
    submittedAt: '2026-10-16T10:00:00Z',
  }));
  const results = [
    { rank: 1, email: ' UROLOGOICS.ORG@gmail.com ', name: 'Hidden One', marks: 20 },
    { rank: 2, email: 'first@example.test', name: 'First Candidate', marks: 18, userImage: 'https://ranking-photos.test/good.svg' },
    { rank: 3, candidate: { email: 'chandradeepp611@gmail.com', name: 'Hidden Two' }, marks: 17 },
    { rank: 4, email: 'candidate@example.test', name: 'Second Candidate', marks: 12, userImage: 'https://ranking-photos.test/broken.jpg' },
    { rank: 5, email: 'ankitgoel042@gmail.com', name: 'Hidden Three', marks: 11 },
    { rank: 6, email: 'third@example.test', name: 'Third Candidate', marks: 5 },
  ].map(row => ({ ...row, maxMarks: 20, submittedAt: '2026-10-16T10:00:00Z' }));
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1100 });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('urologics-testing-zone-auth', JSON.stringify({ uid: 'test', email: 'candidate@example.test', name: 'Second Candidate', idToken: 'fixture', refreshToken: 'fixture-refresh', expiresAt: Date.now() + 3600000, tier: 'paid', activeCourseIds: [] }));
    });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.hostname === 'ranking-photos.test') {
        photoReferrers.push(request.headers().referer);
        return request.respond(url.pathname === '/good.svg' ? {
          status: 200, contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#0e8b9b"/><circle cx="16" cy="12" r="6" fill="white"/></svg>',
        } : { status: 404, body: 'Not found' });
      }
      if (url.pathname.includes('/api/')) {
        if (!['GET', 'HEAD'].includes(request.method()) && url.pathname.endsWith('/attempts')) writes.push(url.pathname);
        let payload = {};
        if (url.pathname.endsWith('/results')) {
          if (scenario === 'error') return request.respond({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Rankings temporarily unavailable' }) });
          payload = { mock: { title: 'Ranking visibility fixture' }, results: scenario === 'normal' ? results : scenario === 'low' ? fullLeaderboard : fullLeaderboard.filter(row => row.email !== 'candidate@example.test') };
        }
        else if (url.pathname.endsWith('/mocks/visibility')) payload = { mock: { id: 'visibility', title: 'Ranking visibility fixture', questions: [], ...(scenario !== 'normal' && scenario !== 'visitor' ? { userAttempt: { marks: 0, totalQuestions: 25 } } : {}) } };
        else if (url.pathname.endsWith('/urologics/access')) payload = { tier: 'paid', profile: { uid: 'test', email: 'candidate@example.test', name: 'Second Candidate', activeCourseIds: [] } };
        return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (!['localhost', '127.0.0.1'].includes(url.hostname) && !url.protocol.startsWith('data')) return request.abort();
      return request.continue();
    });
    await page.goto(`${origin}/web/mocks/visibility/rank`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForSelector('table tbody tr', { timeout: 60000 });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('table tbody tr')).length === 3 &&
      !document.querySelector('img[src$="broken.jpg"]') &&
      Array.from(document.querySelectorAll('img[src$="good.svg"]')).every(image => image.complete && image.naturalWidth > 0));
    const body = await page.$eval('body', node => node.innerText);
    assert.doesNotMatch(body, /Hidden One|Hidden Two|Hidden Three/);
    assert.match(body, /3 candidates/);
    assert.match(body, /33\.3%/);
    assert.deepEqual(await page.$$eval('table tbody tr td:first-child', cells => cells.map(cell => cell.textContent)), ['#1', '#2', '#3']);
    assert.equal(await page.$$eval('img[src$="good.svg"]', images => images.length), 2, 'Photo renders in the podium and table');
    assert.equal(await page.$$eval('table tbody tr:nth-child(2) td:nth-child(2)', cells => cells[0].innerText.includes('SC')), true, 'Broken photo shows initials');
    assert.equal(await page.$$eval('table tbody tr:nth-child(3) td:nth-child(2)', cells => cells[0].innerText.includes('TC')), true, 'Missing photo shows initials');
    assert.ok(photoReferrers.every(value => !value), 'External photo requests omit the referrer');
    assert.equal(writes.length, 0);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(artifacts, 'rank-desktop.png'), fullPage: true });
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(artifacts, 'rank-mobile.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

    scenario = 'low';
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('#your-rank');
    assert.match(await page.$eval('#your-rank', node => node.innerText), /#25/);
    assert.match(await page.$eval('header a[href="#your-rank"]', node => node.innerText), /Your rank: #25/);
    assert.match(await page.$eval('#your-rank', node => node.innerText), /Current attempt score\s*0 \/ 25/);
    assert.match(await page.$eval('#your-rank', node => node.innerText), /First attempt: 1 \/ 25/);
    assert.match(await page.$eval('table tbody tr:last-child', node => node.innerText), /#25[\s\S]*You/);
    assert.equal(await page.$$eval('table tbody tr', nodes => nodes.length), 25);
    await page.screenshot({ path: path.join(artifacts, 'rank-outside-top-mobile.png'), fullPage: true });

    scenario = 'absent';
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('#your-rank');
    assert.match(await page.$eval('#your-rank', node => node.innerText), /Not available yet/);
    assert.match(await page.$eval('#your-rank', node => node.innerText), /Current attempt score\s*0 \/ 25/);
    assert.doesNotMatch(await page.$eval('#your-rank', node => node.innerText), /#25|#0|First attempt:/);
    assert.equal(await page.$$eval('table tbody tr', nodes => nodes.length), 24, 'A saved current attempt never fabricates a ranked first attempt');

    scenario = 'error';
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('#your-rank');
    assert.match(await page.$eval('#your-rank', node => node.innerText), /Current attempt score\s*0 \/ 25/);
    assert.match(await page.$eval('[role="alert"]', node => node.innerText), /Rankings temporarily unavailable/);

    scenario = 'visitor';
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('table tbody tr');
    assert.equal(await page.$('#your-rank'), null, 'A viewer without a completed attempt does not get a personal rank');
    assert.equal(writes.length, 0);
    assert.deepEqual(errors, []);
    console.log('Browser passed: rank #25 outside the podium, zero-score reattempt, saved attempt missing from leaderboard, ranking outage, non-attendee view, hidden accounts, photo fallbacks and mobile layout.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

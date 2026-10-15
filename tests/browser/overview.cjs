const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');

(async () => {
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true, args: ['--no-sandbox'], timeout: 60000 });
  const artifacts = path.resolve('.viva-test-artifacts/overview');
  fs.mkdirSync(artifacts, { recursive: true });
  const errors = [], submissions = [];
  let empty = false;
  const candidate = { uid: 'overview-fixture', email: 'candidate@example.test', name: 'Chandradeep', idToken: 'fixture-token', refreshToken: 'fixture-refresh', expiresAt: Date.now() + 3600000, tier: 'paid', activeCourseIds: [] };
  const mocks = [
    { id: 'mixed', title: 'FRCS Section 1 · Mixed topics', durationMinutes: 60, questionCount: 50, accessType: 'public' },
    { id: 'bladder', title: 'Bladder cancer · Chapter test', durationMinutes: 25, questionCount: 20, accessType: 'public', hasAttempted: true, userAttempt: { score: 16 } },
    { id: 'upper', title: 'Upper tract urothelial cancer', durationMinutes: 25, questionCount: 20, accessType: 'private', access: { allowed: false, mode: 'locked' } }
  ];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.emulateTimezone('Asia/Kolkata');
    await page.evaluateOnNewDocument((candidate) => {
      localStorage.setItem('urologics-testing-zone-auth', JSON.stringify(candidate));
      localStorage.setItem('urologics-testing-zone-theme', 'light');
    }, candidate);
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/')) {
        let body = {};
        if (url.pathname.endsWith('/submit-quiz')) { submissions.push(JSON.parse(request.postData())); body = { correct: true }; }
        else if (url.pathname.endsWith('/announcements')) body = { announcements: empty ? [] : [
          { id: 'a1', title: 'International Travel Fellowship 2026', description: 'Explore this year’s programme, eligibility and upcoming mock sessions.', media: { type: 'image', src: '/web/exhibits/img-ct-001.png' } },
          { id: 'a2', title: 'Your next grand mock is here', kind: 'grand-mock', description: 'Prepare for your next exam with a timed mock session and detailed question review.' },
          { id: 'a3', title: 'Clinical teaching update', description: 'Explore the latest learning resources.' }
        ] };
        else if (url.pathname.endsWith('/daily-quiz')) body = { quiz: empty ? null : { id: 'q1', question: 'A patient undergoes radical nephrectomy for renal cell carcinoma. Which pathological feature indicates invasion beyond the kidney?', topic: 'Renal oncology', options: ['Tumour confined to the renal cortex', 'Invasion into perinephric fat', 'Tumour size greater than 4 cm', 'Low nuclear grade'], correctIndex: 1, explanation: '**Correct.** Extension into perinephric fat indicates invasion beyond the kidney.' } };
        else if (url.pathname.endsWith('/exam-schedules')) body = { schedules: empty ? [] : [{ id: 's1', examName: 'FRCS Section 1', examDate: '2027-01-05' }, { id: 's2', examName: 'FRCS Section 2', examDate: '2027-03-10' }] };
        else if (url.pathname.endsWith('/api/mocks')) body = { mocks: empty ? [] : mocks };
        else if (url.pathname.endsWith('/me/progress')) body = { recentLessons: empty ? [] : [
          { id: 'l1', title: 'Bladder cancer: staging', sectionTitle: 'Urology Core Curriculum', progressPct: 45, remainingMinutes: 12, thumbnailUrl: '/web/exhibits/LUTS-01.jpeg' },
          { id: 'l2', title: 'Upper tract imaging', sectionTitle: 'Uro-oncology', progressPct: 60, remainingMinutes: 8, thumbnailUrl: '/web/exhibits/img-ct-001.png' },
          { id: 'l3', title: 'Prostate cancer: diagnosis', sectionTitle: 'Histopathology', progressPct: 30, remainingMinutes: 16, thumbnailUrl: '/web/exhibits/LUTS-02.jpeg' }
        ] };
        else if (url.pathname.endsWith('/viva-cases')) body = { cases: empty ? [] : [{ id: 'v1', title: 'Renal oncology viva', specialty: 'Uro-oncology', difficulty: 'Intermediate' }] };
        else if (url.pathname.endsWith('/access')) body = { tier: 'paid', profile: { ...candidate } };
        return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      }
      if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !url.protocol.startsWith('data')) return request.abort();
      return request.continue();
    });
    await page.setViewport({ width: 1295, height: 1214 });
    await page.goto('http://127.0.0.1:3023/web', { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForFunction(() => document.body.innerText.includes('Chandradeep') && document.body.innerText.includes('Bladder cancer: staging'));
    await page.screenshot({ path: path.join(artifacts, 'desktop.png'), fullPage: true });
    for (const width of [320, 375, 390, 768, 1024, 1295]) {
      await page.setViewport({ width, height: width < 768 ? 844 : 1000 });
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert.equal(dimensions.scroll <= dimensions.viewport, true, `No horizontal overflow at ${width}: ${JSON.stringify(dimensions)}`);
      if (width === 390 || width === 768) await page.screenshot({ path: path.join(artifacts, width === 390 ? 'mobile.png' : 'tablet.png'), fullPage: true });
    }
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.$$eval('.overview-bottom-nav a', nodes => nodes.length), 5);
    await page.click('[aria-label="Next announcement"]');
    assert.match(await page.$eval('.overview-announcement-content', node => node.textContent), /Your next grand mock/);
    await page.click('[aria-label="Previous announcement"]');
    await page.click('.overview-announcement-media button');
    await page.waitForSelector('[role="dialog"]');
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role="dialog"]', { hidden: true });
    await page.click('.overview-schedule-toggle');
    await page.waitForSelector('#overview-exam-dates');
    await page.click('.overview-schedule-toggle');
    await page.select('[aria-label="Filter available tests"]', 'attended');
    assert.equal(await page.$$eval('.overview-test-row', nodes => nodes.length), 1);
    assert.match(await page.$eval('.overview-test-row', node => node.textContent), /Review Answers/);
    await page.select('[aria-label="Filter available tests"]', 'viva');
    assert.match(await page.$eval('.overview-test-row', node => node.textContent), /Renal oncology viva/);
    await page.select('[aria-label="Filter available tests"]', 'all');
    await page.click('input[name="overview-daily-quiz"][value="1"]');
    await page.click('.overview-submit');
    await page.waitForFunction(() => document.body.innerText.includes('Correct answer.'));
    assert.deepEqual(submissions, [{ selectedIndex: 1 }]);
    assert.equal(await page.$eval('.overview-submit', node => node.disabled), true);
    await page.screenshot({ path: path.join(artifacts, 'mobile-quiz-result.png'), fullPage: true });
    await page.click('[aria-label="Toggle navigation"]');
    await page.click('[aria-label="Switch to dark mode"]');
    await page.click('[aria-label="Toggle navigation"]');
    await page.waitForFunction(() => document.body.classList.contains('dark'));
    await page.screenshot({ path: path.join(artifacts, 'mobile-dark.png'), fullPage: true });
    await page.setViewport({ width: 1295, height: 1214 });
    await page.screenshot({ path: path.join(artifacts, 'desktop-dark.png'), fullPage: true });
    empty = true;
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('You’re all caught up') || document.body.innerText.includes("You're all caught up"));
    assert.equal(await page.$$('.overview-test-row').then(nodes => nodes.length), 0);
    await page.screenshot({ path: path.join(artifacts, 'empty.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('Overview checks passed: 6 viewport widths, carousel, image preview/Escape, exam schedule, mock filters, quiz submission, dark mode, and empty states.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

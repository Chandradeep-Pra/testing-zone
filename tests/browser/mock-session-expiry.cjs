const assert = require('node:assert/strict');
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

(async () => {
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true, args: ['--no-sandbox'] });
  const origin = process.env.MOCK_ORIGIN || 'http://127.0.0.1:3024';
  try {
    for (const scenario of [
      { count: 100, elapsed: 56 * 60_000 },
      { count: 200, elapsed: 2 * 60 * 60_000 },
      { count: 200, elapsed: 2 * 60 * 60_000, refreshFails: true },
      { count: 100, elapsed: 56 * 60_000, syncFails: true },
      { count: 100, elapsed: 2 * 60 * 60_000, guest: true },
    ]) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      async function clickButton(label) {
        for (const button of await page.$$('button')) {
          if ((await button.evaluate(node => node.textContent.trim())) === label) {
            await button.click();
            return;
          }
        }
        throw new Error(`Button not found: ${label}`);
      }
      const submissions = [], events = [], errors = [];
      const mock = { id: 'long-test', title: 'Long test', durationMinutes: 240, questions: Array.from({ length: scenario.count }, (_, i) => ({ id: `q${i}`, questionText: `Question ${i + 1}`, options: ['A', 'B'], correctAnswer: 0 })) };
      const answers = Object.fromEntries(mock.questions.map(q => [q.id, 0]));
      let token = 'initial-token';
      let completing = false;
      page.on('pageerror', error => errors.push(error.message));
      await page.evaluateOnNewDocument(({ answers, guest }) => {
        if (!guest) localStorage.setItem('urologics-testing-zone-auth', JSON.stringify({ uid: 'candidate', email: 'candidate@example.test', name: 'Candidate', idToken: 'initial-token', refreshToken: 'test-refresh', expiresAt: Date.now() + 3600_000, tier: 'paid', activeCourseIds: [] }));
        else localStorage.setItem('mockUser', JSON.stringify({ name: 'Guest', email: 'guest@example.test' }));
        localStorage.setItem('mock-long-test-answers', JSON.stringify(answers));
      }, { answers, guest: scenario.guest });
      await page.setRequestInterception(true);
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.hostname === 'securetoken.googleapis.com') {
          events.push('refresh');
          if (scenario.refreshFails) return request.respond({ status: 503, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Session refresh unavailable' } }) });
          token = 'renewed-token';
          return request.respond({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: JSON.stringify({ user_id: 'candidate', id_token: token, refresh_token: 'renewed-refresh', expires_in: '3600' }) });
        }
        if (url.pathname.endsWith('/api/urologics/session')) {
          if (completing) events.push('session');
          if (completing && scenario.syncFails) return request.respond({ status: 503, contentType: 'application/json', body: '{}' });
          // Exercise the real session route, including its HttpOnly cookie.
          return request.continue();
        }
        if (url.pathname.includes('/api/')) {
          let status = 200, payload = {};
          if (url.pathname.endsWith('/attempts')) {
            events.push('submit');
            submissions.push(JSON.parse(request.postData()));
            const cookie = request.headers().cookie || '';
            if (!scenario.guest && !cookie.includes(`__session=${token}`)) {
              status = 401;
              payload = { error: 'Unauthorized' };
            } else payload = { success: true };
          } else if (url.pathname.endsWith('/mocks/long-test')) payload = { mock };
          else if (url.pathname.endsWith('/urologics/access')) payload = { tier: 'paid', profile: { uid: 'candidate', email: 'candidate@example.test', name: 'Candidate', activeCourseIds: [] } };
          else if (url.pathname.endsWith('/results')) payload = { results: [] };
          return request.respond({ status, contentType: 'application/json', body: JSON.stringify(payload) });
        }
        if (!['localhost', '127.0.0.1'].includes(url.hostname) && !url.protocol.startsWith('data')) return request.abort();
        return request.continue();
      });
      const initialSessionReady = scenario.guest ? Promise.resolve() : page.waitForResponse(response => response.url().endsWith('/api/urologics/session') && response.ok());
      await page.goto(`${origin}/web/mocks/long-test`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Question 1');
      await initialSessionReady;
      if (!scenario.guest) {
        assert.ok((await page.cookies()).some(cookie => cookie.name === '__session'));
      }

      // Advance the authentication clock and remove the cookie as a browser
      // would after 55 minutes, without waiting hours or changing the exam timer.
      await page.deleteCookie({ name: '__session', url: origin });
      await page.evaluate(elapsed => {
        const now = Date.now.bind(Date);
        Date.now = () => now() + elapsed;
      }, scenario.elapsed);
      completing = true;
      await clickButton('Submit Mock');
      await page.waitForSelector('dialog[open]');
      await clickButton('Submit');
      if (scenario.refreshFails || scenario.syncFails) {
        const message = scenario.refreshFails ? 'Session refresh unavailable' : 'Playback session synchronization failed.';
        await page.waitForFunction(message => document.body.innerText.includes(message), {}, message);
        assert.equal(submissions.length, 0, 'Authentication failures must not submit an unauthenticated attempt');
        assert.equal(await page.evaluate(() => localStorage.getItem('mock-long-test-final')), null);
        assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('mock-long-test-answers'))), answers, 'All answers survive an authentication failure');
        await page.waitForSelector('h1');
      } else {
        await page.waitForFunction(() => location.pathname.endsWith('/rank'), { timeout: 60000 });
        assert.equal(submissions.length, 1, 'Exactly one attempt is submitted');
        assert.deepEqual(submissions[0].answers, answers);
        assert.equal(submissions[0].marks, scenario.count);
        assert.equal(submissions[0].totalQuestions, scenario.count);
        assert.deepEqual(events, scenario.guest ? ['submit'] : scenario.elapsed > 3600_000 ? ['refresh', 'session', 'submit'] : ['session', 'submit']);
      }
      assert.deepEqual(errors, []);
      console.log(`Passed: ${scenario.count} questions, ${scenario.elapsed / 60_000} minutes elapsed${scenario.refreshFails ? ', refresh outage' : scenario.syncFails ? ', session outage' : scenario.guest ? ', public candidate' : ''}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

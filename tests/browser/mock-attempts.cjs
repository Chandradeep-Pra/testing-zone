const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

(async () => {
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true, args: ['--no-sandbox'], timeout: 60000 });
  const artifacts = path.resolve('.viva-test-artifacts/mocks');
  fs.mkdirSync(artifacts, { recursive: true });
  const errors = [], submissions = [], feedbackSubmissions = [];
  let saved = false, feedbackFails = false;
  const cacheKey = 'mock-reattempt-latest-attempt:candidate%40example.test';
  const origin = process.env.MOCK_ORIGIN || 'http://127.0.0.1:3023';
  const firstAnswers = { q1: 0, q2: 0, q3: 1 };
  const mock = { id: 'reattempt', title: 'Reattempt fixture', durationMinutes: 5, accessType: 'public', hasAttempted: true, userAttempt: { marks: 2, answers: firstAnswers, submittedAt: '2026-10-14T10:00:00Z' }, questions: [1, 2, 3].map(index => ({ id: `q${index}`, questionText: `Attempt question ${index}`, options: ['Option A', 'Option B'], correctAnswer: 0, explanation: { text: 'Option A is correct.' } })) };
  const results = [
    { email: 'other@example.test', name: 'Other Candidate', marks: 3, maxMarks: 3, attemptNumber: 1, submittedAt: '2026-10-14T09:00:00Z' },
    { email: 'candidate@example.test', name: 'Test Candidate', marks: 2, maxMarks: 3, attemptNumber: 1, submittedAt: '2026-10-14T10:00:00Z' },
    { email: 'third@example.test', name: 'Third Candidate', marks: 1, maxMarks: 3, attemptNumber: 1, submittedAt: '2026-10-14T11:00:00Z' },
  ];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1100 });
    await page.evaluateOnNewDocument((firstAnswers) => {
      localStorage.setItem('urologics-testing-zone-auth', JSON.stringify({ uid: 'test', email: 'candidate@example.test', name: 'Test Candidate', idToken: 'fixture', refreshToken: 'fixture-refresh', expiresAt: Date.now() + 3600000, tier: 'paid', activeCourseIds: [] }));
      localStorage.setItem('mock-reattempt-first-final', JSON.stringify(firstAnswers));
      localStorage.setItem('mock-reattempt-summary', JSON.stringify({ total: 9, marks: 9 }));
    }, firstAnswers);
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/')) {
        let payload = {}, status = 200;
        if (request.method() === 'POST' && url.pathname.endsWith('/experience-feedback')) {
          feedbackSubmissions.push(JSON.parse(request.postData()));
          status = feedbackFails ? 503 : 200;
          payload = feedbackFails ? { error: 'Feedback unavailable' } : { success: true };
        } else if (request.method() === 'POST' && url.pathname.endsWith('/attempts')) {
          submissions.push(JSON.parse(request.postData()));
          if (submissions.length === 1) { status = 503; payload = { error: 'Fixture save failed. Please retry.' }; }
          else { saved = true; payload = { success: true }; }
        } else if (url.pathname.endsWith('/results')) payload = { mock: { title: mock.title }, results: saved ? [...results, { ...results[1], marks: 3, attemptNumber: 2, submittedAt: '2026-10-15T12:00:00Z' }] : results };
        else if (url.pathname.endsWith('/mocks/reattempt')) payload = { mock };
        else if (url.pathname.endsWith('/urologics/access')) payload = { tier: 'paid', profile: { uid: 'test', email: 'candidate@example.test', name: 'Test Candidate', activeCourseIds: [] } };
        return request.respond({ status, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (!['localhost', '127.0.0.1'].includes(url.hostname) && !url.protocol.startsWith('data')) return request.abort();
      return request.continue();
    });
    async function clickButton(label) {
      for (const button of await page.$$('button')) {
        if ((await button.evaluate(node => node.textContent.trim())) === label) { await button.click(); return; }
      }
      throw new Error(`Button not found: ${label}`);
    }
    await page.goto(`${origin}/web/mocks/reattempt/result`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForFunction(() => document.body.innerText.includes('2/3'));
    assert.equal(submissions.length, 0, 'Review is read-only and ignores a stale unowned summary');
    await page.goto(`${origin}/web/mocks/reattempt`, { waitUntil: 'networkidle0', timeout: 120000 });
    for (let index = 1; index <= 3; index++) {
      await page.waitForFunction((index) => document.querySelector('h1')?.textContent === `Attempt question ${index}`, {}, index);
      for (const button of await page.$$('section button')) {
        if ((await button.evaluate(node => node.textContent)).includes('Option A')) { await button.click(); break; }
      }
    }
    await clickButton('Submit Mock');
    await page.waitForSelector('dialog[open]');
    assert.equal(await page.$$eval('dialog fieldset', nodes => nodes.length), 2);
    assert.match(await page.$eval('dialog', node => node.textContent), /difficulty level of the questions/);
    assert.match(await page.$eval('dialog', node => node.textContent), /mock platform experience/);
    await page.click('label:has(input[name="mock-difficulty"][value="4"])');
    for (const stars of [1, 2, 3]) {
      await page.click(`label:has(input[name="mock-platform-experience"][value="${stars}"])`);
      await page.waitForSelector('#mock-feedback-comment');
      assert.equal(await page.$eval('#mock-feedback-comment', node => node.required), false);
      assert.equal(await page.$eval('dialog form', form => form.checkValidity()), true, 'Written feedback is optional');
    }
    await page.type('#mock-feedback-comment', 'A draft that should not be sent with a high rating.');
    await page.click('label:has(input[name="mock-platform-experience"][value="5"])');
    assert.equal(await page.$('#mock-feedback-comment'), null, 'High ratings hide the feedback box');
    await page.setViewport({ width: 320, height: 700 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(artifacts, 'mock-submit-feedback-mobile.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await new Promise(resolve => setTimeout(resolve, 250));
    await page.screenshot({ path: path.join(artifacts, 'mock-submit-feedback-mobile-dark.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await page.setViewport({ width: 1440, height: 1100 });
    await clickButton('Cancel');
    assert.equal(submissions.length, 0, 'Cancel does not submit the mock');
    assert.equal(feedbackSubmissions.length, 0, 'Cancel does not save feedback');
    await clickButton('Submit Mock');
    await clickButton('Submit');
    await page.waitForFunction(() => document.body.innerText.includes('Fixture save failed. Please retry.'));
    assert.equal(await page.evaluate(key => localStorage.getItem(key), cacheKey), null, 'Failed submissions must not become the latest completed attempt');
    assert.equal(feedbackSubmissions.length, 0, 'A failed attempt does not save feedback');
    await clickButton('Submit Mock');
    await clickButton('Submit');
    await page.waitForFunction(() => location.pathname.endsWith('/rank') && document.body.innerText.includes('Current attempt score'), { timeout: 60000 });
    assert.equal(feedbackSubmissions.length, 1, 'Feedback is saved once after the successful attempt');
    assert.equal(feedbackSubmissions[0].questionsRating, 4);
    assert.equal(feedbackSubmissions[0].appRating, 5);
    assert.equal(feedbackSubmissions[0].reason, undefined, 'Hidden comments are not submitted with high ratings');
    assert.equal(await page.$('[name="assessment-rating"]'), null, 'Mocks have no post-submit feedback screen');
    assert.equal(submissions.length, 2);
    assert.equal(submissions[1].marks, 3);
    const body = await page.$eval('body', node => node.innerText);
    assert.match(body, /Current attempt score\s*3 \/ 3/);
    assert.match(body, /Score percentage\s*100%/);
    assert.match(body, /Percentile\s*33\.3%/);
    assert.match(body, /First attempt: 2 \/ 3/);
    const candidate = await page.$$eval('table tbody tr', nodes => nodes.find(node => node.textContent.includes('Test Candidate')).innerText);
    assert.match(candidate, /#2/);
    assert.equal(await page.$$eval('table tbody tr', nodes => nodes.length), 3);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mock-reattempt-first-final')).q3), 1, 'Original ranked answers remain unchanged');
    await page.screenshot({ path: path.join(artifacts, 'current-score-first-rank-desktop.png'), fullPage: true });
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(artifacts, 'current-score-first-rank-mobile.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.goto(`${origin}/web/mocks/reattempt/result`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('3/3'));
    assert.equal(await page.$$eval('article', nodes => nodes.filter(node => node.textContent.includes('Your answer: A. Option A')).length), 3);
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('3/3'));
    assert.equal(submissions.length, 2, 'Review and refresh never submit attempts');

    await page.goto(`${origin}/web/mocks/reattempt`, { waitUntil: 'networkidle0' });
    await clickButton('Submit Mock');
    await clickButton('Submit');
    await page.waitForFunction(() => location.pathname.endsWith('/rank'), { timeout: 60000 });
    assert.equal(feedbackSubmissions.length, 1, 'Unrated mocks submit directly without sending feedback');

    feedbackFails = true;
    await page.goto(`${origin}/web/mocks/reattempt`, { waitUntil: 'networkidle0' });
    await clickButton('Submit Mock');
    await page.click('label:has(input[name="mock-difficulty"][value="2"])');
    await page.click('label:has(input[name="mock-platform-experience"][value="3"])');
    await page.type('#mock-feedback-comment', 'The platform could be easier to navigate.');
    await page.screenshot({ path: path.join(artifacts, 'mock-submit-optional-comment-mobile.png'), fullPage: true });
    await clickButton('Submit');
    await page.waitForFunction(() => location.pathname.endsWith('/rank'), { timeout: 60000 });
    assert.equal(feedbackSubmissions.length, 2, 'A feedback outage still allows navigation to rankings');
    assert.equal(feedbackSubmissions[1].reason, 'The platform could be easier to navigate.');
    assert.equal(submissions.length, 4, 'Feedback failures never resubmit the saved attempt');
    assert.deepEqual(errors, []);
    console.log('Mock browser checks passed: inline ratings, cancel, failed save/retry, direct rankings, optional ratings, feedback outage, mobile themes, current score/first-attempt rank and read-only review.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

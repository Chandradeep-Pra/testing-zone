const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const origin = process.env.OVERVIEW_ORIGIN || 'http://127.0.0.1:3023';

(async () => {
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true, args: ['--no-sandbox'], timeout: 60000 });
  const artifacts = path.resolve('.viva-test-artifacts/overview');
  fs.mkdirSync(artifacts, { recursive: true });
  const errors = [], submissions = [], progressAuth = [];
  let empty = false;
  const candidate = { uid: 'overview-fixture', email: 'candidate@example.test', name: 'Chandradeep', idToken: 'fixture-token', refreshToken: 'fixture-refresh', expiresAt: Date.now() + 3600000, tier: 'paid', activeCourseIds: ['course1'] };
  let currentCandidate = candidate;
  const liveWindow = { startTime: new Date(Date.now() - 60000).toISOString(), endTime: new Date(Date.now() + 3600000).toISOString() };
  const mocks = [
    { id: 'mixed', title: 'FRCS Section 1 · Mixed topics', durationMinutes: 60, questionCount: 50, accessType: 'public', ...liveWindow },
    { id: 'bladder', title: 'Bladder cancer · Chapter test', durationMinutes: 25, questionCount: 20, accessType: 'public', hasAttempted: true, userAttempt: { score: 16 }, ...liveWindow },
    { id: 'upper', title: 'Upper tract urothelial cancer', durationMinutes: 25, questionCount: 20, accessType: 'private', access: { allowed: false, mode: 'locked' }, ...liveWindow }
  ];
  const schedules = ['FRCS Section 1', 'FRCS Section 2', 'European Board of Urology', 'Urology specialty assessment', 'Clinical viva preparation'].map((examName, index) => ({ id: `s${index + 1}`, examName, examDate: new Date(Date.now() + (80 + index * 20) * 86400000).toISOString().slice(0, 10) }));
  const longAnnouncement = Array.from({ length: 30 }, (_, index) => `Learning update ${index + 1}: practise a clinical topic, review your reasoning, and prepare for your next Urologics mock session.`).join('\n\n');
  const lessons = [
    { id: 'l1', videoId: 'l1', title: 'Bladder cancer: staging', sectionTitle: 'Urology Core Curriculum', percentComplete: 45, watchedSeconds: 588, lastPositionSeconds: 588, durationSeconds: 1308, completed: false, lastWatchedAt: '2026-10-16T10:00:00Z', thumbnailUrl: '/web/exhibits/LUTS-01.jpeg' },
    { id: 'l2', videoId: 'l2', title: 'Upper tract imaging', sectionTitle: 'Uro-oncology', percentComplete: 60, watchedSeconds: 720, lastPositionSeconds: 720, durationSeconds: 1200, completed: false, lastWatchedAt: '2026-10-16T09:00:00Z', thumbnailUrl: '/web/exhibits/img-ct-001.png' },
    { id: 'l3', videoId: 'l3', title: 'Prostate cancer: diagnosis', sectionTitle: 'Histopathology', percentComplete: 30, watchedSeconds: 420, lastPositionSeconds: 420, durationSeconds: 1380, completed: false, lastWatchedAt: '2026-10-16T08:00:00Z', thumbnailUrl: '/web/exhibits/LUTS-02.jpeg' }
  ];

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', error => errors.push(error.message));
    await page.emulateTimezone('Asia/Kolkata');
    await page.evaluateOnNewDocument(candidate => {
      localStorage.setItem('urologics-testing-zone-auth', sessionStorage.getItem('overview-fixture-auth') || JSON.stringify(candidate));
      localStorage.setItem('urologics-testing-zone-theme', 'light');
    }, candidate);
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.endsWith('/overview-missing-image.png')) return request.respond({ status: 404, body: '' });
      if (url.pathname.includes('/api/')) {
        let body = {};
        if (url.pathname.endsWith('/submit-quiz')) { submissions.push(JSON.parse(request.postData())); body = { correct: true }; }
        else if (url.pathname.endsWith('/announcements')) body = { announcements: empty ? [] : [
          { id: 'a1', title: 'International Travel Fellowship 2026', description: 'Explore this year’s programme, eligibility and upcoming mock sessions.', media: { type: 'image', src: '/web/exhibits/img-ct-001.png' } },
          { id: 'a2', title: 'Your next grand mock is here', kind: 'grand-mock', description: longAnnouncement },
          { id: 'a3', title: 'Clinical teaching update', description: 'Explore the latest learning resources.', media: { type: 'image', src: '/web/overview-missing-image.png' } }
        ] };
        else if (url.pathname.endsWith('/daily-quiz')) body = { quiz: empty ? null : { id: 'q1', question: 'A patient undergoes radical nephrectomy for renal cell carcinoma. Which pathological feature indicates invasion beyond the kidney?', topic: 'Renal oncology', options: ['Tumour confined to the renal cortex', 'Invasion into perinephric fat', 'Tumour size greater than 4 cm', 'Low nuclear grade'], correctIndex: 1, explanation: '**Correct.** Extension into perinephric fat indicates invasion beyond the kidney.' } };
        else if (url.pathname.endsWith('/exam-schedules')) body = { schedules: empty ? [] : schedules };
        else if (url.pathname.endsWith('/api/mocks')) body = { mocks: empty ? [] : mocks };
        else if (url.pathname.endsWith('/api/mocks/bladder')) body = { mock: mocks[1] };
        else if (url.pathname.endsWith('/me/progress')) { progressAuth.push(request.headers().authorization); body = { stats: { videosStarted: empty ? 0 : 3 }, continueWatching: empty ? [] : lessons }; }
        else if (url.pathname.endsWith('/me/video-progress')) body = { count: empty ? 0 : lessons.length, items: empty ? [] : lessons };
        else if (url.pathname.endsWith('/videos/library')) body = { sections: [] };
        else if (url.pathname.endsWith('/viva-cases')) body = { cases: empty ? [] : [{ id: 'v1', title: 'Renal oncology viva', specialty: 'Uro-oncology', difficulty: 'Intermediate' }] };
        else if (url.pathname.endsWith('/access')) body = { tier: currentCandidate.tier, activeCourseIds: currentCandidate.activeCourseIds, profile: { ...currentCandidate } };
        return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      }
      if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !url.protocol.startsWith('data')) return request.abort();
      return request.continue();
    });

    async function clearFocusAndHover() {
      await page.evaluate(() => document.activeElement?.blur());
      await page.mouse.move(0, 0);
    }
    async function assertNoOverflow(width) {
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert.ok(dimensions.scroll <= dimensions.viewport, `No horizontal overflow at ${width}: ${JSON.stringify(dimensions)}`);
    }
    async function loadOverview() {
      await page.goto(`${origin}/web`, { waitUntil: 'networkidle0', timeout: 120000 });
      await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
      await page.waitForFunction(() => document.body.innerText.includes('Chandradeep'));
    }

    await page.setViewport({ width: 1295, height: 1214 });
    await loadOverview();
    await page.waitForFunction(() => document.body.innerText.includes('Bladder cancer: staging'));
    assert.ok(progressAuth.length > 0 && progressAuth.every(value => value === 'Bearer fixture-token'), 'Learning history uses the signed-in account');
    assert.equal(await page.$$eval('.overview-lesson', nodes => nodes.length), 3, 'Backend continueWatching entries are normalized');
    assert.match(await page.$eval('#available-tests-heading', node => node.textContent), /^Mocks$/);
    assert.equal(await page.$$('.overview-test-row').then(nodes => nodes.length), 3);
    assert.equal(await page.$('.overview-test-table-heading, .overview-test-detail, .overview-test-mobile-meta, .overview-test-reattempt'), null);
    assert.deepEqual(await page.$$eval('.overview-test-row button', nodes => nodes.map(node => node.textContent.trim())), ['Start Mock', 'Start Mock', 'Start Mock']);
    assert.match(await page.$eval('.overview-viva-callout h2', node => node.textContent), /Practice with Urologics AI/);
    assert.equal(await page.$eval('.overview-viva-link', node => new URL(node.href).pathname), '/web/ai-viva/cases');

    // Two exams advance together on desktop, with outgoing content hidden from assistive technology.
    await page.waitForFunction(() => document.querySelector('.overview-exam-page:not(.is-previous)')?.children.length === 2);
    const firstExamPage = await page.$eval('.overview-exam-countdowns', node => node.dataset.examPage);
    await clearFocusAndHover();
    await page.waitForFunction(previous => document.querySelector('.overview-exam-countdowns').dataset.examPage !== previous, { timeout: 3200 }, firstExamPage);
    const examAnimation = await page.evaluate(() => ({ entering: getComputedStyle(document.querySelector('.overview-exam-page.is-entering')).animationName, outgoing: document.querySelector('.overview-exam-page.is-previous').getAttribute('aria-hidden'), count: document.querySelector('.overview-exam-page:not(.is-previous)').children.length }));
    assert.equal(examAnimation.entering, 'overview-exam-in');
    assert.equal(examAnimation.outgoing, 'true');
    assert.ok(examAnimation.count >= 1 && examAnimation.count <= 2);
    assert.match(await page.$eval('.overview-schedule-toggle', node => node.textContent), /See all/);
    await page.click('.overview-schedule-toggle');
    await page.waitForSelector('#overview-exam-dates');
    assert.equal(await page.$$eval('#overview-exam-dates > div', nodes => nodes.length), schedules.length);
    const expandedPage = await page.$eval('.overview-exam-countdowns', node => node.dataset.examPage);
    await delay(2200);
    assert.equal(await page.$eval('.overview-exam-countdowns', node => node.dataset.examPage), expandedPage, 'Expanded dates pause exam rotation');
    await page.click('.overview-schedule-toggle');
    await clearFocusAndHover();

    // Announcements rotate every three seconds, pause on hover, and resume when the pointer leaves.
    const initialTitle = await page.$eval('.overview-announcement-content h3', node => node.textContent);
    await page.waitForFunction(previous => document.querySelector('.overview-announcement-content h3').textContent !== previous, { timeout: 4200 }, initialTitle);
    await page.hover('.overview-announcements');
    await page.waitForFunction(() => document.querySelector('.overview-announcements').dataset.autoplay === 'paused');
    const hoveredTitle = await page.$eval('.overview-announcement-content h3', node => node.textContent);
    await delay(3250);
    assert.equal(await page.$eval('.overview-announcement-content h3', node => node.textContent), hoveredTitle, 'Hover pauses automatic transitions');
    await clearFocusAndHover();
    await page.waitForFunction(() => document.querySelector('.overview-announcements').dataset.autoplay === 'playing');
    await page.waitForFunction(previous => document.querySelector('.overview-announcement-content h3').textContent !== previous, { timeout: 4200 }, hoveredTitle);

    await page.setViewport({ width: 390, height: 844 });
    await page.tap('#announcements-heading');
    await page.waitForSelector('[aria-label="Resume announcements"]');
    const tappedTitle = await page.$eval('.overview-announcement-content h3', node => node.textContent);
    await clearFocusAndHover();
    await delay(3250);
    assert.equal(await page.$eval('.overview-announcement-content h3', node => node.textContent), tappedTitle, 'A tap pauses announcements until resumed');
    const cardHeights = [];
    for (const position of [1, 2, 3]) {
      await page.click(`[aria-label="Show announcement ${position}"]`);
      cardHeights.push(await page.$eval('.overview-announcements', node => node.getBoundingClientRect().height));
      if (position === 2) {
        assert.equal(await page.$('.overview-announcement-media'), null, 'Missing images render no media block');
        const scroll = await page.$eval('.overview-announcement-content', node => ({ total: node.scrollHeight, visible: node.clientHeight, overflow: getComputedStyle(node).overflowY, scrollbar: getComputedStyle(node).scrollbarWidth }));
        assert.ok(scroll.total > scroll.visible, 'Long announcement content scrolls inside the fixed card');
        assert.equal(scroll.overflow, 'auto');
        assert.equal(scroll.scrollbar, 'thin');
      }
      if (position === 3) await page.waitForSelector('.overview-announcement-media', { hidden: true });
      const dotsPosition = await page.evaluate(() => {
        const card = document.querySelector('.overview-announcements'), dots = card.querySelector('.overview-carousel-dots');
        return { directChild: dots.parentElement === card, bottomGap: card.getBoundingClientRect().bottom - dots.getBoundingClientRect().bottom };
      });
      assert.equal(dotsPosition.directChild, true);
      assert.ok(dotsPosition.bottomGap >= 12 && dotsPosition.bottomGap <= 24, 'Navigation dots stay pinned to the card bottom');
    }
    assert.ok(Math.max(...cardHeights) - Math.min(...cardHeights) < 1, 'All announcements retain the same card height');
    await page.click('[aria-label="Resume announcements"]');
    await clearFocusAndHover();
    await page.waitForFunction(() => document.querySelector('.overview-announcements').dataset.autoplay === 'playing');
    const resumedTitle = await page.$eval('.overview-announcement-content h3', node => node.textContent);
    await page.waitForFunction(previous => document.querySelector('.overview-announcement-content h3').textContent !== previous, { timeout: 4200 }, resumedTitle);
    await page.click('[aria-label="Show announcement 1"]');
    await page.click('.overview-announcement-media button');
    await page.waitForSelector('[role="dialog"]');
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role="dialog"]', { hidden: true });

    for (const width of [320, 375, 390, 768, 1024, 1295]) {
      await page.setViewport({ width, height: width < 768 ? 844 : 1000 });
      await assertNoOverflow(width);
      await page.waitForFunction(() => Math.abs(document.querySelector('header').getBoundingClientRect().top - (innerWidth < 640 ? 8 : 12)) < .25);
      const headerLayout = await page.evaluate(() => ({ bottom: document.querySelector('header').getBoundingClientRect().bottom, examTop: document.querySelector('.overview-exams').getBoundingClientRect().top }));
      assert.ok(headerLayout.bottom <= headerLayout.examTop + 1, `Header does not cover the exam strip at ${width}: ${JSON.stringify(headerLayout)}`);
      if (width < 768) await page.waitForFunction(() => document.querySelector('.overview-exam-page:not(.is-previous)').children.length === 1);
      if (width === 390 || width === 768 || width === 1295) await page.screenshot({ path: path.join(artifacts, width === 390 ? 'mobile.png' : width === 768 ? 'tablet.png' : 'desktop.png'), fullPage: true });
    }

    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.$$eval('.overview-bottom-nav a', nodes => nodes.length), 5);
    await page.select('[aria-label="Filter available tests"]', 'attended');
    assert.equal(await page.$$eval('.overview-test-row', nodes => nodes.length), 1);
    assert.equal(await page.$eval('.overview-test-row button', node => node.textContent.trim()), 'Start Mock');
    assert.doesNotMatch(await page.$eval('.overview-test-row', node => node.textContent), /Review Answers|Reattempt|questions| min/);
    await page.click('.overview-test-start');
    await page.waitForFunction(() => location.pathname.endsWith('/mocks/bladder/rules'));
    assert.ok(!page.url().includes('/result'), 'Start Mock opens a new attempt briefing, not review');
    await loadOverview();
    await page.select('[aria-label="Filter available tests"]', 'viva');
    await page.waitForFunction(() => document.querySelector('.overview-test-row')?.textContent.includes('Renal oncology viva'));
    await page.select('[aria-label="Filter available tests"]', 'all');
    await page.click('input[name="overview-daily-quiz"][value="1"]');
    await page.click('.overview-submit');
    await page.waitForFunction(() => document.body.innerText.includes('Correct answer.'));
    assert.deepEqual(submissions, [{ selectedIndex: 1 }]);
    assert.equal(await page.$eval('.overview-submit', node => node.disabled), true);
    await page.screenshot({ path: path.join(artifacts, 'mobile-quiz-result.png'), fullPage: true });

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => document.querySelector('header').getBoundingClientRect().top >= 0);
    await page.click('[aria-label="Toggle navigation"]');
    for (const button of await page.$$('[aria-label="Switch to dark mode"]')) {
      if (await button.isIntersectingViewport()) { await button.click(); break; }
    }
    await page.click('[aria-label="Toggle navigation"]');
    await page.waitForFunction(() => document.body.classList.contains('dark') && document.querySelectorAll('[aria-label="Switch to light mode"]').length === 2);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('header > div:last-child')).opacity === '0');
    for (const width of [320, 390, 1295]) {
      await page.setViewport({ width, height: width < 768 ? 844 : 1214 });
      await assertNoOverflow(`dark ${width}`);
      await page.screenshot({ path: path.join(artifacts, `${width < 768 ? `mobile-${width}` : 'desktop'}-dark.png`), fullPage: true });
    }

    empty = true;
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes("You're all caught up"));
    assert.equal(await page.$$('.overview-test-row').then(nodes => nodes.length), 0);
    await page.waitForSelector('.overview-learning-empty[data-learning-state="not-started"]');
    assert.equal(await page.$eval('.overview-learning-empty-action', node => node.textContent.trim()), 'Your courses');
    assert.equal(await page.$eval('.overview-learning-empty-action', node => new URL(node.href).pathname), '/web/courses');
    assert.ok(await page.$('svg.overview-learning-empty-art'), 'A learning illustration accompanies the empty state');
    await page.screenshot({ path: path.join(artifacts, 'empty-purchased.png'), fullPage: true });
    currentCandidate = { ...candidate, tier: 'free', activeCourseIds: [] };
    await page.evaluate(user => sessionStorage.setItem('overview-fixture-auth', JSON.stringify(user)), currentCandidate);
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('.overview-learning-empty[data-learning-state="explore"]');
    assert.equal(await page.$eval('.overview-learning-empty-action', node => node.textContent.trim()), 'Explore courses');
    assert.equal(await page.$eval('.overview-learning-empty-action', node => new URL(node.href).pathname), '/web/plans');
    assert.ok(await page.$('svg.overview-learning-empty-art'));
    await page.screenshot({ path: path.join(artifacts, 'empty-explore.png'), fullPage: true });

    await page.goto(`${origin}/web/courses`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForSelector('[aria-label="Search courses and lessons"]');
    for (const width of [390, 1295]) {
      await page.setViewport({ width, height: width < 768 ? 844 : 1000 });
      await assertNoOverflow(`courses ${width}`);
      const searchWidth = await page.$eval('[aria-label="Search courses and lessons"]', node => {
        const card = node.parentElement.parentElement, style = getComputedStyle(card);
        return { actual: node.getBoundingClientRect().width, available: card.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) };
      });
      assert.ok(Math.abs(searchWidth.actual - searchWidth.available) < 1, `Courses search fills available width at ${width}: ${JSON.stringify(searchWidth)}`);
    }
    await page.type('[aria-label="Search courses and lessons"]', 'renal');
    await page.waitForSelector('[aria-label="Clear course search"]');
    assert.match(await page.$eval('main', node => node.textContent), /No courses or lessons match "renal"/);
    await page.click('[aria-label="Clear course search"]');
    assert.equal(await page.$eval('[aria-label="Search courses and lessons"]', node => node.value), '');
    assert.equal(await page.$('[aria-label="Clear course search"]'), null);
    assert.deepEqual(errors, []);
    console.log('Overview checks passed: responsive layouts and themes; announcement autoplay, pause/resume, fixed height, scrolling, missing/broken images and preview; paired exam rotation and all dates; simplified mocks and new attempt route; quiz; account learning and purchased/free empty states; branded AI link; full-width courses search.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

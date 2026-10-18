const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

(async () => {
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true, args: ['--no-sandbox'], timeout: 60000 });
  const origin = process.env.ACCOUNT_ORIGIN || 'http://127.0.0.1:3028';
  const artifacts = path.resolve('.viva-test-artifacts/account');
  fs.mkdirSync(artifacts, { recursive: true });
  const errors = [], updates = [], uploads = [], resets = [];
  let failPurchases = false, failAccess = false, failSave = false, empty = false, accessReads = 0;
  const profile = { uid: 'account-test', name: 'Alex Morgan', email: 'alex@example.test', phone: '+44 7700 900123', medicalInstitution: 'Royal College of Surgeons', activePlanStatus: 'active', planExpiresAt: '2027-03-18T23:59:59Z', activeCourses: [{ id: 'urology', title: 'FRCS Urology Core Curriculum' }, { id: 'viva', title: 'Clinical Viva Preparation' }] };
  const access = () => ({ tier: 'paid', profile, plan: { name: 'FRCS Urology Complete', categoryName: 'Exam preparation' }, entitlements: { courseIds: ['urology', 'viva'] }, vivaCredit: { totalMinutes: 120, usedMinutes: 35, remainingMinutes: 85, percentRemaining: 70.83 } });
  const purchases = ['COMPLETED', 'PENDING', 'REFUNDED', 'FAILED', 'CANCELLED', 'REVERSED', 'CAPTURED'].map((status, index) => ({ id: `purchase-${index}`, courseNameSnapshot: 'FRCS Urology Core Curriculum', planNameSnapshot: index % 2 ? '3 months' : '6 months', paidAmount: 149 + index, currency: 'GBP', status, paypalOrderId: `ORDER-${index}`, purchasedAt: `2026-10-${17 - index}T12:00:00Z`, accessEndsAt: '2027-03-18T23:59:59Z' }));
  try {
    const page = await browser.newPage();
    await page.emulateTimezone('Asia/Kolkata');
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(30000);
    const authScript = await page.evaluateOnNewDocument(() => localStorage.setItem('urologics-testing-zone-auth', JSON.stringify({ uid: 'account-test', name: 'Alex Morgan', email: 'alex@example.test', idToken: 'fixture', refreshToken: 'fixture', expiresAt: Date.now() + 3600000, tier: 'paid', activeCourseIds: [] })));
    await page.setViewport({ width: 1440, height: 1100 });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/')) {
        let payload = {}, status = 200;
        if (url.pathname.endsWith('/access')) {
          accessReads++;
          if (failAccess && accessReads > 1) { status = 503; payload = { error: 'Access unavailable' }; }
          else payload = empty ? { tier: 'free', profile: { ...profile, activePlanStatus: null, planExpiresAt: null, activeCourses: [] }, plan: null, entitlements: {}, vivaCredit: null } : access();
        } else if (url.pathname.endsWith('/purchases')) {
          if (failPurchases) { status = 503; payload = { error: 'Purchases unavailable' }; }
          else payload = { purchases: empty ? [] : purchases };
        } else if (url.pathname.endsWith('/cloudinary-upload')) {
          uploads.push(request.postData());
          payload = { url: '/web/logo.png' };
        } else if (url.pathname.endsWith('/profile') && request.method() === 'PATCH') {
          const update = JSON.parse(request.postData()); updates.push(update);
          if (failSave) { status = 503; payload = { error: 'Your changes could not be saved. Please try again.' }; }
          else { Object.assign(profile, update); payload = { profile }; }
        }
        return request.respond({ status, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (url.hostname === 'identitytoolkit.googleapis.com' && url.pathname.endsWith('/accounts:sendOobCode')) {
        if (request.method() === 'POST') resets.push(JSON.parse(request.postData()));
        return request.respond({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, contentType: 'application/json', body: '{}' });
      }
      if (!['localhost', '127.0.0.1'].includes(url.hostname) && !url.protocol.startsWith('data') && !url.protocol.startsWith('blob')) return request.abort();
      return request.continue();
    });
    async function clickButton(label, container = 'body') {
      for (const button of await page.$$(`${container} button`)) {
        if ((await button.evaluate(node => node.textContent.trim())) === label) { await button.click(); return; }
      }
      throw new Error(`Button not found: ${label}`);
    }
    async function replace(selector, value) {
      await page.focus(selector);
      await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
      await page.keyboard.type(value);
    }
    const ready = () => page.waitForFunction(() => document.body.innerText.includes('FRCS Urology Complete') && document.querySelector('.account-purchase-table tbody tr'));
    async function capture(name) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.mouse.move(0, 0);
      await page.waitForFunction(() => {
        const header = document.querySelector('header');
        const button = document.querySelector('.account-identity .account-button');
        const panel = document.querySelector('.account-panel');
        return window.scrollY === 0 && header.getBoundingClientRect().top >= 0 && header.getBoundingClientRect().top < 20 && Number(getComputedStyle(header).opacity) === 1
          && (!button || getComputedStyle(button).backgroundColor === getComputedStyle(panel).backgroundColor);
      });
      await page.screenshot({ path: path.join(artifacts, name), fullPage: true });
    }

    await page.goto(`${origin}/web/user`, { waitUntil: 'networkidle0', timeout: 120000 });
    await ready();
    assert.match(await page.$eval('.account-plan-details', node => node.innerText), /19 Mar 2027/);
    assert.equal(await page.$eval('[role="progressbar"]', node => node.getAttribute('aria-valuenow')), '70.83');
    assert.equal(await page.$$eval('.account-purchase-table tbody tr', rows => rows.length), 3);
    assert.match(await page.$eval('.account-purchase-table', node => node.innerText), /Paid[\s\S]*Pending[\s\S]*Refunded/);
    await clickButton('View all purchases (7)');
    assert.equal(await page.$$eval('.account-purchase-table tbody tr', rows => rows.length), 7);
    await page.select('#purchase-status', 'failed');
    assert.equal(await page.$$eval('.account-purchase-table tbody tr', rows => rows.length), 1);
    assert.match(await page.$eval('.account-purchase-table', node => node.innerText), /Failed/);
    await page.select('#purchase-status', 'refunded');
    assert.match(await page.$eval('.account-purchase-table', node => node.innerText), /Refunded/);
    await page.select('#purchase-status', 'all');
    await page.click('.account-purchases-desktop details summary');
    assert.match(await page.$eval('.account-purchases-desktop details[open]', node => node.innerText), /ORDER-0/);
    await page.click('.account-purchases-desktop details summary');
    await page.click('.account-courses summary');
    assert.equal(await page.$$eval('.account-courses a', nodes => nodes.length), 2);
    await page.click('.account-courses summary');

    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewport({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No page overflow at ${width}px`);
      await page.hover('.account-panel');
      assert.equal(await page.$eval('.account-panel', node => getComputedStyle(node).transform), 'none', 'Static panels do not lift on hover');
      await capture(`account-${width}.png`);
    }
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await capture('account-mobile-dark.png');
    await page.setViewport({ width: 1440, height: 1100 });
    await capture('account-desktop-dark.png');
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    await clickButton('Edit profile');
    await page.waitForSelector('form[aria-label="Edit profile"]');
    assert.equal(await page.$eval('#account-institution', node => document.activeElement === node), true);
    assert.equal(await page.$eval('button[type="submit"]', node => node.disabled), true);
    await replace('#account-institution', 'Discard this change');
    await clickButton('Cancel', '#personal-details');
    assert.equal(updates.length, 0);
    assert.match(await page.$eval('#personal-details', node => node.innerText), /Royal College/);
    await clickButton('Edit details');
    await replace('#account-institution', 'University Hospital');
    failSave = true;
    await page.focus('#account-institution');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#personal-details [role="alert"]');
    assert.equal(await page.$eval('#account-institution', node => node.value), 'University Hospital', 'Failed saves retain edits');
    failSave = false;
    await clickButton('Save changes');
    await page.waitForFunction(() => !document.querySelector('form[aria-label="Edit profile"]') && document.querySelector('#personal-details')?.innerText.includes('University Hospital'));
    assert.equal(updates.length, 2);
    assert.equal(updates[1].medicalInstitution, 'University Hospital');
    assert.match(await page.$eval('#personal-details [role="status"]', node => node.innerText), /saved/);

    await clickButton('Edit details');
    const invalid = path.join(artifacts, 'not-an-image.txt');
    fs.writeFileSync(invalid, 'Not an image');
    await (await page.$('input[type="file"]')).uploadFile(invalid);
    await page.waitForSelector('#account-photo-error');
    assert.equal(await page.$eval('button[type="submit"]', node => node.disabled), true);
    await (await page.$('input[type="file"]')).uploadFile(path.resolve('public/logo.png'));
    await page.waitForFunction(() => !document.querySelector('#account-photo-error'));
    await page.setViewport({ width: 390, height: 844 });
    await capture('account-edit-mobile.png');
    await clickButton('Save changes');
    await page.waitForFunction(() => !document.querySelector('form[aria-label="Edit profile"]'));
    assert.equal(uploads.length, 1);
    assert.equal(updates[2].profileImageUrl, '/web/logo.png');

    await clickButton('Send reset email');
    await page.waitForFunction(() => document.querySelector('#account-security-heading')?.parentElement.parentElement.innerText.includes('Password reset email sent'));
    assert.deepEqual(resets, [{ requestType: 'PASSWORD_RESET', email: 'alex@example.test' }]);

    failPurchases = true;
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Your purchases couldn’t be loaded.'));
    assert.match(await page.$eval('.account-access-grid', node => node.innerText), /FRCS Urology Complete[\s\S]*85/);
    assert.equal(await page.$('.account-purchases-empty'), null, 'Purchase errors do not show empty history');
    failPurchases = false;
    await clickButton('Try again');
    await page.waitForSelector('.account-purchases-mobile article');

    failAccess = true; accessReads = 0;
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Your plan details couldn’t be loaded.'));
    assert.equal(await page.$('.account-credit-value'), null, 'Access errors never show zero credits');
    assert.doesNotMatch(await page.$eval('.account-access-grid', node => node.innerText), /No plan enrolled/);
    assert.notEqual(await page.$('.account-purchases-mobile article'), null, 'Purchases remain available when access fails');
    failAccess = false;
    await clickButton('Try again');
    await page.waitForSelector('.account-credit-value');

    empty = true;
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('.account-purchases-empty');
    assert.match(await page.$eval('.account-access-grid', node => node.innerText), /No plan enrolled/);
    assert.match(await page.$eval('.account-credit-value', node => node.innerText), /0/);
    assert.ok(await page.$eval('.account-purchases-empty', node => node.getBoundingClientRect().height < 100));
    await capture('account-empty-mobile.png');

    await page.removeScriptToEvaluateOnNewDocument(authScript.identifier);
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('.account-login');
    assert.equal(await page.$('.account-identity'), null);
    assert.deepEqual(errors, []);
    console.log('Passed: responsive account themes, plan/expiry/credits, payment statuses/filter/expansion, editing/cancel/save retry/upload, intercepted reset email, independent data failures, retry, empty and signed-out states.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

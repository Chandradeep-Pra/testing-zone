import assert from 'node:assert/strict';
const origin = process.env.DEPLOYMENT_TEST_ORIGIN || 'http://127.0.0.1:8080';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Smoke tests must run locally');
const request = (path, init) => fetch(`${origin}${path}`, init);
for (const path of ['/web', '/web/login', '/web/courses', '/web/logo.png', '/web/audio-processor.js', '/web/exhibits/img-ct-001.png', '/web/favicon.ico']) {
  const response = await request(path);
  assert.equal(response.status, 200, path);
  console.log(`PASS ${path}`);
}
const html = await (await request('/web/login')).text();
assert.ok(html.includes('/web/logo.png'), 'metadata icons include basePath');
const scripts = [...html.matchAll(/src="([^\"]*\/_next\/[^\"]+)"/g)].map(match => match[1].replaceAll('&amp;', '&'));
assert.ok(scripts.length);
for (const path of new Set(scripts)) {
  assert.ok(path.startsWith('/web/_next/'), path);
  assert.equal((await request(path)).status, 200, path);
}
console.log('PASS compiled script assets');
const image = await request('/web/_next/image?url=%2Fweb%2Flogo.png&w=128&q=75');
assert.equal(image.status, 200, 'optimized image');
console.log('PASS optimized image');
const redirect = await request('/web/ai-viva/session', {redirect: 'manual'});
if (redirect.status === 307 || redirect.status === 308) {
  assert.equal(redirect.headers.get('location'), '/web/ai-viva/cases');
} else {
  const body = await redirect.text();
  assert.match(body, /url=\/web\/ai-viva\/cases/);
}
console.log('PASS viva redirect');
assert.equal((await request('/web/api/urologics/access')).status, 401);
assert.equal((await request('/api/urologics/access')).status, 404);
console.log('PASS API routing boundary');
const session = await request('/web/api/urologics/session', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({idToken:'deployment-smoke-invalid-token'})});
assert.equal(session.status, 200);
for (const cookie of [session.headers.get('set-cookie'), (await request('/web/api/urologics/session',{method:'DELETE'})).headers.get('set-cookie')]) {
  assert.match(cookie, /^__session=/);
  assert.match(cookie, /Path=\/(?:;|$)/i);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=lax/i);
}
console.log('PASS production cookie scope and flags (synthetic token; not an auth verification)');

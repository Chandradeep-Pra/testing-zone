const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadAuth(fetch) {
  const stored = new Map();
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('lib/urologics-auth.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, require: () => ({ appPath: path => path }), fetch, URLSearchParams,
    process: { env: { NEXT_PUBLIC_FIREBASE_API_KEY: 'test-key' } },
    window: { localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) } },
  });
  return { auth: exports, stored };
}

const user = () => ({ uid: 'one', email: 'one@example.test', name: 'One', idToken: 'valid', refreshToken: 'refresh', expiresAt: Date.now() + 600_000 });
const profile = () => Response.json({ tier: 'paid', profile: { uid: 'one', email: 'one@example.test', name: 'One' } });
const refreshed = () => Response.json({ user_id: 'one', id_token: 'new', refresh_token: 'new-refresh', expires_in: '3600' });

test('valid tokens reload access without Firebase refresh and preserve expiry', async () => {
  const calls = [];
  const { auth } = loadAuth(async url => { calls.push(url); return profile(); });
  const input = user();
  const result = await auth.refreshStoredAuth(input);
  assert.equal(result.idToken, 'valid');
  assert.equal(result.tier, 'paid');
  assert.equal(result.expiresAt, input.expiresAt);
  assert.deepEqual(calls, ['/api/urologics/access']);
});

test('concurrent expired restores share one refresh and access request', async () => {
  const calls = [];
  const { auth } = loadAuth(async url => { calls.push(url); return url.includes('securetoken') ? refreshed() : profile(); });
  const input = { ...user(), expiresAt: 0 };
  const [first, second] = await Promise.all([auth.refreshStoredAuth(input), auth.refreshStoredAuth(input)]);
  assert.equal(first, second);
  assert.equal(first.idToken, 'new');
  assert.equal(calls.length, 2);
});

test('401 refreshes once and retries access once', async () => {
  let accessCalls = 0;
  let refreshCalls = 0;
  const { auth } = loadAuth(async url => {
    if (url.includes('securetoken')) { refreshCalls++; return refreshed(); }
    return ++accessCalls === 1 ? new Response('{}', { status: 401 }) : profile();
  });
  assert.equal((await auth.refreshStoredAuth(user())).idToken, 'new');
  assert.equal(accessCalls, 2);
  assert.equal(refreshCalls, 1);
});

test('repeated 401 stops without an infinite refresh loop', async () => {
  let calls = 0;
  const { auth } = loadAuth(async url => { calls++; return url.includes('securetoken') ? refreshed() : new Response('{}', { status: 401 }); });
  await assert.rejects(auth.refreshStoredAuth(user()));
  assert.equal(calls, 3);
});

test('access service failure does not silently downgrade a paid account', async () => {
  const { auth, stored } = loadAuth(async () => new Response('{}', { status: 503 }));
  await assert.rejects(auth.refreshStoredAuth(user()));
  assert.equal(stored.size, 0);
});

test('logout prevents an outstanding restore from writing credentials back', async () => {
  let complete;
  const { auth, stored } = loadAuth(() => new Promise(resolve => { complete = resolve; }));
  const pending = auth.refreshStoredAuth(user());
  auth.clearStoredAuth();
  complete(profile());
  await assert.rejects(pending, /Account changed/);
  assert.equal(stored.has('urologics-testing-zone-auth'), false);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, modules, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, console, AbortSignal, ...globals, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
    return modules[name];
  } });
  return exports;
}

for (const signedIn of [false, true]) test(`${signedIn ? 'signed-in' : 'public'} web feedback proxy fixes the platform and forwards the correct identity`, async () => {
  const requests = [];
  const route = load('app/api/experience-feedback/route.ts', {
    'next/server': { NextResponse: { json: (data, init) => ({ data, ...init }) } },
    '@/lib/urologics-api': { getUrologicsApiUrl: path => `https://upstream.test${path}` },
  }, { fetch: async (url, options) => {
    requests.push({ url, options });
    return { status: 200, json: async () => ({ success: true }) };
  } });
  const result = await route.POST({ json: async () => ({ kind: 'mock', platform: 'mobile' }), cookies: { get: () => signedIn ? { value: 'verified-token' } : undefined } });
  assert.equal(result.data.success, true);
  assert.equal(JSON.parse(requests[0].options.body).platform, 'web');
  assert.equal(requests[0].url, `https://upstream.test/api/${signedIn ? 'app' : 'public'}/experience-feedback`);
  assert.equal(requests[0].options.headers.Authorization, signedIn ? 'Bearer verified-token' : undefined);
  assert.equal(result.headers['Cache-Control'], 'no-store');
});

test('feedback proxy keeps upstream validation failures visible and handles outages', async () => {
  for (const offline of [false, true]) {
    const route = load('app/api/experience-feedback/route.ts', {
      'next/server': { NextResponse: { json: (data, init) => ({ data, ...init }) } },
      '@/lib/urologics-api': { getUrologicsApiUrl: path => path },
    }, { fetch: async () => {
      if (offline) throw new Error('Network unavailable');
      return { status: 400, json: async () => ({ error: 'Select a valid rating.' }) };
    } });
    const result = await route.POST({ json: async () => ({}), cookies: { get: () => undefined } });
    assert.equal(result.status, offline ? 502 : 400);
    assert.match(result.data.error, offline ? /retry or skip/ : /valid rating/);
  }
});

function gateFixture() {
  const states = [], effects = [];
  const hooks = load('lib/use-feedback-step.ts', {
    react: {
      useState: initial => { const slot = { value: initial }; states.push(slot); return [initial, next => { slot.value = typeof next === 'function' ? next(slot.value) : next; }]; },
      useRef: current => ({ current }), useCallback: fn => fn,
      useEffect: fn => effects.push(fn()),
    },
  }, { crypto: { randomUUID: () => 'feedback-session-uuid' } });
  const gate = hooks.useFeedbackStep();
  return { gate, states, unmount: () => effects.forEach(fn => fn?.()) };
}

test('viva completion waits for feedback, and completing twice never generates a second report', async () => {
  const { gate, states } = gateFixture();
  let reports = 0;
  const completion = (async () => { if (await gate.request()) reports++; })();
  await Promise.resolve();
  assert.equal(reports, 0, 'Scoring must not start while the feedback screen is open');
  assert.equal(states[0].value, true);
  gate.complete(); gate.complete();
  await completion;
  assert.equal(reports, 1);
  assert.equal(states[0].value, false);
  assert.equal(await gate.request(), true, 'Retrying a failed report must not ask for feedback again');
});

test('leaving a viva feedback screen cancels pending report generation', async () => {
  const { gate, unmount } = gateFixture();
  const completion = gate.request();
  unmount();
  assert.equal(await completion, false);
  assert.equal(await gate.request(), false, 'A slow socket close cannot open feedback after unmount');
});

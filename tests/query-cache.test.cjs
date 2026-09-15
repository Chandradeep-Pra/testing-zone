const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { QueryClient } = require('@tanstack/react-query');

function setup(fetch, auth = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('lib/client/urologicsQuery.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, fetch, AbortController, setTimeout, clearTimeout,
    require: name => name === '@/lib/app-path' ? { appPath: path => `/web${path}` } : { getStoredAuth: () => null, ...auth },
  });
  return exports;
}

test('simultaneous reads deduplicate and fresh revisits reuse the result', async () => {
  let calls = 0;
  const api = setup(async () => { calls++; return Response.json({ sections: [] }); });
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } });
  const options = { queryKey: api.accountQueryKey('one', '/library'), queryFn: ({ signal }) => api.readUrologicsJson('/library', null, signal) };
  await Promise.all([client.fetchQuery(options), client.fetchQuery(options)]);
  await client.fetchQuery(options);
  assert.equal(calls, 1);
  client.clear();
});

test('account keys isolate data and clearing removes cached private results', async () => {
  const api = setup(() => {});
  const client = new QueryClient();
  client.setQueryData(api.accountQueryKey('one', '/library'), { private: 'one' });
  assert.equal(client.getQueryData(api.accountQueryKey('two', '/library')), undefined);
  assert.equal(client.getQueryData(api.accountQueryKey(undefined, '/library')), undefined);
  client.clear();
  assert.equal(client.getQueryData(api.accountQueryKey('one', '/library')), undefined);
});

test('401 retries once with refreshed auth, without a guest request', async () => {
  const tokens = [];
  const user = { uid: 'one', idToken: 'old', expiresAt: Date.now() + 600_000 };
  let refreshes = 0;
  const api = setup(async (_, init) => {
    tokens.push(init.headers.Authorization);
    return tokens.length === 1 ? Response.json({}, { status: 401 }) : Response.json({ ok: true });
  }, { refreshStoredAuth: async () => { refreshes++; return { ...user, idToken: 'new' }; } });
  assert.deepEqual(await api.readUrologicsJson('/library', user), { ok: true });
  assert.deepEqual(tokens, ['Bearer old', 'Bearer new']);
  assert.equal(refreshes, 1);
});

test('cancellation aborts the actual upstream request', async () => {
  let observed;
  const api = setup((_, init) => {
    observed = init.signal;
    return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError'))));
  });
  const controller = new AbortController();
  const pending = api.readUrologicsJson('/library', null, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(observed.aborted, true);
});

test('protected errors never retry as ordinary transient reads', () => {
  const api = setup(() => {});
  assert.equal(api.retryRead(0, new api.ApiReadError('locked', 403)), false);
  assert.equal(api.retryRead(0, new api.ApiReadError('expired', 401)), false);
  assert.equal(api.retryRead(0, new api.ApiReadError('unavailable', 503)), true);
  assert.equal(api.retryRead(2, new api.ApiReadError('unavailable', 503)), false);
});

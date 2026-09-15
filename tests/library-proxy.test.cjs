const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(fetch, env = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('lib/urologics-api.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, fetch, URL, Headers, Response, process: { env } });
  return exports;
}

test('library query, auth, cancellation, timing and status survive the proxy', async () => {
  let calls = 0;
  const request = new Request('https://student.test/api/library?sectionId=one&includeVideos=0&cursor=next', { headers: { authorization: 'Bearer token', 'x-request-id': 'trace-1' } });
  const api = setup(async (url, init) => {
    calls++;
    assert.equal(url.search, '?sectionId=one&includeVideos=0&cursor=next');
    assert.equal(init.headers.get('authorization'), 'Bearer token');
    assert.equal(init.headers.get('x-request-id'), 'trace-1');
    assert.equal(init.signal, request.signal);
    return Response.json({ error: 'expired' }, { status: 401, headers: { 'Server-Timing': 'api;dur=12', 'X-Request-ID': 'trace-1', 'Cache-Control': 'public, max-age=60' } });
  });
  const response = await api.forwardUrologicsJson(request, '/api/app/videos/library');
  assert.equal(response.status, 401);
  assert.equal(calls, 1);
  assert.equal(response.headers.get('server-timing'), 'api;dur=12');
  assert.equal(response.headers.get('x-request-id'), 'trace-1');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(await response.json(), { error: 'expired' });
});

test('public catalog retains its upstream cache policy', async () => {
  const api = setup(async () => Response.json({ sections: [] }, { headers: { 'Cache-Control': 'public, s-maxage=300' } }));
  const response = await api.forwardUrologicsJson(new Request('https://student.test/api/library'), '/api/public/videos/library');
  assert.equal(response.headers.get('cache-control'), 'public, s-maxage=300');
});

test('unconfigured local development never defaults to the production backend', () => {
  assert.equal(setup(() => {}).getUrologicsApiUrl('/api/app/access'), 'http://127.0.0.1:3000/api/app/access');
  assert.equal(setup(() => {}, { NODE_ENV: 'production' }).getUrologicsApiUrl('/api/app/access'), 'https://urologics.co.uk/api/app/access');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, globals = {}, overrides = {}) {
  const cache = new Map();
  function moduleAt(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(source, { exports, console, Response, Date, ...globals, require: (name) => {
      if (overrides[name]) return overrides[name];
      const target = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(filename), name);
      return moduleAt(target + '.ts');
    } });
    return exports;
  }
  return moduleAt(file);
}
const ranking = load('lib/mock-ranking.ts');
const rows = [
  { email: ' A@example.test ', name: 'A', marks: 10, submittedAt: '2026-10-15T10:00:00Z' },
  { candidate: { email: 'a@example.test', name: 'A' }, marks: 0, submittedAt: '2026-10-14T10:00:00Z' },
  { email: 'b@example.test', name: 'B', marks: 5, submittedAt: '2026-10-14T11:00:00Z' },
];

test('a higher reattempt never replaces the first score, including zero', () => {
  const result = ranking.firstAttemptRankings({ results: rows });
  assert.equal(result.length, 2);
  assert.equal(result[0].email, 'b@example.test');
  assert.equal(result[1].email, 'a@example.test');
  assert.equal(result[1].marks, 0);
  assert.equal(result[1].rank, 2);
});

test('explicit reattempts are excluded and embedded first attempts use first score fields', () => {
  const result = ranking.firstAttemptRankings([
    { email: 'a@test', marks: 9, isFirstAttempt: false, attemptNumber: 2, firstAttempt: { score: 2, createdAt: '2026-10-01' } },
    { email: 'b@test', marks: 5, attemptNumber: 1 },
    { email: 'c@test', marks: 10, attemptNumber: 3 },
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0].email, 'b@test');
  assert.equal(result[1].marks, 2);
});

test('unknown dates do not displace dated first attempts; distinct emails do not merge', () => {
  const result = ranking.firstAttemptRankings([
    { email: 'a@test', name: 'Same name', marks: 8 },
    { email: 'a@test', name: 'Same name', marks: 3, createdAt: '2026-10-01' },
    { email: 'b@test', name: 'Same name', marks: 7 },
  ]);
  assert.equal(result.length, 2);
  assert.equal(result.find(row => row.email === 'a@test').marks, 3);
});

test('already-ranked unique upstream rows preserve authoritative order', () => {
  const result = ranking.firstAttemptRankings({ results: [{ rank: 2, email: 'b@test', marks: 5 }, { rank: 1, email: 'a@test', marks: 5 }] });
  assert.equal(result[0].email, 'a@test');
  assert.equal(result[1].rank, 2);
  const tied = ranking.firstAttemptRankings([{ rank: 1, email: 'a@test', marks: 5 }, { rank: 1, email: 'b@test', marks: 5 }]);
  assert.equal(tied[0].rank, 1);
  assert.equal(tied[1].rank, 1);
});

test('percentile counts lower first-attempt scores and gives equal scores equal values', () => {
  const scores = [{ marks: 10 }, { marks: 8 }, { marks: 8 }, { marks: 0 }];
  assert.equal(ranking.mockPercentile(8, scores), 25);
  assert.equal(ranking.mockPercentile(10, scores), 75);
  assert.equal(ranking.mockPercentile(0, scores), 0);
  assert.equal(ranking.mockPercentile(0, []), 0);
});

test('effective rank compares the current score without changing first-attempt ranks', () => {
  const leaderboard = ranking.firstAttemptRankings([
    { email: 'a@test', marks: 10, attemptNumber: 1 },
    { email: 'b@test', marks: 5, attemptNumber: 1 },
    { email: 'me@test', marks: 0, attemptNumber: 1 },
    { email: 'me@test', marks: 12, attemptNumber: 2 },
  ]);
  const before = JSON.stringify(leaderboard);
  const others = leaderboard.filter(row => row.email !== 'me@test');
  assert.equal(ranking.mockEffectiveRank(12, others), 1);
  assert.equal(ranking.mockEffectiveRank(5, others), 2, 'Equal scores share an effective position');
  assert.equal(ranking.mockEffectiveRank(0, others), 3);
  assert.equal(ranking.mockEffectiveRank(0, []), 1, 'The only attendee has effective rank one');
  assert.equal(ranking.mockEffectiveRank(NaN, others), null);
  assert.equal(ranking.mockEffectiveRank(-1, others), null);
  assert.equal(JSON.stringify(leaderboard), before);
  assert.equal(leaderboard.find(row => row.email === 'me@test').rank, 3);
  assert.equal(leaderboard.find(row => row.email === 'me@test').marks, 0);
});

test('hidden accounts are removed from upstream ranks, podium, counts and percentiles', () => {
  const result = ranking.firstAttemptRankings({ results: [
    { rank: 1, email: ' UROLOGOICS.ORG@gmail.com ', marks: 20 },
    { rank: 2, email: 'a@test', marks: 12, submittedAt: '2026-10-16T10:00:00Z' },
    { rank: 3, candidate: { email: 'chandradeepp611@gmail.com' }, marks: 11 },
    { rank: 4, email: 'b@test', marks: 12, submittedAt: '2026-10-16T09:00:00Z' },
    { rank: 5, email: 'ankitgoel042@gmail.com', marks: 8 },
    { rank: 6, email: 'c@test', marks: 5 },
  ] });
  // Keep upstream tie ordering, while assigning consecutive visible ranks.
  assert.deepEqual(Array.from(result, row => [row.email, row.rank]), [['a@test', 1], ['b@test', 2], ['c@test', 3]]);
  assert.equal(result.slice(0, 3).length, 3);
  assert.equal(ranking.mockPercentile(12, result), 33.3);
  assert.deepEqual(Array.from(ranking.firstAttemptRankings(result), row => row.rank), [1, 2, 3]);
});

test('raw fallback attempts exclude hidden accounts before choosing the first score', () => {
  const result = ranking.firstAttemptRankings({ mock: { attempts: [
    { candidate: { name: 'Hidden', email: 'ankitgoel042@gmail.com' }, marks: 20 },
    { email: 'a@test', marks: 1, createdAt: '2026-10-15' },
    { email: 'a@test', marks: 19, createdAt: '2026-10-16' },
  ] } });
  assert.equal(result.length, 1);
  assert.equal(result[0].marks, 1);
  assert.equal(result[0].rank, 1);
  assert.equal(ranking.firstAttemptRankings([{ email: 'ankitgoel042@gmail.com', marks: 20 }]).length, 0);
});

test('profile photos survive legacy payload shapes and whitespace image fields', () => {
  const result = ranking.firstAttemptRankings([
    { email: 'a@test', marks: 2, candidate: { image: ' ', profileImageUrl: ' https://photos.test/a.jpg ' } },
    { email: 'b@test', marks: 1, profileImageUrl: 'https://photos.test/b.jpg' },
    { email: 'c@test', marks: 0, photoURL: 'https://photos.test/c.jpg' },
  ]);
  assert.deepEqual(Array.from(result, row => row.userImage), ['https://photos.test/a.jpg', 'https://photos.test/b.jpg', 'https://photos.test/c.jpg']);
});

function session() {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  return { values, api: load('lib/mock-session.ts', { window: {}, localStorage: storage, sessionStorage: storage }) };
}

test('latest completed score is account-scoped and survives a fresh session', () => {
  const { api } = session();
  api.saveCompletedMockAttempt('one', { candidateEmail: ' A@test ', marks: 0, totalQuestions: 2, answers: { q1: 1 }, submittedAt: '2026-10-15' });
  assert.equal(api.readCompletedMockAttempt('one', 'a@test').marks, 0);
  assert.equal(api.readCompletedMockAttempt('one', 'b@test'), null);
  api.startFreshMockSession('one');
  assert.equal(api.readCompletedMockAttempt('one', 'a@test').marks, 0);
});

test('latest local completion wins over first attempt; newer server completion wins over cache', () => {
  const { api } = session();
  const cached = { candidateEmail: 'a@test', marks: 2, totalQuestions: 2, answers: { q1: 0, q2: 0 }, submittedAt: '2026-10-15' };
  const first = { questions: [1, 2], userAttempt: { marks: 0, answers: { q1: 1 }, submittedAt: '2026-10-14' } };
  assert.equal(api.resolveMockAttempt(first, cached).marks, 2);
  assert.equal(api.resolveMockAttempt({ ...first, latestAttempt: { marks: 1, totalQuestions: 2, submittedAt: '2026-10-16' } }, cached).marks, 1);
  assert.equal(api.resolveMockAttempt(first, null).marks, 0);
});

test('server history is filtered to the candidate before selecting the latest attempt', () => {
  const { api } = session();
  const result = api.resolveMockAttempt({ questions: [1, 2], attempts: [
    { candidate: { email: 'a@test' }, marks: 0, submittedAt: '2026-10-14' },
    { candidate: { email: 'a@test' }, marks: 1, submittedAt: '2026-10-15' },
    { candidate: { email: 'b@test' }, marks: 2, submittedAt: '2026-10-16' },
  ] }, null, 'a@test');
  assert.equal(result.marks, 1);
});

test('corrupt cached scores and another candidate verification cannot override the signed-in identity', () => {
  const { api, values } = session();
  values.set('mockUser', JSON.stringify({ email: 'stale@test' }));
  assert.equal(api.getMockCandidateEmail('current@test'), 'current@test');
  values.set('mock-one-latest-attempt:a%40test', JSON.stringify({ candidateEmail: 'a@test', marks: 10, totalQuestions: 2, answers: {}, submittedAt: '2026-10-15' }));
  assert.equal(api.readCompletedMockAttempt('one', 'a@test'), null);
});

for (const visibility of ['app', 'public']) test(`${visibility} results proxy applies the same first-attempt policy`, async () => {
  const file = visibility === 'app' ? 'app/api/mocks/[id]/results/route.ts' : 'app/api/public/mocks/[id]/results/route.ts';
  const route = load(file, { fetch: async () => Response.json({ mock: { title: 'Mock' }, results: [
    ...rows, { email: 'chandradeepp611@gmail.com', marks: 20 },
  ] }) }, {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/urologics-api': { getUrologicsApiUrl: value => `https://upstream.test${value}` },
  });
  const response = await route.GET({ cookies: { get: () => ({ value: 'fixture' }) } }, { params: Promise.resolve({ id: 'one' }) });
  const payload = await response.json();
  assert.equal(payload.results.length, 2);
  assert.equal(payload.results.find(row => row.email === 'a@example.test').marks, 0);
  assert.match(response.headers.get('cache-control'), /no-store/);
});

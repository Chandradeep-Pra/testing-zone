const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText;
  vm.runInNewContext(source, {exports, Response, console, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
    return dependencies[name];
  }});
  return exports;
}

const history = load('lib/lesson-history.ts');
const normalize = payload => JSON.parse(JSON.stringify(history.normalizeLessonHistory(payload)));
const watched = {
  id: 'progress-doc', videoId: 'video-1', title: 'Bladder cancer: staging', sectionId: 'renal',
  durationSeconds: 900, watchedSeconds: 300, lastPositionSeconds: 300,
  percentComplete: 33.33, completed: false, lastWatchedAt: '2026-10-16T10:00:00Z',
};

test('maps persisted continueWatching fields to lesson cards and resume time', () => {
  assert.deepEqual(normalize({continueWatching: [watched]}), [{
    id: 'video-1', title: 'Bladder cancer: staging', progressPct: 33.33, remainingMinutes: 10,
  }]);
  const [lesson] = normalize({continueWatching: [{...watched, watchedSeconds: 450, lastPositionSeconds: 120, percentComplete: 50}]});
  assert.equal(lesson.remainingMinutes, 13, 'remaining time follows the saved playback position');
  assert.equal(lesson.progressPct, 50);
});

test('full video history includes completed videos using the backend completion threshold', () => {
  const [lesson] = normalize({count: 1, items: [{...watched, completed: true, percentComplete: 90}]});
  assert.equal(lesson.id, 'video-1');
  assert.equal(lesson.progressPct, 100);
  assert.equal(lesson.remainingMinutes, 0);
});

test('keeps newest persisted progress per video and orders recent viewing first', () => {
  const lessons = normalize({items: [
    {...watched, title: 'Old progress', lastWatchedAt: '2026-10-10T10:00:00Z'},
    {...watched, videoId: 'video-2', title: 'Other video', lastWatchedAt: '2026-10-15T10:00:00Z'},
    {...watched, title: 'Latest progress', lastWatchedAt: '2026-10-16T10:00:00Z'},
  ]});
  assert.deepEqual(lessons.map(lesson => lesson.title), ['Latest progress', 'Other video']);
});

test('preserves legacy lesson metadata while validating derived progress and malformed rows', () => {
  const lessons = normalize({recentLessons: [
    null, 'invalid', {title: 'No video id'},
    {id: 'legacy', title: 'Existing lesson', sectionTitle: 'Core curriculum', progressPct: 25,
      thumbnailUrl: '/lesson.png', remainingMinutes: 2.2, completedAt: '2026-10-16'},
    {...watched, videoId: 'derived', percentComplete: undefined, watchedSeconds: '450', lastPositionSeconds: '450'},
    {...watched, videoId: 'clamped', percentComplete: 150},
  ]});
  assert.equal(lessons.length, 3);
  const legacy = lessons.find(lesson => lesson.id === 'legacy');
  assert.equal(legacy.sectionTitle, 'Core curriculum');
  assert.equal(legacy.thumbnailUrl, '/lesson.png');
  assert.equal(legacy.remainingMinutes, 3);
  assert.equal(lessons.find(lesson => lesson.id === 'derived').progressPct, 50);
  assert.equal(lessons.find(lesson => lesson.id === 'clamped').progressPct, 100);
});

test('uses one summary request when there is an unfinished lesson', async () => {
  const calls = [];
  const lessons = await history.loadLessonHistory(async path => {
    calls.push(path);
    return {continueWatching: [watched]};
  });
  assert.equal(lessons.length, 1);
  assert.deepEqual(calls, ['/api/urologics/me/progress']);
});

test('consults full history before treating completed or lagging-stat accounts as empty', async () => {
  const calls = [];
  const lessons = await history.loadLessonHistory(async path => {
    calls.push(path);
    return path.endsWith('/video-progress')
      ? {items: [{...watched, completed: true}], count: 1}
      : {continueWatching: [], stats: {videosStarted: 0, videosCompleted: 0}};
  });
  assert.deepEqual(calls, ['/api/urologics/me/progress', '/api/urologics/me/video-progress']);
  assert.equal(lessons[0].progressPct, 100);
});

test('an empty account is confirmed by both endpoints, while failures remain errors', async () => {
  const calls = [];
  const lessons = await history.loadLessonHistory(async path => {
    calls.push(path);
    return path.endsWith('/video-progress') ? {items: []} : {continueWatching: []};
  });
  assert.equal(lessons.length, 0);
  assert.equal(calls.length, 2);
  await assert.rejects(history.loadLessonHistory(async path => {
    if (path.endsWith('/video-progress')) throw new Error('History unavailable');
    return {continueWatching: []};
  }), /History unavailable/);
  await assert.rejects(history.loadLessonHistory(async () => {throw new Error('Progress unavailable');}), /Progress unavailable/);
});

test('video-history proxy requires authentication and forwards only the verified upstream endpoint', async () => {
  const calls = [];
  const route = load('app/api/urologics/me/video-progress/route.ts', {
    'next/server': {NextResponse: {json: (payload, init) => new Response(JSON.stringify(payload), init)}},
    '@/lib/urologics-api': {
      getAuthHeader: req => req.headers.get('authorization'),
      forwardUrologicsJson: async (req, path) => {
        calls.push({req, path});
        return new Response(JSON.stringify({items: [watched]}), {headers: {'Cache-Control': 'private, no-store'}});
      },
    },
  });
  const anonymous = await route.GET(new Request('https://fixture.test/web/api/urologics/me/video-progress'));
  assert.equal(anonymous.status, 401);
  assert.equal(calls.length, 0);
  const request = new Request('https://fixture.test/web/api/urologics/me/video-progress', {headers: {Authorization: 'Bearer fixture'}});
  const response = await route.GET(request);
  assert.equal(response.status, 200);
  assert.equal(calls[0].path, '/api/app/me/video-progress');
  assert.equal(calls[0].req, request);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await response.json()).items[0].videoId, 'video-1');
});

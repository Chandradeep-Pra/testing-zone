import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {delimiter, dirname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = join(root, '.viva-test-artifacts', 'npm-ci-retry');
const sh = process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/sh.exe' : 'sh';
const shellPath = path => process.platform === 'win32'
  ? path.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`)
  : path;
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const flags = [
  'ci', '--no-audit', '--no-fund', '--prefer-offline',
  '--fetch-retries=3', '--fetch-retry-factor=2',
  '--fetch-retry-mintimeout=5000', '--fetch-retry-maxtimeout=20000',
  '--fetch-timeout=300000', '--maxsockets=10',
];

// npm and sleep are fixture executables: no packages are installed and no real
// backoff, registry requests, credentials, or Docker operations are involved.
const mock = String.raw`
const fs = require('node:fs');
const [tool, ...args] = process.argv.slice(2);
fs.appendFileSync(process.env.NPM_RETRY_TEST_LOG, JSON.stringify({tool, args}) + '\n');
if (tool === 'sleep') process.exit(0);
if (tool !== 'npm') throw new Error('Unexpected mock executable');
const state = process.env.NPM_RETRY_TEST_STATE;
const attempt = fs.existsSync(state) ? Number(fs.readFileSync(state, 'utf8')) : 0;
fs.writeFileSync(state, String(attempt + 1));
const plan = JSON.parse(process.env.NPM_RETRY_TEST_PLAN);
const result = plan[Math.min(attempt, plan.length - 1)];
if (result.stdout) process.stdout.write(result.stdout + '\n');
if (result.stderr) process.stderr.write(result.stderr + '\n');
process.exit(result.code);
`;

function runFixture(t, plan) {
  mkdirSync(artifacts, {recursive: true});
  const dir = mkdtempSync(join(artifacts, 'run-'));
  const bin = join(dir, 'bin');
  const tmp = join(dir, 'tmp');
  mkdirSync(bin);
  mkdirSync(tmp);
  const script = join(dir, 'npm-ci-with-retry.sh');
  const mockFile = join(dir, 'mock.cjs');
  copyFileSync(join(root, 'scripts/npm-ci-with-retry.sh'), script);
  writeFileSync(mockFile, mock);
  for (const tool of ['npm', 'sleep']) {
    writeFileSync(join(bin, tool), `#!/usr/bin/env sh\nexec ${quote(shellPath(process.execPath))} ${quote(shellPath(mockFile))} ${tool} "$@"\n`, {mode: 0o755});
  }
  const log = join(dir, 'calls.jsonl');
  const env = {
    ...process.env,
    PATH: [bin, ...(process.platform === 'win32' ? [dirname(sh)] : []), process.env.PATH || process.env.Path || ''].join(delimiter),
    TMPDIR: shellPath(tmp),
    NPM_RETRY_TEST_LOG: log,
    NPM_RETRY_TEST_STATE: join(dir, 'attempts'),
    NPM_RETRY_TEST_PLAN: JSON.stringify(plan),
  };
  t.after(() => {
    const target = resolve(dir);
    assert.ok(target.startsWith(resolve(artifacts) + sep), 'cleanup is confined to test artifacts');
    rmSync(target, {recursive: true, force: true});
  });
  const result = spawnSync(sh, [shellPath(script)], {
    cwd: dir, env, encoding: 'utf8', timeout: 20_000, windowsHide: true, input: '',
  });
  if (result.error) throw result.error;
  const calls = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
  for (const call of calls.filter(call => call.tool === 'npm')) {
    assert.deepEqual(call.args, flags, 'every attempt keeps npm ci and the configured public-registry request options');
  }
  assert.deepEqual(readdirSync(tmp), [], 'temporary install logs are cleaned after success and failure');
  return {...result, calls, output: result.stdout + result.stderr};
}

const npmCalls = result => result.calls.filter(call => call.tool === 'npm');
const sleepCalls = result => result.calls.filter(call => call.tool === 'sleep').map(call => call.args);

test('successful clean install runs once and forwards its output', t => {
  const result = runFixture(t, [{code: 0, stdout: 'fixture dependencies installed'}]);
  assert.equal(result.status, 0, result.output);
  assert.equal(npmCalls(result).length, 1);
  assert.deepEqual(sleepCalls(result), []);
  assert.match(result.stdout, /fixture dependencies installed/);
});

test('interrupted response body retries the full clean install and succeeds', t => {
  const result = runFixture(t, [
    {code: 42, stderr: 'npm error code ECONNRESET\nnpm error network aborted'},
    {code: 0, stdout: 'download completed'},
  ]);
  assert.equal(result.status, 0, result.output);
  assert.equal(npmCalls(result).length, 2);
  assert.deepEqual(sleepCalls(result), [['5']]);
  assert.match(result.stderr, /ECONNRESET/);
  assert.match(result.stdout, /download completed/);
});

test('persistent network failure stops after exactly three installs and returns the final npm exit status', t => {
  const result = runFixture(t, [
    {code: 45, stderr: 'npm error code ECONNRESET'},
    {code: 46, stderr: 'npm error code ETIMEDOUT'},
    {code: 47, stderr: 'npm error code ECONNRESET'},
    {code: 0, stdout: 'must never be reached'},
  ]);
  assert.equal(result.status, 47, result.output);
  assert.equal(npmCalls(result).length, 3);
  assert.deepEqual(sleepCalls(result), [['5'], ['10']]);
  assert.doesNotMatch(result.output, /must never be reached/);
});

for (const [name, code, stderr] of [
  ['lockfile mismatch', 2, 'npm error code EUSAGE\nnpm error package.json and package-lock.json are not in sync'],
  ['registry authorization', 9, 'npm error code E401\nnpm error 401 Unauthorized'],
  ['native compilation', 1, 'npm error code 1\ngyp ERR! build error\ngyp ERR! stack Error: make failed'],
  ['integrity failure', 3, 'npm error code EINTEGRITY\nnpm error checksum verification failed'],
  ['unknown installation failure', 17, 'npm error installation failed'],
  ['network-code substring', 18, 'npm error code NOT_ECONNRESET_SUFFIX'],
]) {
  test(`${name} fails immediately without retry`, t => {
    const result = runFixture(t, [{code, stderr}, {code: 0, stdout: 'must never retry'}]);
    assert.equal(result.status, code, result.output);
    assert.equal(npmCalls(result).length, 1);
    assert.deepEqual(sleepCalls(result), []);
    assert.doesNotMatch(result.output, /must never retry/);
  });
}

test('a network failure followed by a deterministic failure stops on that second failure', t => {
  const result = runFixture(t, [
    {code: 42, stderr: 'npm error code ECONNRESET'},
    {code: 2, stderr: 'npm error code EUSAGE\nlockfile mismatch'},
    {code: 0, stdout: 'must never be reached'},
  ]);
  assert.equal(result.status, 2, result.output);
  assert.equal(npmCalls(result).length, 2);
  assert.deepEqual(sleepCalls(result), [['5']]);
});

for (const networkCode of ['ETIMEDOUT', 'EAI_AGAIN', 'ERR_STREAM_PREMATURE_CLOSE']) {
  test(`retries transient ${networkCode} errors`, t => {
    const result = runFixture(t, [{code: 42, stderr: `npm error code ${networkCode}`}, {code: 0}]);
    assert.equal(result.status, 0, result.output);
    assert.equal(npmCalls(result).length, 2);
    assert.deepEqual(sleepCalls(result), [['5']]);
  });
}

import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {delimiter, dirname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = join(root, '.viva-test-artifacts', 'deploy-script');
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const digest = `sha256:${'a'.repeat(64)}`;
const otherDigest = `sha256:${'b'.repeat(64)}`;
const imageRepo = 'asia-south1-docker.pkg.dev/proud-woods-489814-s6/cloud-run-source-deploy/urologics-web-app';
const shellPath = path => process.platform === 'win32'
  ? path.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`)
  : path;
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;

// These executables never call Docker or Google Cloud. Native Node remains real
// so the deployment script's dotenv/JSON parsing is exercised, including on Git Bash.
const mock = String.raw`
const fs = require('node:fs');
const path = require('node:path');
const [tool, ...args] = process.argv.slice(2);
const scenario = process.env.DEPLOY_TEST_SCENARIO || '';
const value = flag => args.find(arg => arg.startsWith(flag + '='))?.slice(flag.length + 1);
const output = object => process.stdout.write(JSON.stringify(object));
const fail = () => { process.stderr.write('fixture command failed\n'); process.exit(41); };
const record = {tool, args, cwd: process.cwd()};
if (tool === 'gcloud' && args[0] === 'builds' && args[1] === 'submit') {
  record.uploadFiles = fs.readdirSync(args[2]).sort();
  record.config = JSON.parse(fs.readFileSync(value('--config'), 'utf8'));
}
fs.appendFileSync(process.env.DEPLOY_TEST_LOG, JSON.stringify(record) + '\n');
if (tool === 'sleep') {
  process.exit(0);
} else if (tool === 'docker') {
  if (args[0] === 'info') process.stdout.write('linux\n');
  else if (args[0] === 'build') { if (scenario === 'build-fail') fail(); }
  else if (args[0] === 'save') {
    if (scenario === 'save-fail') fail();
    fs.writeFileSync(args[args.indexOf('--output') + 1], 'fixture image archive');
  } else throw new Error('Unexpected docker command: ' + args.join(' '));
} else if (tool === 'gcloud') {
  if (args[0] === 'auth') process.stdout.write('fixture@example.test\n');
  else if (args[0] === 'builds') {
    if (scenario === 'cloudbuild-fail') fail();
    const images = record.config.images;
    const exact = images.find(name => !name.endsWith(':latest'));
    output({status: scenario === 'cloudbuild-status-fail' ? 'FAILURE' : 'SUCCESS', results: {images: [
      {name: images.find(name => name.endsWith(':latest')), digest: process.env.DEPLOY_TEST_OTHER_DIGEST},
      ...(scenario === 'missing-digest' ? [] : [{name: exact, digest: process.env.DEPLOY_TEST_DIGEST}]),
    ]}});
  } else if (args[0] === 'run' && args[1] === 'deploy') {
    if (scenario === 'deploy-fail') fail();
    fs.writeFileSync(process.env.DEPLOY_TEST_STATE, JSON.stringify({
      revision: args[2] + '-' + value('--revision-suffix'), image: value('--image'),
    }));
  } else if (args[0] === 'run' && args[1] === 'revisions' && args[2] === 'describe') {
    const state = JSON.parse(fs.readFileSync(process.env.DEPLOY_TEST_STATE, 'utf8'));
    const wrong = scenario === 'wrong-revision';
    output({metadata: {name: state.revision}, spec: {containers: [{image: wrong ? 'wrong@' + process.env.DEPLOY_TEST_OTHER_DIGEST : state.image}]},
      status: {imageDigest: wrong || scenario === 'platform-manifest' ? process.env.DEPLOY_TEST_OTHER_DIGEST : process.env.DEPLOY_TEST_DIGEST,
        conditions: [{type: 'Ready', status: scenario === 'not-ready' ? 'False' : 'True'}]}});
  } else if (args[0] === 'run' && args[1] === 'services' && args[2] === 'update-traffic') {
    if (scenario === 'traffic-fail') fail();
    const state = JSON.parse(fs.readFileSync(process.env.DEPLOY_TEST_STATE, 'utf8'));
    // The real command returns TrafficTargetPair[], not the Service resource.
    output([{revisionName: state.revision, specPercent: '100', statusPercent: '100',
      latestRevision: false, serviceUrl: 'https://update-response-must-not-be-used.run.app'}]);
  } else if (args[0] === 'run' && args[1] === 'services' && args[2] === 'describe') {
    const state = JSON.parse(fs.readFileSync(process.env.DEPLOY_TEST_STATE, 'utf8'));
    state.describeCount = (state.describeCount || 0) + 1;
    fs.writeFileSync(process.env.DEPLOY_TEST_STATE, JSON.stringify(state));
    let traffic = [{revisionName: state.revision, percent: scenario === 'string-percent' ? '100' : 100}];
    if (scenario === 'wrong-traffic' || (scenario === 'delayed-traffic' && state.describeCount === 1)) {
      traffic = [{revisionName: 'old-revision', percent: 100}];
    } else if (scenario === 'partial-traffic') traffic[0].percent = 50;
    else if (scenario === 'delayed-traffic' && state.describeCount === 2) {
      traffic = [{revisionName: state.revision, percent: 80}, {revisionName: 'old-revision', percent: 20}];
    } else if (scenario === 'tagged-old') traffic.push({revisionName: 'old-revision', tag: 'old', percent: 0});
    else if (scenario === 'extra-positive-traffic') traffic.push({revisionName: 'old-revision', percent: 10});
    else if (scenario === 'latest-target' || scenario === 'wrong-latest-target') traffic = [{latestRevision: true, percent: '100'}];
    output({metadata: {generation: 5}, spec: {traffic: [{revisionName: state.revision, percent: 100}]}, status: {
      observedGeneration: scenario === 'reconciling-traffic' && state.describeCount === 1 ? 4 : 5,
      conditions: [{type: 'Ready', status: scenario === 'reconciling-traffic' && state.describeCount === 2 ? 'Unknown' : 'True'}],
      latestReadyRevisionName: scenario === 'wrong-latest-target' ? 'other-latest-revision' : state.revision,
      url: 'https://fixture-service.run.app',
      ...(scenario === 'missing-traffic' ? {} : {traffic}),
    }});
  } else throw new Error('Unexpected gcloud command: ' + args.join(' '));
} else throw new Error('Unexpected executable ' + tool);
`;

function fixture(t, options = {}) {
  mkdirSync(artifacts, {recursive: true});
  const dir = mkdtempSync(join(artifacts, 'run-'));
  const repo = join(dir, 'repo');
  const bin = join(dir, 'bin');
  const tmp = join(dir, 'tmp');
  const elsewhere = join(dir, 'elsewhere');
  for (const path of [repo, bin, tmp, elsewhere, join(repo, 'data'), join(repo, 'scripts')]) mkdirSync(path, {recursive: true});
  copyFileSync(join(root, 'deploy.sh'), join(repo, 'deploy.sh'));
  copyFileSync(join(root, 'scripts/npm-ci-with-retry.sh'), join(repo, 'scripts/npm-ci-with-retry.sh'));
  for (const file of ['Dockerfile', '.dockerignore', 'package.json', 'package-lock.json', 'data/sample-mocks.ts']) {
    writeFileSync(join(repo, file), file.endsWith('.json') ? '{}' : 'fixture');
  }
  // Must never be sent to Cloud Build or forwarded as Docker build arguments.
  writeFileSync(join(repo, 'uncommitted-latest-code.ts'), 'export const current = true;');
  if (options.envFile !== false) writeFileSync(join(repo, '.env.prod.stud'), [
    'NEXT_PUBLIC_FIREBASE_API_KEY=file-public-key',
    'NEXT_PUBLIC_AI_VIVA_BACKEND_HTTP_URL=https://file.fixture.test',
    'NEXT_PUBLIC_AI_VIVA_BACKEND_WS_URL=wss://file.fixture.test',
    'EMAIL_PASS=private-fixture-password',
    'GOOGLE_APPLICATION_CREDENTIALS_JSON="private-fixture-credential"',
  ].join('\n'));
  const mockFile = join(dir, 'mock.cjs');
  writeFileSync(mockFile, mock);
  // Git Bash prepends /usr/bin during startup, which would otherwise select
  // its real sleep before the fixture. Reset the fixture prefix after startup.
  const bashEnv = join(dir, 'bash-env.sh');
  writeFileSync(bashEnv, `export PATH=${quote(shellPath(bin))}:"$PATH"\n`);
  for (const tool of ['docker', 'gcloud', 'sleep']) {
    writeFileSync(join(bin, tool), `#!/usr/bin/env bash\nexec ${quote(shellPath(process.execPath))} ${quote(shellPath(mockFile))} ${tool} "$@"\n`, {mode: 0o755});
  }
  const env = {...process.env};
  for (const key of Object.keys(env)) {
    if (key.startsWith('VIVA_') || key.startsWith('NEXT_PUBLIC_') || key.startsWith('DEPLOY_TEST_')) delete env[key];
  }
  Object.assign(env, {
    PATH: `${bin}${delimiter}${env.PATH || env.Path || ''}`,
    BASH_ENV: shellPath(bashEnv),
    TMPDIR: shellPath(tmp),
    DEPLOY_TEST_LOG: join(dir, 'calls.jsonl'),
    DEPLOY_TEST_STATE: join(dir, 'state.json'),
    DEPLOY_TEST_DIGEST: digest,
    DEPLOY_TEST_OTHER_DIGEST: otherDigest,
  });
  t.after(() => {
    const target = resolve(dir);
    assert.ok(target.startsWith(resolve(artifacts) + sep), 'cleanup stays inside test artifacts');
    rmSync(target, {recursive: true, force: true});
  });
  const run = (overrides = {}, args = []) => {
    const result = spawnSync(bash, [shellPath(join(repo, 'deploy.sh')), ...args], {
      cwd: elsewhere, env: {...env, ...overrides}, encoding: 'utf8', timeout: 120_000,
      windowsHide: true, input: '',
    });
    if (result.error) throw result.error;
    const calls = existsSync(env.DEPLOY_TEST_LOG)
      ? readFileSync(env.DEPLOY_TEST_LOG, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
    return {...result, calls, output: result.stdout + result.stderr};
  };
  return {dir, repo, tmp, env, run};
}

const command = (calls, tool, ...prefix) => calls.find(call => call.tool === tool && prefix.every((arg, index) => call.args[index] === arg));
const buildImage = result => {
  const args = command(result.calls, 'docker', 'build').args;
  return args[args.indexOf('--tag') + 1];
};

test('builds current repository and publishes only its archive, then deploys the exact digest and revision', t => {
  const context = fixture(t);
  const result = context.run();
  assert.equal(result.status, 0, result.output);
  const build = command(result.calls, 'docker', 'build');
  assert.equal(resolve(build.cwd), resolve(context.repo));
  assert.equal(build.args.at(-1), '.');
  assert.deepEqual(build.args.slice(1, 3), ['--platform', 'linux/amd64']);
  const image = buildImage(result);
  assert.match(image, /:build-\d{8}-\d{6}-\d+$/);
  const publicArgs = build.args.flatMap((arg, index) => arg === '--build-arg' ? [build.args[index + 1]] : []);
  assert.deepEqual(publicArgs, [
    'NEXT_PUBLIC_FIREBASE_API_KEY=file-public-key',
    'NEXT_PUBLIC_AI_VIVA_BACKEND_HTTP_URL=https://file.fixture.test',
    'NEXT_PUBLIC_AI_VIVA_BACKEND_WS_URL=wss://file.fixture.test',
  ]);
  const save = command(result.calls, 'docker', 'save');
  assert.deepEqual(save.args.slice(-2), [image, `${imageRepo}:latest`]);
  const submit = command(result.calls, 'gcloud', 'builds', 'submit');
  assert.deepEqual(submit.uploadFiles, ['cloudbuild.json', 'image.tar']);
  assert.deepEqual(submit.config.images, [image, `${imageRepo}:latest`]);
  assert.deepEqual(submit.config.steps, [{name: 'gcr.io/cloud-builders/docker', args: ['load', '--input', '/workspace/image.tar']}]);
  const deploy = command(result.calls, 'gcloud', 'run', 'deploy');
  assert.ok(deploy.args.includes(`--image=${imageRepo}@${digest}`), 'uses the uniquely tagged build digest, not the latest-tag digest');
  assert.ok(deploy.args.includes('--no-traffic'));
  const suffix = deploy.args.find(arg => arg.startsWith('--revision-suffix=')).split('=')[1];
  const revision = `urologics-web-app-${suffix}`;
  const describe = command(result.calls, 'gcloud', 'run', 'revisions', 'describe');
  assert.equal(describe.args[3], revision);
  const traffic = command(result.calls, 'gcloud', 'run', 'services', 'update-traffic');
  assert.ok(traffic.args.includes(`--to-revisions=${revision}=100`));
  assert.ok(result.calls.indexOf(describe) < result.calls.indexOf(traffic));
  const observed = command(result.calls, 'gcloud', 'run', 'services', 'describe');
  assert.ok(observed, 'fetches fresh Service state instead of parsing the update-traffic pair array');
  assert.ok(result.calls.indexOf(traffic) < result.calls.indexOf(observed));
  for (const call of result.calls.filter(call => call.tool === 'gcloud' && call.args[0] === 'run')) {
    assert.ok(call.args.every(arg => !/--(?:set-env-vars|clear-env-vars|set-secrets|clear-secrets|allow-unauthenticated|service-account)/.test(arg)), 'preserves existing runtime settings and IAM');
  }
  assert.ok(result.calls.every(call => call.args[0] !== 'push'));
  assert.ok(!JSON.stringify(result.calls).includes('private-fixture'));
  assert.match(result.output, /Deployment successful\./);
  assert.match(result.output, /App URL: https:\/\/fixture-service\.run\.app\/web/);
  assert.deepEqual(readdirSync(context.tmp), [], 'temporary archive and response files are removed');
});

for (const [scenario, last, forbidden] of [
  ['build-fail', ['docker', 'build'], ['docker', 'save']],
  ['save-fail', ['docker', 'save'], ['gcloud', 'builds', 'submit']],
  ['cloudbuild-fail', ['gcloud', 'builds', 'submit'], ['gcloud', 'run', 'deploy']],
  ['cloudbuild-status-fail', ['gcloud', 'builds', 'submit'], ['gcloud', 'run', 'deploy']],
  ['missing-digest', ['gcloud', 'builds', 'submit'], ['gcloud', 'run', 'deploy']],
  ['deploy-fail', ['gcloud', 'run', 'deploy'], ['gcloud', 'run', 'revisions', 'describe']],
  ['wrong-revision', ['gcloud', 'run', 'revisions', 'describe'], ['gcloud', 'run', 'services', 'update-traffic']],
  ['not-ready', ['gcloud', 'run', 'revisions', 'describe'], ['gcloud', 'run', 'services', 'update-traffic']],
  ['traffic-fail', ['gcloud', 'run', 'services', 'update-traffic'], null],
  ['wrong-traffic', ['gcloud', 'run', 'services', 'update-traffic'], null],
  ['partial-traffic', ['gcloud', 'run', 'services', 'update-traffic'], null],
  ['missing-traffic', ['gcloud', 'run', 'services', 'update-traffic'], null],
]) {
  test(`stops safely for ${scenario}`, t => {
    const context = fixture(t);
    const result = context.run({DEPLOY_TEST_SCENARIO: scenario});
    assert.notEqual(result.status, 0, result.output);
    assert.ok(command(result.calls, ...last), `expected ${last.join(' ')}`);
    if (forbidden) assert.equal(command(result.calls, ...forbidden), undefined, `must not run ${forbidden.join(' ')}`);
    assert.doesNotMatch(result.output, /Deployment successful\./);
    assert.equal((result.output.match(/Deployment stopped/g) || []).length, 1, 'prints exactly one deployment failure notice');
    assert.deepEqual(readdirSync(context.tmp), []);
  });
}

test('missing Firebase key fails before building or deploying an old image', t => {
  const context = fixture(t, {envFile: false});
  const result = context.run();
  assert.notEqual(result.status, 0);
  assert.match(result.output, /Firebase|FIREBASE/);
  assert.equal(command(result.calls, 'docker', 'build'), undefined);
  assert.equal(command(result.calls, 'gcloud', 'run', 'deploy'), undefined);
});

test('polls fresh observed traffic until the exact deployed revision receives all traffic', t => {
  const context = fixture(t);
  const result = context.run({DEPLOY_TEST_SCENARIO: 'delayed-traffic'});
  assert.equal(result.status, 0, result.output);
  const descriptions = result.calls.filter(call => call.tool === 'gcloud' && call.args.slice(0, 3).join(' ') === 'run services describe');
  assert.equal(descriptions.length, 3, 'desired spec is already 100% but observed old and split traffic must keep polling');
  assert.deepEqual(result.calls.filter(call => call.tool === 'sleep').map(call => call.args), [['5'], ['5']]);
  assert.equal(result.calls.filter(call => call.tool === 'gcloud' && call.args.slice(0, 3).join(' ') === 'run services update-traffic').length, 1);
});

for (const scenario of ['', 'string-percent', 'tagged-old', 'latest-target', 'reconciling-traffic']) {
  test(`verification-only checks existing revision without rebuilding or changing traffic${scenario ? ` (${scenario})` : ''}`, t => {
    const context = fixture(t, {envFile: false});
    const revision = 'urologics-web-app-already-deployed';
    writeFileSync(context.env.DEPLOY_TEST_STATE, JSON.stringify({revision}));
    const result = context.run({DEPLOY_TEST_SCENARIO: scenario}, ['--verify-only', revision]);
    assert.equal(result.status, 0, result.output);
    assert.ok(command(result.calls, 'gcloud', 'run', 'services', 'describe'));
    assert.equal(result.calls.find(call => call.tool === 'docker'), undefined);
    assert.equal(command(result.calls, 'gcloud', 'builds', 'submit'), undefined);
    assert.equal(command(result.calls, 'gcloud', 'run', 'deploy'), undefined);
    assert.equal(command(result.calls, 'gcloud', 'run', 'services', 'update-traffic'), undefined);
    assert.match(result.output, /https:\/\/fixture-service\.run\.app\/web/);
    if (scenario === 'reconciling-traffic') {
      assert.equal(result.calls.filter(call => call.tool === 'gcloud' && call.args.slice(0, 3).join(' ') === 'run services describe').length, 3);
    }
    assert.deepEqual(readdirSync(context.tmp), []);
  });
}

for (const scenario of ['wrong-latest-target', 'extra-positive-traffic']) {
  test(`verification-only rejects ${scenario} without changing the service`, t => {
    const context = fixture(t, {envFile: false});
    const revision = 'urologics-web-app-already-deployed';
    writeFileSync(context.env.DEPLOY_TEST_STATE, JSON.stringify({revision}));
    const result = context.run({DEPLOY_TEST_SCENARIO: scenario}, ['--verify-only', revision]);
    assert.notEqual(result.status, 0, result.output);
    assert.ok(result.calls.every(call => call.tool !== 'docker'));
    assert.equal(command(result.calls, 'gcloud', 'run', 'services', 'update-traffic'), undefined);
    assert.equal((result.output.match(/Deployment stopped/g) || []).length, 1);
  });
}

test('accepts an OCI index resolved to a platform digest when the exact requested image matches', t => {
  const context = fixture(t);
  const result = context.run({DEPLOY_TEST_SCENARIO: 'platform-manifest'});
  assert.equal(result.status, 0, result.output);
  assert.ok(command(result.calls, 'gcloud', 'run', 'deploy').args.includes(`--image=${imageRepo}@${digest}`));
  assert.ok(command(result.calls, 'gcloud', 'run', 'services', 'update-traffic'));
});

test('every invocation gets a new image tag even with the same source and second', t => {
  const context = fixture(t);
  const first = context.run();
  assert.equal(first.status, 0, first.output);
  writeFileSync(context.env.DEPLOY_TEST_LOG, '');
  const second = context.run();
  assert.equal(second.status, 0, second.output);
  assert.notEqual(buildImage(first), buildImage(second));
});

test('environment file selection and process-variable overrides are deterministic', t => {
  const context = fixture(t);
  writeFileSync(join(context.repo, '.env.local'), 'NEXT_PUBLIC_FIREBASE_API_KEY=lower-priority-key');
  const explicit = join(context.repo, 'chosen.env');
  writeFileSync(explicit, 'NEXT_PUBLIC_FIREBASE_API_KEY=chosen-file-key\nNEXT_PUBLIC_AI_VIVA_BACKEND_HTTP_URL=https://chosen.fixture.test');
  const result = context.run({VIVA_ENV_FILE: explicit, NEXT_PUBLIC_FIREBASE_API_KEY: 'process-public-key'});
  assert.equal(result.status, 0, result.output);
  const build = command(result.calls, 'docker', 'build');
  assert.ok(build.args.includes('NEXT_PUBLIC_FIREBASE_API_KEY=process-public-key'));
  assert.ok(build.args.includes('NEXT_PUBLIC_AI_VIVA_BACKEND_HTTP_URL=https://chosen.fixture.test'));
  assert.ok(build.args.includes('NEXT_PUBLIC_AI_VIVA_BACKEND_WS_URL=wss://ai-viva-backend-917765808203.us-central1.run.app'));
  writeFileSync(context.env.DEPLOY_TEST_LOG, '');
  const defaultSelection = context.run();
  assert.equal(defaultSelection.status, 0, defaultSelection.output);
  assert.ok(command(defaultSelection.calls, 'docker', 'build').args.includes('NEXT_PUBLIC_FIREBASE_API_KEY=file-public-key'));
});

test('dotenv contents are parsed as data and never executed as shell commands', t => {
  const context = fixture(t);
  const marker = join(context.repo, 'must-not-exist');
  const literal = `$(touch ${quote(shellPath(marker))})`;
  writeFileSync(join(context.repo, '.env.prod.stud'), `NEXT_PUBLIC_FIREBASE_API_KEY="${literal}"\nEMAIL_PASS="${literal}"\n`);
  const result = context.run();
  assert.equal(result.status, 0, result.output);
  assert.equal(existsSync(marker), false);
  assert.ok(command(result.calls, 'docker', 'build').args.includes(`NEXT_PUBLIC_FIREBASE_API_KEY=${literal}`));
});

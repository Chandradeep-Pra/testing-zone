const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function load(file, mocks = {}, globals = {}) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, {module, exports: module.exports, require: name => {
    if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
    return mocks[name];
  }, Response, Buffer, ...globals});
  return module.exports;
}
function routeHarness() {
  const calls = [];
  const route = load('app/api/viva/tts/route.ts', {
    '@google-cloud/text-to-speech': {TextToSpeechClient: class {
      async synthesizeSpeech(request) { calls.push(request); return [{audioContent: Buffer.from('test-audio')}]; }
    }},
    '@/lib/medical-terminology': load('lib/medical-terminology.ts'),
    '@/lib/viva-tts-voice': load('lib/viva-tts-voice.ts'),
  }, {process: {env: {GOOGLE_APPLICATION_CREDENTIALS_JSON: JSON.stringify({client_email:'test@example.test',private_key:'test',project_id:'test'})}}});
  return {calls, post: body => route.POST({json: async () => body})};
}
test('Zephyr synthesis explicitly requests Zephyr, female, British English and confirms the voice', async () => {
  const h = routeHarness();
  const response = await h.post({text:'Review CT.',voiceName:'en-GB-Chirp3-HD-Zephyr',languageCode:'en-GB'});
  assert.equal(response.status, 200);
  assert.equal(h.calls[0].voice.name, 'en-GB-Chirp3-HD-Zephyr');
  assert.equal(h.calls[0].voice.ssmlGender, 'FEMALE');
  assert.equal(h.calls[0].voice.languageCode, 'en-GB');
  assert.equal(response.headers.get('X-Viva-TTS-Voice'), 'en-GB-Chirp3-HD-Zephyr');
});
test('missing or invalid voices and mismatched language never silently fall back', async () => {
  const h = routeHarness();
  for (const input of [{}, {voiceName:''}, {voiceName:'unknown'}, {voiceName:'en-GB-Chirp3-HD-Zephyr',languageCode:'en-US'}]) {
    const response = await h.post({text:'Question',...input});
    assert.equal(response.status,400);
  }
  assert.equal(h.calls.length,0);
});

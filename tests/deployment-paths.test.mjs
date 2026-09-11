import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/app-path.ts', import.meta.url), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {exports});
const {appPath, loginReturnPath} = exports;
test('local browser paths have exactly one base path', () => {
  for (const [input, expected] of [['/api/test','/web/api/test'],['logo.png','/web/logo.png'],['/web','/web'],['/web?x=1','/web?x=1'],['/web/logo.png','/web/logo.png'],['/website','/web/website']]) assert.equal(appPath(input),expected);
});
test('external APIs, protocol-relative assets and non-HTTP URLs are preserved', () => {
  for (const url of ['https://urologics.co.uk/api/app/access','https://example.com/a','//cdn.example.com/a','data:image/png;base64,abc','blob:https://example.com/id','mailto:a@example.com','#section','?page=2','wss://example.com']) assert.equal(appPath(url),url);
});
test('login return destinations stay local and avoid double prefixes', () => {
  for (const bad of [null,'https://evil.test','//evil.test','/\\evil.test','/web//evil.test','/\nevil.test']) assert.equal(loginReturnPath(bad),'/');
  assert.equal(loginReturnPath('/web/checkout?planId=1'),'/checkout?planId=1');
  assert.equal(loginReturnPath('/checkout?planId=1'),'/checkout?planId=1');
});

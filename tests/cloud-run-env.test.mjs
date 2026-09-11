import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEnv} from 'node:util';
import {dockerInvocation,defaultEnvFile} from '../scripts/cloud-run-env.mjs';
const config = parseEnv('NEXT_PUBLIC_FIREBASE_API_KEY=public-key\nEMAIL_PASS=private-password\nGOOGLE_APPLICATION_CREDENTIALS_JSON=\'{"private_key":"line1\\nline2"}\'');
test('student environment is the default and only the public key enters builds',()=>{
  assert.ok(defaultEnvFile.endsWith('.env.prod.stud'));
  const {args,env}=dockerInvocation('build',config,'test:image',{...config,PATH:'tools'});
  assert.equal(env.NEXT_PUBLIC_FIREBASE_API_KEY,'public-key');
  assert.equal(env.EMAIL_PASS,undefined);
  assert.equal(env.GOOGLE_APPLICATION_CREDENTIALS_JSON,undefined);
  assert.equal(env.PATH,'tools');
  assert.ok(!args.some(arg=>arg.includes('private-password')));
  assert.throws(()=>dockerInvocation('build',{},'test:image'),/Missing NEXT_PUBLIC_FIREBASE_API_KEY/);
});
test('runtime receives parsed values via environment, not argv or a copied file',()=>{
  const {args,env}=dockerInvocation('run',config,'test:image',{});
  assert.equal(env.EMAIL_PASS,config.EMAIL_PASS);
  assert.equal(env.GOOGLE_APPLICATION_CREDENTIALS_JSON,config.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  assert.ok(args.includes('EMAIL_PASS'));
  assert.ok(args.includes('127.0.0.1:8080:8080'));
  assert.ok(!args.includes('--env-file'));
  assert.ok(!args.includes(config.EMAIL_PASS));
  assert.ok(args.includes('PORT=8080'));
});

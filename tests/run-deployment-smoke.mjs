import {cpSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const cwd=resolve('.next/standalone');
cpSync('public',resolve(cwd,'public'),{recursive:true});
cpSync('.next/static',resolve(cwd,'.next/static'),{recursive:true});
const server=spawn(process.execPath,['server.js'],{cwd,env:{...process.env,PORT:'8085',HOSTNAME:'127.0.0.1',NODE_ENV:'production'},stdio:'inherit'});
try {
  let ready=false;
  for(let attempt=0;attempt<100;attempt++) {
    try { if((await fetch('http://127.0.0.1:8085/web/login')).ok) {ready=true;break;} } catch {}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  if(!ready) throw new Error('Standalone server did not become ready');
  process.env.DEPLOYMENT_TEST_ORIGIN='http://127.0.0.1:8085';
  await import('./deployment-smoke.mjs');
} finally { server.kill(); }

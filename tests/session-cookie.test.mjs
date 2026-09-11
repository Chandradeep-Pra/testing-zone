import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
for(const [file,method] of [['app/api/mocks/route.ts','GET'],['app/api/mocks/[id]/route.ts','GET'],['app/api/mocks/[id]/attempts/route.ts','POST'],['app/api/urologics/videos/[id]/stream/route.ts','GET']]) {
  test(`${file} forwards the Hosting session cookie as a Bearer token`,async()=>{
    const exports={},calls=[];
    const modules={
      'next/server':{NextResponse:{json:(data,init)=>new Response(JSON.stringify(data),init)}},
      '@/lib/urologics-api':{getUrologicsApiUrl:path=>`https://upstream.test${path}`,getAuthHeader:()=>null},
    };
    const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    vm.runInNewContext(code,{exports,require:name=>modules[name],Response,console,fetch:async(url,init)=>{calls.push({url,init});return new Response(JSON.stringify({mocks:[]}),{status:200});}});
    const req={cookies:{get:name=>name==='__session'?{value:'test-token'}:undefined},headers:new Headers(),json:async()=>({marks:1})};
    const response=await exports[method](req,{params:Promise.resolve({id:'example'})});
    assert.equal(response.status,200);
    assert.equal(calls.length,1);
    assert.equal(calls[0].init.headers.Authorization,'Bearer test-token');
    assert.ok(calls[0].url.startsWith('https://upstream.test/api/app/'));
  });
}

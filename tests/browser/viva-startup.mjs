// Run against an isolated local Next dev server configured with
// NEXT_PUBLIC_FIREBASE_API_KEY=viva-test (all external services are intercepted).
// VIVA_TEST_BASE_URL=http://127.0.0.1:3011 node tests/browser/viva-startup.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const base = process.env.VIVA_TEST_BASE_URL || 'http://127.0.0.1:3011';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Use a local test server.');
const chrome = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(file => fs.existsSync(file));
if (!chrome) throw new Error('Set CHROME_PATH to an installed Chrome/Chromium browser.');
const artifactDir = path.resolve(process.env.VIVA_TEST_ARTIFACTS || '.viva-test-artifacts');
fs.mkdirSync(artifactDir, { recursive: true });
function audioFixture() {
  const samples = 8000, data = Buffer.alloc(44 + samples * 2);
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(8000, 24); data.writeUInt32LE(16000, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(samples * 2, 40);
  for (let i=0;i<samples;i++) data.writeInt16LE(Math.round(Math.sin(i / 8000 * Math.PI * 440 * 2) * 500),44+i*2);
  return data;
}
const questions = [
  {id:'q1',question:'What initial assessment would you perform?',answerKeywords:[],linkedExhibitIds:[]},
  {id:'q2',question:'Which investigations would you arrange?',answerKeywords:[],linkedExhibitIds:[]},
];
const vivaCase = {id:'startup-fixture',case:{title:'Startup regression case',level:'Intermediate',stem:'A patient presents with a urinary symptom.',objectives:['Assessment']},
  exhibits:[],marking_criteria:{must_mention:[],critical_fail:[]},viva_rules:{max_duration_minutes:10,max_questions:2,question_style:'case-based',allow_candidate_request:false,examiner_tone:'professional',progression:'fixed'},
  modes:{calmAndComposed:{enabled:true,questions},fastAndFurious:{enabled:true,questions}}};
const browser = await puppeteer.launch({executablePath:chrome,headless:true,timeout:60000,dumpio:process.env.VIVA_BROWSER_DEBUG === "1",args:[
  '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required',
]});
console.log("Chrome launched for viva startup checks");
try {
  for (const scenario of [{mode:'fast',failFirst:false},{mode:'calm',failFirst:false},{mode:'fast',failFirst:true}]) {
    console.log(`Running ${scenario.mode} startup (retry=${scenario.failFirst})`);
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width:1440,height:1000});
    const requests = [], errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('urologics-testing-zone-auth',JSON.stringify({uid:'test',email:'test@example.test',name:'Test Candidate',idToken:'test-token',refreshToken:'test-refresh',expiresAt:Date.now()+3600000,tier:'paid',activeCourseIds:[]}));
      window.__vivaSockets = [];
      class TestSocket extends EventTarget {
        static CONNECTING=0; static OPEN=1; static CLOSED=3;
        readyState=0;
        constructor() { super(); window.__vivaSockets.push(this); queueMicrotask(()=>{this.readyState=1;const event=new Event('open');this.onopen?.(event);this.dispatchEvent(event);}); }
        send(data) { if (typeof data !== "string") this.captureStarted = true; }
        close() { this.readyState=3;const event=new Event('close');this.onclose?.(event);this.dispatchEvent(event); }
        answer(text) { this.onmessage?.({data:JSON.stringify({transcript:text,final:true})});this.onmessage?.({data:JSON.stringify({speechEnded:true})}); }
      }
      window.WebSocket=TestSocket;
    });
    await page.setRequestInterception(true);
    let ttsCount = 0;
    page.on('request', request => { void (async()=>{
      const url = new URL(request.url());
      const json = body => request.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
      if (url.hostname==='securetoken.googleapis.com') return json({user_id:'test',id_token:'test-token',refresh_token:'test-refresh',expires_in:'3600'});
      if (url.pathname.endsWith('/api/urologics/access')) return json({tier:'paid',profile:{uid:'test',email:'test@example.test',name:'Test Candidate'}});
      if (url.pathname.endsWith('/api/urologics/session')) return json({});
      if (url.pathname.endsWith('/api/urologics/viva-cases')) return json({cases:[vivaCase]});
      if (url.pathname.includes('/api/liveavatar/') || url.pathname.endsWith('/api/viva/prepareCase')) {
        requests.push({unexpected:url.pathname}); return json({error:'Not used by authored cases'});
      }
      if (url.pathname.endsWith('/api/viva/tts')) {
        const body = JSON.parse(request.postData()); requests.push(body); ttsCount++;
        await new Promise(resolve=>setTimeout(resolve,800));
        if (scenario.failFirst && ttsCount===1) return request.respond({status:503,contentType:'application/json',body:'{"error":"simulated TTS outage"}'});
        return request.respond({status:200,contentType:'audio/wav',headers:{'X-Viva-TTS-Voice':body.voiceName},body:audioFixture()});
      }
      if (url.pathname.includes('/api/')) return json({});
      if (url.origin!==base && !['data:','blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    })().catch(error=>errors.push(error.message)); });
    try {
      await page.goto(`${base}/web/ai-viva/session/startup-fixture?mode=${scenario.mode}`,{waitUntil:'networkidle0',timeout:120000});
      await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent.includes('Enter Viva Room')&&!button.disabled),{timeout:30000});
      if (scenario.mode==='fast') await page.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Ms. Zephyr')).click());
      const started=Date.now();
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Enter Viva Room')).click());
      await page.waitForSelector('[role="status"]',{timeout:5000});
      await page.screenshot({path:path.join(artifactDir,`${scenario.mode}-${scenario.failFirst}-loading.png`)});
      if (scenario.failFirst) {
        await page.waitForSelector('[role="alert"]',{timeout:10000});
        await page.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Retry question')).click());
      }
      await page.waitForFunction(()=>!document.querySelector('[role="status"]')&&!document.querySelector('[role="alert"]')&&document.body.textContent.includes('What initial assessment would you perform?'),{timeout:15000});
      const elapsed=Date.now()-started;
      assert.ok(elapsed<10000,`Startup took ${elapsed}ms with an 800ms mock TTS response`);
      assert.ok(requests.length>=1);
      assert.ok(!requests.some(item=>item.unexpected),JSON.stringify(requests));
      assert.ok(requests.every(item=>item.text===questions[0].question),'Greeting, warmup, or skipped question requested');
      const voice = scenario.mode==='fast'?'en-GB-Chirp3-HD-Zephyr':'en-GB-Chirp3-HD-Leda';
      assert.ok(requests.every(item=>item.voiceName===voice),'Selected examiner voice changed');
      assert.deepEqual(errors,[]);
      await page.waitForFunction(()=>window.__vivaSockets.some(socket=>socket.captureStarted),{timeout:10000});
      await page.evaluate(()=>window.__vivaSockets.find(socket=>socket.captureStarted).answer('I would take a clinical history and examine the patient.'));
      await page.waitForFunction(()=>document.body.textContent.includes('Which investigations would you arrange?'),{timeout:15000});
      await page.waitForFunction(()=>document.body.textContent.includes('Listening'),{timeout:15000});
      assert.ok(requests.some(item=>item.text===questions[1].question));
      assert.ok(requests.every(item=>!item.voiceName || item.voiceName===voice),'Examiner changed on the next question');
      assert.deepEqual(errors,[]);
      await page.screenshot({path:path.join(artifactDir,`${scenario.mode}-${scenario.failFirst}-started.png`)});
      console.log(`PASS ${scenario.mode}: ${scenario.failFirst?'TTS failure and retry':'direct startup'}, selected voice preserved through question 2 (${elapsed}ms startup)`);
    } catch(error) {
      await page.screenshot({path:path.join(artifactDir,'failure.png')});
      console.error('Browser errors:',errors);
      throw error;
    } finally { await context.close(); }
  }
} finally { await browser.close(); }

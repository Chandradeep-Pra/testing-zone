import fs from 'node:fs';
import {parseEnv} from 'node:util';
import {GoogleGenAI, Modality} from '@google/genai';

// A short, synthetic audio smoke test; never logs keys, tokens or raw errors.
const file = '.env.local';
const env = parseEnv(fs.readFileSync(file, 'utf8'));
const model = env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-latest';
let session;
let timer;
let stage = 'ephemeral token';
try {
  const client = new GoogleGenAI({apiKey: env.GEMINI_LIVE_API_KEY, httpOptions: {apiVersion: 'v1alpha', timeout: 20000}});
  const token = await client.authTokens.create({config: {
    uses: 1,
    newSessionExpireTime: new Date(Date.now() + 60000).toISOString(),
    expireTime: new Date(Date.now() + 120000).toISOString(),
    liveConnectConstraints: {model, config: {responseModalities: [Modality.AUDIO]}},
  }});
  if (!token.name) throw new Error('Missing token');
  console.log('Restricted ephemeral token creation passed');
  stage = 'live audio';
  let resolveAudio, rejectAudio;
  const audio = new Promise((resolve, reject) => {resolveAudio = resolve; rejectAudio = reject;});
  // Install rejection handling before connecting.
  void audio.catch(() => {});
  timer = setTimeout(() => rejectAudio(new Error('Timed out')), 25000);
  const live = new GoogleGenAI({apiKey: token.name, httpOptions: {apiVersion: 'v1alpha'}});
  session = await live.live.connect({model, config: {responseModalities: [Modality.AUDIO]}, callbacks: {
    onmessage: message => {
      if (message.serverContent?.modelTurn?.parts?.some(part => part.inlineData?.mimeType?.startsWith('audio/') && part.inlineData.data)) resolveAudio();
    },
    onerror: () => rejectAudio(new Error('Live connection failed')),
    onclose: () => rejectAudio(new Error('Live connection closed')),
  }});
  session.sendClientContent({turns: [{role: 'user', parts: [{text: 'Say only Ready.'}]}], turnComplete: true});
  await audio;
  const line = `GEMINI_LIVE_MODEL=${JSON.stringify(model)}`;
  let content = fs.readFileSync(file, 'utf8');
  content = /^GEMINI_LIVE_MODEL=.*$/m.test(content) ? content.replace(/^GEMINI_LIVE_MODEL=.*$/m, () => line) : `${content.trimEnd()}\n${line}\n`;
  fs.writeFileSync(file, content, {mode: 0o600});
  console.log(`Live connection and audio response passed: ${model}`);
} catch (error) {
  console.error(JSON.stringify({stage, status: error.status || 'failed'}));
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
  session?.close();
}

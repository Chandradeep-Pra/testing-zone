import fs from 'node:fs';
import {parseEnv} from 'node:util';
import {GoogleAuth} from 'google-auth-library';

// Explicitly invoked provisioning. Never print credentials or raw HTTP errors.
const project = 'proud-woods-489814-s6';
const number = '917765808203';
const account = `gemini-live-viva@${project}.iam.gserviceaccount.com`;
const keyName = `projects/${number}/locations/global/keys/gemini-live-viva`;
let stage = 'authenticate';
try {
  const env = parseEnv(fs.readFileSync('.env.prod.stud', 'utf8'));
  const credentials = JSON.parse(env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  if (credentials.project_id !== project) throw new Error('Project mismatch');
  credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  const client = await new GoogleAuth({credentials, scopes: ['https://www.googleapis.com/auth/cloud-platform']}).getClient();
  const request = async (url, method = 'GET', data) => (await client.request({url, method, data, timeout: 20000})).data;
  stage = 'enable API Keys API';
  const serviceUrl = `https://serviceusage.googleapis.com/v1/projects/${number}/services/apikeys.googleapis.com`;
  const service = await request(serviceUrl);
  if (service.state !== 'ENABLED') {
    let operation = await request(`${serviceUrl}:enable`, 'POST', {});
    for (let attempt = 0; !operation.done && attempt < 30; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      operation = await request(`https://serviceusage.googleapis.com/v1/${operation.name}`);
    }
    if (!operation.done || operation.error) throw new Error('API enablement incomplete');
  }
  stage = 'dedicated service account';
  const accountUrl = `https://iam.googleapis.com/v1/projects/${project}/serviceAccounts/${account}`;
  try { await request(accountUrl); }
  catch (error) {
    if (error.response?.status !== 404) throw error;
    await request(`https://iam.googleapis.com/v1/projects/${project}/serviceAccounts`, 'POST', {
      accountId: 'gemini-live-viva', serviceAccount: {displayName: 'Gemini Live Viva'},
    });
  }
  console.log('Dedicated service account ready');
  stage = 'Gemini restricted authorization key';
  let key;
  try { key = await request(`https://apikeys.googleapis.com/v2/${keyName}`); }
  catch (error) {
    if (error.response?.status !== 404) throw error;
    let operation = await request(`https://apikeys.googleapis.com/v2/projects/${number}/locations/global/keys?keyId=gemini-live-viva`, 'POST', {
      displayName: 'Gemini Live Viva', serviceAccountEmail: account,
      restrictions: {apiTargets: [{service: 'generativelanguage.googleapis.com'}]},
    });
    for (let attempt = 0; !operation.done && attempt < 30; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      operation = await request(`https://apikeys.googleapis.com/v2/${operation.name}`);
    }
    if (!operation.done || operation.error) throw new Error('Key provisioning incomplete');
    key = operation.response;
  }
  if (key.serviceAccountEmail !== account || key.restrictions?.apiTargets?.length !== 1 || key.restrictions.apiTargets[0].service !== 'generativelanguage.googleapis.com') throw new Error('Unexpected key configuration');
  const {keyString} = await request(`https://apikeys.googleapis.com/v2/${key.name}/keyString`);
  if (!keyString) throw new Error('No key returned');
  stage = 'save ignored local configuration';
  const file = '.env.local';
  let content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const settings = {GEMINI_API_KEY: keyString, GEMINI_LIVE_PROJECT_ID: project};
  for (const [name, value] of Object.entries(settings)) {
    const line = `${name}=${JSON.stringify(value)}`;
    const pattern = new RegExp(`^${name}=.*$`, 'm');
    content = pattern.test(content) ? content.replace(pattern, () => line) : `${content.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(file, content, {mode: 0o600});
  console.log('Gemini-only authorization key saved to ignored .env.local');
  stage = 'verify Gemini API access';
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: {'x-goog-api-key': keyString}, signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  console.log(JSON.stringify({check: 'Gemini access', status: response.status, errorStatus: result.error?.status,
    liveModels: result.models?.filter(model => model.supportedGenerationMethods?.includes('bidiGenerateContent')).map(model => model.name)}));
  if (!response.ok) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({stage, status: error.response?.status || 'failed', errorStatus: error.response?.data?.error?.status}));
  process.exitCode = 1;
}

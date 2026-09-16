import fs from 'node:fs';
import {parseEnv} from 'node:util';
import {GoogleAuth} from 'google-auth-library';
const env = parseEnv(fs.readFileSync('../urocms/.env.prod', 'utf8'));
const credentials = {project_id: env.FIREBASE_PROJECT_ID, client_email: env.FIREBASE_CLIENT_EMAIL, private_key: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')};
try {
  const client = await new GoogleAuth({credentials, scopes: ['https://www.googleapis.com/auth/cloud-platform']}).getClient();
  const response = await client.request({url: `https://firestore.googleapis.com/v1/projects/${credentials.project_id}/databases/(default)/documents:runQuery`, method: 'POST', data: {structuredQuery: {
    from: [{collectionId: 'videoItems'}], select: {fields: ['title','sectionId','sectionTitleSnapshot','storagePath','storageBucket','durationSeconds','durationMinutes'].map(fieldPath => ({fieldPath}))},
  }}, timeout: 20000});
  const rows = response.data.filter(row => row.document).map(({document}) => ({id: document.name.split('/').pop(), ...Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, value.stringValue ?? value.integerValue ?? value.doubleValue]))}));
  const matches = rows.filter(row => /bladder|utuc|uro.oncology/i.test(row.title));
  fs.mkdirSync('.viva-test-artifacts/case-prep', {recursive: true});
  fs.writeFileSync('.viva-test-artifacts/case-prep/sources.json', JSON.stringify(matches, null, 2));
  console.log(JSON.stringify(matches, null, 2));
} catch (error) { console.error(JSON.stringify({status: error.response?.status || 'failed'})); process.exitCode = 1; }

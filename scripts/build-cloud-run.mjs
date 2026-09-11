// Builds only; never pushes or deploys. Read only the main app's public Firebase config.
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const mainEnv = process.argv[2];
const image = process.argv[3];
if (!mainEnv || !image) throw new Error('Usage: node scripts/build-cloud-run.mjs MAIN_ENV_FILE IMAGE');
const config = parseEnv(readFileSync(mainEnv,'utf8'));
if (!config.NEXT_PUBLIC_FIREBASE_API_KEY || !config.NEXT_PUBLIC_FIREBASE_PROJECT_ID) throw new Error('Main Firebase public configuration is missing');
if (config.FIREBASE_PROJECT_ID && config.FIREBASE_PROJECT_ID !== config.NEXT_PUBLIC_FIREBASE_PROJECT_ID) throw new Error('Main Firebase client/Admin projects differ');
const env = {...process.env};
for (const key of Object.keys(config)) delete env[key];
env.NEXT_PUBLIC_FIREBASE_API_KEY = config.NEXT_PUBLIC_FIREBASE_API_KEY;
console.log(`Building with the main app Firebase project: ${config.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
const result = spawnSync('docker',['build','--platform','linux/amd64','--build-arg','NEXT_PUBLIC_FIREBASE_API_KEY','--tag',image,'.'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env,stdio:'inherit',shell:false});
if(result.error) throw result.error;
process.exitCode=result.status??1;

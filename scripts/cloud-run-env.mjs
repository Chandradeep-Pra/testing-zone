import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';

export const appRoot = fileURLToPath(new URL('../', import.meta.url));
export const defaultEnvFile = fileURLToPath(new URL('../.env.prod.stud', import.meta.url));
export function readAppEnv(file = defaultEnvFile) {
  return parseEnv(readFileSync(file, 'utf8'));
}

export function dockerInvocation(mode, config, image, inherited = process.env) {
  const env = {...inherited};
  for (const key of Object.keys(config)) delete env[key];
  if (mode === 'build') {
    if (!config.NEXT_PUBLIC_FIREBASE_API_KEY?.trim()) throw new Error('Missing NEXT_PUBLIC_FIREBASE_API_KEY in application environment file');
    if (config.FIREBASE_PROJECT_ID && config.NEXT_PUBLIC_FIREBASE_PROJECT_ID && config.FIREBASE_PROJECT_ID !== config.NEXT_PUBLIC_FIREBASE_PROJECT_ID) throw new Error('Firebase client/Admin projects differ');
    env.NEXT_PUBLIC_FIREBASE_API_KEY = config.NEXT_PUBLIC_FIREBASE_API_KEY;
    return {args:['build','--platform','linux/amd64','--build-arg','NEXT_PUBLIC_FIREBASE_API_KEY','--tag',image,'.'],env};
  }
  if (mode === 'run') {
    const args = ['run','--rm','--name','urologics-web-app-local','--publish','127.0.0.1:8080:8080'];
    for (const [key,value] of Object.entries(config)) {
      env[key] = value;
      args.push('--env',key);
    }
    args.push('--env','NODE_ENV=production','--env','PORT=8080','--env','HOSTNAME=0.0.0.0',image);
    return {args,env};
  }
  throw new Error('Unsupported Docker mode');
}

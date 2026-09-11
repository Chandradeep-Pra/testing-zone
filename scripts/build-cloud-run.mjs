// Builds locally only; never pushes or deploys. Server secrets are not build arguments.
import {spawnSync} from 'node:child_process';
import {appRoot, readAppEnv, dockerInvocation} from './cloud-run-env.mjs';
// One argument uses .env.prod.stud; the old ENV_FILE IMAGE form remains supported.
const [first,second] = process.argv.slice(2);
if (!first) throw new Error('Usage: node scripts/build-cloud-run.mjs [ENV_FILE] IMAGE');
const image = second || first;
const {args,env} = dockerInvocation('build', readAppEnv(second ? first : undefined), image);
const result = spawnSync('docker',args,{cwd:appRoot,env,stdio:'inherit',shell:false});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

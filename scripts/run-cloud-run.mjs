// Inject .env.prod.stud at local container runtime; never copy or mount the file.
import {spawnSync} from 'node:child_process';
import {appRoot, readAppEnv, dockerInvocation} from './cloud-run-env.mjs';
const [first,second] = process.argv.slice(2);
if (!first) throw new Error('Usage: node scripts/run-cloud-run.mjs [ENV_FILE] IMAGE');
const {args,env} = dockerInvocation('run', readAppEnv(second ? first : undefined), second || first);
const result = spawnSync('docker',args,{cwd:appRoot,env,stdio:'inherit',shell:false});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

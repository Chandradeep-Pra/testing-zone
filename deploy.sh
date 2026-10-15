#!/usr/bin/env bash
# Run in Google Cloud Shell: bash deploy.sh
set -Eeuo pipefail

stage="checking prerequisites"
transfer_dir=""
temp_root="${TMPDIR:-/tmp}"
cleanup() {
  case "$transfer_dir" in
    "$temp_root"/urologics-deploy.*) rm -rf -- "$transfer_dir" ;;
  esac
}
trap cleanup EXIT
trap 'printf "\nDeployment stopped while %s. No later steps were run.\n" "$stage" >&2' ERR
trap 'exit 130' INT
trap 'exit 143' TERM
fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd -- "$repo_root"

for tool in docker gcloud node mktemp; do
  command -v "$tool" >/dev/null || fail "Install $tool or run this script in Google Cloud Shell."
done
for file in Dockerfile .dockerignore package.json package-lock.json data/sample-mocks.ts; do
  [[ -f "$file" ]] || fail "Missing $file in $repo_root. Sync the complete project first."
done
node --input-type=module -e 'import {parseEnv} from "node:util"; if (typeof parseEnv !== "function") process.exit(1)' \
  || fail "Use Node.js 22 or newer in Cloud Shell."
[[ "$(docker info --format '{{.OSType}}')" == linux ]] || fail "Docker must be running with Linux containers."
[[ -n "$(gcloud auth list --filter=status:ACTIVE --format='value(account)')" ]] \
  || fail "Sign in with gcloud auth login first."

project="${VIVA_PROJECT_ID:-proud-woods-489814-s6}"
region="${VIVA_REGION:-asia-south1}"
service="${VIVA_SERVICE:-urologics-web-app}"
repository="${VIVA_REPOSITORY:-cloud-run-source-deploy}"

# Parse dotenv as data; never execute an environment file as shell code.
# Read only public build settings. Server settings stay on the existing service.
env_file="${VIVA_ENV_FILE:-}"
if [[ -n "$env_file" ]]; then
  [[ -f "$env_file" ]] || fail "Environment file not found: $env_file"
else
  for candidate in .env.prod.stud .env.production.local .env.local .env.production .env; do
    if [[ -f "$candidate" ]]; then env_file="$candidate"; break; fi
  done
fi
public_setting() {
  node --input-type=module - "$env_file" "$1" <<'NODE'
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
const [file, key] = process.argv.slice(2);
const allowed = new Set([
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_AI_VIVA_BACKEND_HTTP_URL',
  'NEXT_PUBLIC_AI_VIVA_BACKEND_WS_URL',
]);
if (!allowed.has(key)) throw new Error('Only public build settings can be read.');
const value = process.env[key] || (file ? parseEnv(readFileSync(file, 'utf8'))[key] : '') || '';
process.stdout.write(value.trim());
NODE
}
firebase_key="${VIVA_FIREBASE_API_KEY:-$(public_setting NEXT_PUBLIC_FIREBASE_API_KEY)}"
if [[ -z "$firebase_key" ]]; then
  if [[ -t 0 ]]; then
    read -r -p 'Firebase public web API key: ' firebase_key
  else
    fail "Set NEXT_PUBLIC_FIREBASE_API_KEY or add it to your environment file before running."
  fi
fi
[[ -n "$firebase_key" ]] || fail "The Firebase public web API key is required at build time."
http_url="$(public_setting NEXT_PUBLIC_AI_VIVA_BACKEND_HTTP_URL)"
ws_url="$(public_setting NEXT_PUBLIC_AI_VIVA_BACKEND_WS_URL)"
http_url="${http_url:-https://ai-viva-backend-917765808203.us-central1.run.app}"
ws_url="${ws_url:-wss://ai-viva-backend-917765808203.us-central1.run.app}"

# A new tag prevents a failed build from accidentally deploying an old :latest.
build_tag="build-$(date -u +%Y%m%d-%H%M%S)-${RANDOM}${RANDOM}"
image_repo="${region}-docker.pkg.dev/${project}/${repository}/${service}"
image="${image_repo}:${build_tag}"
latest_image="${image_repo}:latest"
revision="${service}-${build_tag}"
[[ ${#revision} -le 63 ]] || fail "Service name is too long for a unique revision name."

printf 'Project: %s | Region: %s | Service: %s\n' "$project" "$region" "$service"
printf 'Source: %s\nImage: %s\n' "$repo_root" "$image"
[[ -z "$env_file" ]] || printf 'Public build settings: %s\n' "$env_file"
printf '\n[1/5] Building current local files for Linux amd64...\n'
stage="building the image"
docker build --platform linux/amd64 \
  --build-arg "NEXT_PUBLIC_FIREBASE_API_KEY=$firebase_key" \
  --build-arg "NEXT_PUBLIC_AI_VIVA_BACKEND_HTTP_URL=$http_url" \
  --build-arg "NEXT_PUBLIC_AI_VIVA_BACKEND_WS_URL=$ws_url" \
  --tag "$image" --tag "$latest_image" .

printf '\n[2/5] Exporting the successful build...\n'
stage="exporting the image"
transfer_dir="$(mktemp -d "$temp_root/urologics-deploy.XXXXXXXX")"
upload_dir="$transfer_dir/source"
mkdir -- "$upload_dir"
docker save --output "$upload_dir/image.tar" "$image" "$latest_image"
node --input-type=module - "$image" "$latest_image" > "$upload_dir/cloudbuild.json" <<'NODE'
const images = process.argv.slice(2);
console.log(JSON.stringify({
  steps: [{name: 'gcr.io/cloud-builders/docker', args: ['load', '--input', '/workspace/image.tar']}],
  images,
}));
NODE

printf '\n[3/5] Uploading through Cloud Build (avoids Cloud Shell registry push failures)...\n'
stage="uploading and publishing the image with Cloud Build"
# Submit only the image archive/config, never the source directory or .env files.
gcloud builds submit "$upload_dir" \
  --config="$upload_dir/cloudbuild.json" \
  --project="$project" --region="$region" \
  --suppress-logs --format=json --quiet > "$transfer_dir/build-result.json"
digest="$(node --input-type=module - "$transfer_dir/build-result.json" "$image" <<'NODE'
import {readFileSync} from 'node:fs';
const [file, image] = process.argv.slice(2);
const build = JSON.parse(readFileSync(file, 'utf8'));
const digest = build.results?.images?.find(entry => entry.name === image)?.digest;
if (build.status !== 'SUCCESS' || !/^sha256:[a-f0-9]{64}$/.test(digest || '')) {
  throw new Error('Cloud Build did not return a successful digest for this exact image. Deployment cancelled.');
}
process.stdout.write(digest);
NODE
)"
exact_image="${image_repo}@${digest}"

printf '\n[4/5] Deploying the exact image and checking the new revision...\n'
stage="deploying the new Cloud Run revision"
# Preserve the service's runtime environment, Secret Manager bindings and IAM.
gcloud run deploy "$service" --image="$exact_image" \
  --project="$project" --region="$region" --port=8080 \
  --revision-suffix="$build_tag" --no-traffic --quiet
gcloud run revisions describe "$revision" \
  --project="$project" --region="$region" --format=json > "$transfer_dir/revision.json"
node --input-type=module - "$transfer_dir/revision.json" "$digest" "$exact_image" <<'NODE'
import {readFileSync} from 'node:fs';
const [file, digest, expectedImage] = process.argv.slice(2);
const revision = JSON.parse(readFileSync(file, 'utf8'));
const ready = revision.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True');
const image = revision.status?.imageDigest || '';
// An OCI index may resolve to a platform manifest; its requested digest stays in spec.
const matches = image === digest || image.endsWith('@' + digest) ||
  revision.spec?.containers?.[0]?.image === expectedImage;
if (!ready || !matches) {
  throw new Error('The revision is not ready with the expected image. Traffic was not switched.');
}
NODE

printf '\n[5/5] Routing 100%% of traffic to this revision...\n'
stage="routing traffic to the new revision"
gcloud run services update-traffic "$service" --to-revisions="$revision=100" \
  --project="$project" --region="$region" --quiet --format=json > "$transfer_dir/service.json"
app_url="$(node --input-type=module - "$transfer_dir/service.json" "$revision" <<'NODE'
import {readFileSync} from 'node:fs';
const [file, revision] = process.argv.slice(2);
const service = JSON.parse(readFileSync(file, 'utf8'));
if (!service.status?.traffic?.some(t => t.revisionName === revision && t.percent === 100)) {
  throw new Error('Cloud Run did not confirm 100% traffic on the new revision. Check the service.');
}
if (!service.status.url) throw new Error('Cloud Run did not return a service URL.');
process.stdout.write(service.status.url.replace(/\/$/, '') + '/web');
NODE
)"
printf '\nDeployment successful.\nRevision: %s\nImage: %s\nApp URL: %s\n' "$revision" "$exact_image" "$app_url"

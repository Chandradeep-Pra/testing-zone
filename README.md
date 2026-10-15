This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

In Google Cloud Shell, sync the latest project files, then build and deploy in one run:

```bash
bash deploy.sh
```

The script builds the current saved files (including uncommitted changes), exports the successful image, publishes it through Cloud Build, deploys its exact digest, and routes 100% of Cloud Run traffic to the new revision. Each run has a unique tag and also publishes `latest`. Docker's cache is safe to reuse; changed source files are rebuilt. A failed step stops deployment. The script does not pull Git changes for you.

Public build settings come from exported `NEXT_PUBLIC_*` variables, then the first available file: `.env.prod.stud`, `.env.production.local`, `.env.local`, `.env.production`, `.env`. Set `VIVA_ENV_FILE` to choose another file. If no Firebase key is available, an interactive run asks for it. Only the public Firebase key and AI Viva HTTP/WS URLs become build arguments. Existing Cloud Run runtime variables, secrets and access settings are preserved; local server variables are not imported.

Defaults: project `proud-woods-489814-s6`, region `asia-south1`, service `urologics-web-app`, repository `cloud-run-source-deploy`. Optional overrides are `VIVA_PROJECT_ID`, `VIVA_REGION`, `VIVA_SERVICE`, `VIVA_REPOSITORY` and `VIVA_FIREBASE_API_KEY`. Run with a current Node.js 22+, Docker Linux engine and authenticated `gcloud`, as available in Cloud Shell.

This deploys the Cloud Run service. The existing Firebase Hosting rewrites still control which service appears at `https://urologics.co.uk/web`; the script does not change those routes.

Script regression checks use mocked Docker/Google Cloud commands and do not deploy anything: `node --test tests/deploy-script.test.mjs`.

Deploy this app as `urologics-web-app` on Cloud Run, with Firebase Hosting routing `/web` directly to it. See [DEPLOYMENT.md](DEPLOYMENT.md) and the main application's `docs/firebase-hosting.md`.

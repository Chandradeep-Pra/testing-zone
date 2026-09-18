# Viva browser regression

Start an isolated development server in PowerShell:

```powershell
$env:NEXT_PUBLIC_FIREBASE_API_KEY = 'viva-test'
npx next dev --hostname 127.0.0.1 -p 3011
```

In another terminal, run:

```powershell
npm run test:viva:browser
```

Chrome or Edge must be installed; set `CHROME_PATH` if automatic detection fails.
The script uses fake camera/microphone input and intercepts external services.
It checks fast and calm startup, the preparation indicator, first-audio failure
and retry, and the selected examiner voice through the second question.
Screenshots are saved in `.viva-test-artifacts`.

The audio fixture is a tone. These checks verify voice selection in requests;
they do not verify the live provider's sound, pronunciation, or latency.

## Local URL modes

The production deployment uses `/web`. To run the app standalone at the root,
start a fresh process with an empty base path:

```powershell
$env:NEXT_PUBLIC_APP_BASE_PATH = ''
npm run deb -- --port 3011
```

Then open `http://localhost:3011/ai-viva/cases`. For deployment-shaped local
testing, use the default configuration and open
`http://localhost:3011/web/ai-viva/cases`.

Login requires a valid `NEXT_PUBLIC_FIREBASE_API_KEY` in `.env.local`. The app
uses Firebase REST sign-in and then loads the profile through
`/api/urologics/access`; mocked browser tests should intercept both calls.

## Authenticated automation state

Create an ignored authenticated state file when a test needs a real account:

```powershell
$env:AUTOMATION_EMAIL = 'your-account@example.com'
$env:AUTOMATION_PASSWORD = 'your-password'
npm run test:auth:setup
```

The helper signs in at `https://urologics.co.uk/web/login`, reads the app's
authenticated local-storage record, and writes `.viva-test-artifacts/auth-state.json`.
It never prints or commits credentials or tokens. Use a dedicated test account and
remove or expire the generated state after testing.

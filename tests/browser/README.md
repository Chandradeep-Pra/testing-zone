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

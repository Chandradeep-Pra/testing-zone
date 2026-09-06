import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prepareTextForMedicalTts } from '../lib/medical-terminology.ts';

test('uppercase medical abbreviations are spelled using letter names', () => {
  assert.equal(prepareTextForMedicalTts('CT MRI PSA TURBT', []), 'see tee em ar eye pee ess ay tee you ar bee tee');
});
test('sentence full stops become pauses while decimals remain intact', () => {
  assert.equal(prepareTextForMedicalTts('Review CT. Give 2.5 mg. Then reassess.', []), 'Review see tee\n Give 2.5 mg\n Then reassess\n');
});
test('dotted abbreviations are spelled without saying dot', () => {
  assert.equal(prepareTextForMedicalTts('C.T. and M.R.I.', []), 'see tee and em ar eye');
});
test('ordinary capitalized words retain natural pronunciation', () => {
  assert.equal(prepareTextForMedicalTts('Discuss Computed Tomography?', []), 'Discuss Computed Tomography?');
});
test('case-specific pronunciations cannot override uppercase spelling', () => {
  assert.equal(prepareTextForMedicalTts('CT nephrectomy.', [
    {canonical:'CT', spokenVariants:[], tts:'cot'},
    {canonical:'nephrectomy', spokenVariants:[], tts:'nef reck tuh mee'},
  ]), 'see tee nef reck tuh mee\n');
});

test('leading decimal doses retain their decimal point', () => {
  assert.equal(prepareTextForMedicalTts('Give .5 mg.', []), 'Give .5 mg\n');
});

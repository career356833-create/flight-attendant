import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_SELF_INTRODUCTION_LANGUAGE, selfIntroductionLanguageHint, selfIntroductionPrompt } from './self-introduction-language'

test('self introduction keeps Korean as the default and maps explicit English only',()=>{
  assert.equal(DEFAULT_SELF_INTRODUCTION_LANGUAGE,'ko')
  assert.equal(selfIntroductionLanguageHint('ko'),'ko')
  assert.equal(selfIntroductionLanguageHint('en'),'en')
  assert.match(selfIntroductionPrompt('en'),/Introduce yourself/)
})

export type SelfIntroductionLanguage='ko'|'en'
export const DEFAULT_SELF_INTRODUCTION_LANGUAGE:SelfIntroductionLanguage='ko'
export const selfIntroductionLanguageHint=(language:SelfIntroductionLanguage)=>language
export const selfIntroductionPrompt=(language:SelfIntroductionLanguage)=>language==='en'
  ? 'Introduce yourself through the strength and experience that best represent you.'
  : '본인을 가장 잘 보여주는 강점과 경험을 중심으로\n자기소개해 주세요.'

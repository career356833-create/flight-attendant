export const SELF_INTRODUCTION_AUDIO_SAVE_WARNING =
  "결과는 저장됐지만 이 기기의 음성 저장에 실패했습니다. 결과 확인과 다시 연습은 계속할 수 있습니다.";

export async function saveSelfIntroductionAudioSafely(
  attemptId: string,
  blob: Blob | null,
  save: (attemptId: string, blob: Blob) => Promise<void>,
) {
  if (!blob) return { audioSaved: false, warning: undefined };
  try {
    await save(attemptId, blob);
    return { audioSaved: true, warning: undefined };
  } catch {
    return {
      audioSaved: false,
      warning: SELF_INTRODUCTION_AUDIO_SAVE_WARNING,
    };
  }
}

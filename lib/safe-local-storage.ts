export type LocalWriteFailureReason =
  | "quota_exceeded"
  | "storage_unavailable"
  | "serialization_failed"
  | "unknown";

export type LocalWriteResult =
  | { ok: true }
  | { ok: false; reason: LocalWriteFailureReason };

export type LocalStorageWriteCategory =
  | "interview_attempt"
  | "self_introduction_attempt"
  | "experience"
  | "application"
  | "learning"
  | "mock_session"
  | "practice_queue"
  | "favorite"
  | "resume"
  | "profile"
  | "settings"
  | "other";

export type LocalStorageWriteFailureDetail = {
  category: LocalStorageWriteCategory;
  operation: "write";
  reason: LocalWriteFailureReason;
};

export const LOCAL_STORAGE_WRITE_FAILED_EVENT =
  "cabin:local-storage-write-failed";

type StorageWriter = Pick<Storage, "setItem">;
type SafeWriteOptions = {
  category?: LocalStorageWriteCategory;
  storage?: StorageWriter;
  serialize?: (value: unknown) => string;
  notify?: boolean;
};

function classifyWriteError(error: unknown): LocalWriteFailureReason {
  if (!(error instanceof DOMException)) return "unknown";
  if (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  )
    return "quota_exceeded";
  if (
    error.name === "SecurityError" ||
    error.name === "InvalidStateError" ||
    error.name === "NotSupportedError"
  )
    return "storage_unavailable";
  return "unknown";
}

function notifyFailure(
  category: LocalStorageWriteCategory,
  reason: LocalWriteFailureReason,
) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent<LocalStorageWriteFailureDetail>(
        LOCAL_STORAGE_WRITE_FAILED_EVENT,
        { detail: { category, operation: "write", reason } },
      ),
    );
  } catch {
    // Reporting must never turn a storage failure into an app crash.
  }
}

export function safeLocalStorageWrite(
  key: string,
  value: unknown,
  options: SafeWriteOptions = {},
): LocalWriteResult {
  const category = options.category ?? "other";
  let serialized: string;
  try {
    serialized = (options.serialize ?? JSON.stringify)(value);
    if (typeof serialized !== "string") throw new TypeError("serialization_failed");
  } catch {
    const result = {
      ok: false as const,
      reason: "serialization_failed" as const,
    };
    if (options.notify !== false) notifyFailure(category, result.reason);
    return result;
  }

  try {
    const storage =
      options.storage ??
      (typeof localStorage === "undefined" ? undefined : localStorage);
    if (!storage) {
      const result = {
        ok: false as const,
        reason: "storage_unavailable" as const,
      };
      if (options.notify !== false) notifyFailure(category, result.reason);
      return result;
    }
    storage.setItem(key, serialized);
    return { ok: true };
  } catch (error) {
    const reason = classifyWriteError(error);
    const result = { ok: false as const, reason };
    if (options.notify !== false) notifyFailure(category, reason);
    return result;
  }
}

export function localWriteFailureMessage(
  reason: LocalWriteFailureReason,
  locale: "ko" | "en" = "ko",
) {
  const messages = {
    ko: {
      quota_exceeded:
        "저장 공간이 부족해 이 기기에 기록을 저장하지 못했습니다. 브라우저 저장 공간을 확보한 뒤 다시 저장해 주세요.",
      storage_unavailable:
        "이 브라우저에서는 로컬 저장을 사용할 수 없습니다. 현재 결과는 화면에서 확인할 수 있지만 재방문 시 복원되지 않을 수 있습니다.",
      serialization_failed:
        "기록을 저장 가능한 형식으로 준비하지 못했습니다. 현재 결과를 확인한 뒤 다시 저장해 주세요.",
      unknown:
        "이 기기에 기록을 저장하지 못했습니다. 현재 결과를 확인한 뒤 다시 저장해 주세요.",
    },
    en: {
      quota_exceeded:
        "This device is out of browser storage. Free some storage, then save again.",
      storage_unavailable:
        "Local storage is unavailable in this browser. You can review the current result, but it may not be restored later.",
      serialization_failed:
        "The record could not be prepared for storage. Review the current result, then save again.",
      unknown:
        "The record was not saved on this device. Review the current result, then save again.",
    },
  } as const;
  return messages[locale][reason];
}

"use client";

import { useEffect, useState } from "react";
import {
  LOCAL_STORAGE_WRITE_FAILED_EVENT,
  localWriteFailureMessage,
  type LocalStorageWriteFailureDetail,
} from "@/lib/safe-local-storage";

export function LocalStorageFailureNotice() {
  const [failure, setFailure] =
    useState<LocalStorageWriteFailureDetail | null>(null);

  useEffect(() => {
    const handleFailure = (event: Event) => {
      setFailure(
        (event as CustomEvent<LocalStorageWriteFailureDetail>).detail,
      );
    };
    window.addEventListener(LOCAL_STORAGE_WRITE_FAILED_EVENT, handleFailure);
    return () =>
      window.removeEventListener(LOCAL_STORAGE_WRITE_FAILED_EVENT, handleFailure);
  }, []);

  if (!failure) return null;
  return (
    <div
      role="alert"
      className="absolute inset-x-4 top-4 z-[100] mx-auto max-w-xl rounded-2xl border border-coral/30 bg-card p-4 shadow-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-navy">이 기기에 저장되지 않음</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {localWriteFailureMessage(failure.reason)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFailure(null)}
          className="min-h-11 shrink-0 rounded-xl px-3 text-xs font-bold text-navy"
          aria-label="저장 실패 안내 닫기"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

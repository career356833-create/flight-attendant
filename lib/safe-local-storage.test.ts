import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { derivePersistencePresentation } from "./persistence-provenance";
import {
  localWriteFailureMessage,
  safeLocalStorageWrite,
} from "./safe-local-storage";

const memoryStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  let writes = 0;
  return {
    storage: {
      setItem(key: string, value: string) {
        writes += 1;
        values.set(key, value);
      },
    },
    value: (key: string) => values.get(key),
    writes: () => writes,
  };
};

const source = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

test("normal write succeeds", () => {
  const memory = memoryStorage();
  assert.deepEqual(
    safeLocalStorageWrite("key", { saved: true }, { storage: memory.storage }),
    { ok: true },
  );
  assert.equal(memory.value("key"), '{"saved":true}');
});
test("quota exceeded is classified", () => {
  const storage = {
    setItem() {
      throw new DOMException("full", "QuotaExceededError");
    },
  };
  assert.deepEqual(safeLocalStorageWrite("key", 1, { storage, notify: false }), {
    ok: false,
    reason: "quota_exceeded",
  });
});
test("Firefox quota error name is classified", () => {
  const storage = {
    setItem() {
      throw new DOMException("full", "NS_ERROR_DOM_QUOTA_REACHED");
    },
  };
  assert.equal(
    safeLocalStorageWrite("key", 1, { storage, notify: false }).ok,
    false,
  );
});
test("missing storage is unavailable", () =>
  assert.deepEqual(
    safeLocalStorageWrite("key", 1, { storage: undefined, notify: false }),
    { ok: false, reason: "storage_unavailable" },
  ));
test("blocked storage is unavailable", () => {
  const storage = {
    setItem() {
      throw new DOMException("blocked", "SecurityError");
    },
  };
  assert.deepEqual(safeLocalStorageWrite("key", 1, { storage, notify: false }), {
    ok: false,
    reason: "storage_unavailable",
  });
});
test("serialization failure is classified", () => {
  const memory = memoryStorage();
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.deepEqual(
    safeLocalStorageWrite("key", circular, { storage: memory.storage, notify: false }),
    { ok: false, reason: "serialization_failed" },
  );
});
test("unknown write error is classified", () => {
  const storage = {
    setItem() {
      throw new Error("unknown");
    },
  };
  assert.deepEqual(safeLocalStorageWrite("key", 1, { storage, notify: false }), {
    ok: false,
    reason: "unknown",
  });
});
test("write failures do not throw to UI boundary", () => {
  const storage = { setItem: () => { throw new Error("no"); } };
  assert.doesNotThrow(() =>
    safeLocalStorageWrite("key", { answer: "private" }, { storage, notify: false }),
  );
});
test("serialization failure preserves existing value", () => {
  const memory = memoryStorage({ key: "existing" });
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  safeLocalStorageWrite("key", circular, { storage: memory.storage, notify: false });
  assert.equal(memory.value("key"), "existing");
  assert.equal(memory.writes(), 0);
});
test("one call performs at most one storage attempt", () => {
  const memory = memoryStorage();
  safeLocalStorageWrite("key", { value: 1 }, { storage: memory.storage });
  assert.equal(memory.writes(), 1);
});
test("local failure never becomes synced", () =>
  assert.equal(
    derivePersistencePresentation({ localWrite: "failed", syncSupported: true, remoteWriteSucceeded: true }).status,
    "local_write_failed",
  ));
test("local failure never becomes pending", () =>
  assert.notEqual(
    derivePersistencePresentation({ localWrite: "failed", syncSupported: true, syncState: "pending" }).status,
    "sync_pending",
  ));
test("Korean quota label is honest", () =>
  assert.match(localWriteFailureMessage("quota_exceeded", "ko"), /저장 공간이 부족/));
test("Korean unavailable label is honest", () =>
  assert.match(localWriteFailureMessage("storage_unavailable", "ko"), /로컬 저장을 사용할 수 없습니다/));
test("English quota label is honest", () =>
  assert.match(localWriteFailureMessage("quota_exceeded", "en"), /out of browser storage/));
test("English unavailable label is honest", () =>
  assert.match(localWriteFailureMessage("storage_unavailable", "en"), /unavailable/));
test("failure helper contains no console logging", () =>
  assert.doesNotMatch(source("safe-local-storage.ts"), /console\./));
test("failure event contains categories, not stored content", () => {
  const helper = source("safe-local-storage.ts");
  assert.match(helper, /category, operation: "write", reason/);
  assert.doesNotMatch(helper, /detail:.*value|detail:.*serialized/);
});
test("interview only queues sync after local success", () => {
  const engine = source("../components/interview-practice/interview-practice-engine.tsx");
  assert.match(engine, /const localSave=saveInterviewAttempt\(next\);if\(localSave\.ok\)[\s\S]*queueTrainingAttempt/);
});
test("interview result remains visible after local failure", () => {
  const engine = source("../components/interview-practice/interview-practice-engine.tsx");
  assert.match(engine, /if\(localSave\.ok\)[\s\S]*setAttempt\(next\);setStep\('result'\)/);
});
test("interview completion callback is not duplicated after local failure", () => {
  const engine = source("../components/interview-practice/interview-practice-engine.tsx");
  assert.match(engine, /if\(localSave\.ok\)[\s\S]*onComplete\(next\)[\s\S]*setAttempt/);
  assert.equal(engine.match(/onComplete\(next\)/g)?.length, 1);
});
test("self introduction metadata gates audio and sync", () => {
  const flow = source("../components/self-introduction/self-introduction-flow.tsx");
  assert.match(flow, /const localSave = saveSelfIntroductionAttempt\(next\)/);
  assert.match(flow, /if \(localSave\.ok\) \{[\s\S]*queueTrainingAttempt/);
});
test("self introduction result remains visible after local failure", () => {
  const flow = source("../components/self-introduction/self-introduction-flow.tsx");
  assert.match(flow, /if \(localSave\.ok\)[\s\S]*setAttempt\(next\);[\s\S]*setStep\("result"\)/);
});
test("experience mutation event requires local success", () =>
  assert.match(source("experience-repository.ts"), /if\(saved\.ok\)emitMutation/));
test("experience pull cannot claim synced after local cache failure", () =>
  assert.match(source("supabase/experience-sync-repository.ts"), /const localSave=experienceRepository\.save\(result\.merged\);if\(!localSave\.ok\)return;[\s\S]*status:'synced'/));
test("application saved event requires local success", () =>
  assert.match(source("application-answer-repository.ts"), /if \(!saved\.ok\) return null;[\s\S]*application-answer-saved/));
test("learning changed event requires local success", () =>
  assert.match(source("learning-analytics-repository.ts"), /if\(result\.ok\)window\.dispatchEvent/));
test("queue write exposes failure instead of throwing", () =>
  assert.match(source("interview-practice-queue.ts"), /return result\.ok/));
test("favorite and queue writes have distinct safe categories", () =>
  assert.match(source("interview-practice-queue.ts"), /key===FAVORITES\?'favorite':'practice_queue'/));
test("resume write uses the common safe contract", () =>
  assert.match(source("single-interview-resume.ts"), /safeLocalStorageWrite\(SINGLE_INTERVIEW_RESUME_KEY/));
test("mock completion only updates weekly state after session save", () => {
  const home = source("../components/home-dashboard.tsx");
  assert.match(home, /const saved=saveInterviewSession\(completed\);if\(saved\.ok\)completeWeeklyTask/);
});
test("global notice is an accessible alert", () =>
  assert.match(source("../components/local-storage-failure-notice.tsx"), /role="alert"/));
test("storage keys remain version-compatible", () => {
  assert.match(source("interview-practice-data.ts"), /cabin-interview-attempts-v1/);
  assert.match(source("self-introduction-data.ts"), /cabin-self-introduction-attempts-v1/);
  assert.match(source("experience-repository.ts"), /cabin-career-experiences/);
  assert.match(source("learning-analytics-repository.ts"), /cabin-learning-analytics/);
});

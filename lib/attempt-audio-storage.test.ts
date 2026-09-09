import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ATTEMPT_AUDIO_DB_NAME,
  ATTEMPT_AUDIO_DB_VERSION,
  ATTEMPT_AUDIO_STORE_NAME,
  AttemptAudioStorageError,
  openAttemptAudioDb,
  readAttemptAudio,
  writeAttemptAudio,
} from "./attempt-audio-storage";
import {
  SELF_INTRODUCTION_AUDIO_SAVE_WARNING,
  saveSelfIntroductionAudioSafely,
} from "./self-introduction-audio-recovery";

type Store = Map<IDBValidKey, unknown>;

class FakeIndexedDb {
  version = 0;
  stores = new Map<string, Store>();
  openFails = false;
  writeFails = false;
  readFails = false;
  upgrades = 0;

  seedStore(name = ATTEMPT_AUDIO_STORE_NAME) {
    const store = new Map<IDBValidKey, unknown>();
    this.stores.set(name, store);
    return store;
  }

  asFactory() {
    return { open: this.open.bind(this) } as unknown as IDBFactory;
  }

  private database() {
    const owner = this;
    return {
      objectStoreNames: { contains: (name: string) => owner.stores.has(name) },
      createObjectStore(name: string) {
        if (owner.stores.has(name)) throw new Error("ConstraintError");
        owner.seedStore(name);
        return {} as IDBObjectStore;
      },
      transaction(name: string, mode: IDBTransactionMode) {
        if (!owner.stores.has(name)) throw new Error("NotFoundError");
        const transaction = {
          oncomplete: null,
          onerror: null,
          onabort: null,
          objectStore() {
            return {
              put(value: unknown, key: IDBValidKey) {
                queueMicrotask(() => {
                  if (owner.writeFails) {
                    (transaction.onerror as (() => void) | null)?.();
                    return;
                  }
                  owner.stores.get(name)?.set(key, value);
                  (transaction.oncomplete as (() => void) | null)?.();
                });
                return {} as IDBRequest;
              },
              delete(key: IDBValidKey) {
                queueMicrotask(() => {
                  owner.stores.get(name)?.delete(key);
                  (transaction.oncomplete as (() => void) | null)?.();
                });
                return {} as IDBRequest;
              },
              get(key: IDBValidKey) {
                const request: {
                  result: unknown;
                  onsuccess: (() => void) | null;
                  onerror: (() => void) | null;
                } = { result: undefined, onsuccess: null, onerror: null };
                queueMicrotask(() => {
                  if (owner.readFails) {
                    (request.onerror as (() => void) | null)?.();
                    return;
                  }
                  request.result = owner.stores.get(name)?.get(key);
                  (request.onsuccess as (() => void) | null)?.();
                });
                return request as unknown as IDBRequest;
              },
            } as IDBObjectStore;
          },
        };
        assert.ok(mode === "readonly" || mode === "readwrite");
        return transaction as unknown as IDBTransaction;
      },
      close() {},
    } as unknown as IDBDatabase;
  }

  open(_name: string, version?: number) {
    const request = {
      result: undefined as unknown as IDBDatabase,
      error: null,
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      onblocked: null,
    };
    queueMicrotask(() => {
      if (this.openFails) {
        (request.onerror as (() => void) | null)?.();
        return;
      }
      const oldVersion = this.version;
      request.result = this.database();
      if ((version ?? oldVersion) > oldVersion) {
        this.version = version ?? oldVersion;
        this.upgrades += 1;
        (request.onupgradeneeded as ((event: { oldVersion: number }) => void) | null)?.({ oldVersion });
      }
      (request.onsuccess as (() => void) | null)?.();
    });
    return request as unknown as IDBOpenDBRequest;
  }
}

test("audio storage keeps the existing database identity and upgrades to version two", () => {
  assert.equal(ATTEMPT_AUDIO_DB_NAME, "cabin-training-audio");
  assert.equal(ATTEMPT_AUDIO_STORE_NAME, "attempt-audio");
  assert.equal(ATTEMPT_AUDIO_DB_VERSION, 2);
});

test("fresh read-before-write bootstraps the store and returns null", async () => {
  const fake = new FakeIndexedDb();
  assert.equal(await readAttemptAudio("missing", fake.asFactory()), null);
  assert.ok(fake.stores.has(ATTEMPT_AUDIO_STORE_NAME));
});

test("legacy version-one database without a store is recovered", async () => {
  const fake = new FakeIndexedDb();
  fake.version = 1;
  const opened = await openAttemptAudioDb(fake.asFactory());
  assert.equal(opened.recovery, "store_missing_recovered");
  assert.ok(fake.stores.has(ATTEMPT_AUDIO_STORE_NAME));
});

test("legacy upgrade preserves existing store data", async () => {
  const fake = new FakeIndexedDb();
  fake.version = 1;
  const blob = new Blob(["kept"], { type: "audio/webm" });
  fake.seedStore().set("old", blob);
  assert.equal(await readAttemptAudio("old", fake.asFactory()), blob);
});

test("repeated database opens are idempotent", async () => {
  const fake = new FakeIndexedDb();
  (await openAttemptAudioDb(fake.asFactory())).db.close();
  (await openAttemptAudioDb(fake.asFactory())).db.close();
  assert.equal(fake.upgrades, 1);
});

test("write then read returns the local audio blob", async () => {
  const fake = new FakeIndexedDb();
  const blob = new Blob(["voice"], { type: "audio/webm" });
  assert.equal((await writeAttemptAudio("a", blob, fake.asFactory())).status, "saved");
  assert.equal(await readAttemptAudio("a", fake.asFactory()), blob);
});

test("a missing key remains a safe null", async () => {
  const fake = new FakeIndexedDb();
  fake.version = 2;
  fake.seedStore();
  assert.equal(await readAttemptAudio("unknown", fake.asFactory()), null);
});

test("a non-Blob legacy value is treated as missing audio", async () => {
  const fake = new FakeIndexedDb();
  fake.version = 2;
  fake.seedStore().set("corrupt", "not audio");
  assert.equal(await readAttemptAudio("corrupt", fake.asFactory()), null);
});

test("database open failure has a safe category", async () => {
  const fake = new FakeIndexedDb();
  fake.openFails = true;
  await assert.rejects(readAttemptAudio("a", fake.asFactory()), (error) => error instanceof AttemptAudioStorageError && error.code === "db_open_failed");
});

test("write failure has a safe category", async () => {
  const fake = new FakeIndexedDb();
  fake.writeFails = true;
  await assert.rejects(writeAttemptAudio("a", new Blob(["x"]), fake.asFactory()), (error) => error instanceof AttemptAudioStorageError && error.code === "write_failed");
});

test("read failure has a safe category", async () => {
  const fake = new FakeIndexedDb();
  fake.version = 2;
  fake.seedStore();
  fake.readFails = true;
  await assert.rejects(readAttemptAudio("a", fake.asFactory()), (error) => error instanceof AttemptAudioStorageError && error.code === "read_failed");
});

test("no recording performs no audio write", async () => {
  let calls = 0;
  const result = await saveSelfIntroductionAudioSafely("a", null, async () => { calls += 1; });
  assert.deepEqual(result, { audioSaved: false, warning: undefined });
  assert.equal(calls, 0);
});

test("successful local write is eligible for the existing audio queue policy", async () => {
  const result = await saveSelfIntroductionAudioSafely("a", new Blob(["x"]), async () => {});
  assert.deepEqual(result, { audioSaved: true, warning: undefined });
});

test("failed local write preserves result flow and reports audio unavailable", async () => {
  const result = await saveSelfIntroductionAudioSafely("a", new Blob(["x"]), async () => { throw new Error("quota"); });
  assert.equal(result.audioSaved, false);
  assert.equal(result.warning, SELF_INTRODUCTION_AUDIO_SAVE_WARNING);
});

test("audio failure warning is honest about result and device storage", () => {
  assert.match(SELF_INTRODUCTION_AUDIO_SAVE_WARNING, /결과는 저장됐지만/);
  assert.match(SELF_INTRODUCTION_AUDIO_SAVE_WARNING, /이 기기의 음성 저장에 실패/);
  assert.doesNotMatch(SELF_INTRODUCTION_AUDIO_SAVE_WARNING, /전체 저장 실패|클라우드|계정에 저장/);
});

test("flow queues remote audio only after a successful local audio write", () => {
  const source = readFileSync(new URL("../components/self-introduction/self-introduction-flow.tsx", import.meta.url), "utf8");
  assert.match(source, /queueTrainingAttempt\("self_introduction", next, audioSave\.audioSaved\)/);
  assert.doesNotMatch(source, /queueTrainingAttempt\("self_introduction", next, Boolean\(blob\)\)/);
});

test("attempt completion and progress effects remain single after audio recovery", () => {
  const source = readFileSync(new URL("../components/self-introduction/self-introduction-flow.tsx", import.meta.url), "utf8");
  assert.equal(source.match(/saveSelfIntroductionAttempt\(next\)/g)?.length, 1);
  assert.equal(source.match(/recordAttemptProgress\(next\)/g)?.length, 1);
  assert.equal(source.match(/onComplete\(next\)/g)?.length, 1);
  const metadataSave = source.indexOf("saveSelfIntroductionAttempt(next)");
  const audioSave = source.indexOf("const audioSave = await saveSelfIntroductionAudioSafely");
  assert.ok(metadataSave < audioSave);
  assert.ok(audioSave < source.indexOf('setStep("result")', audioSave));
});

test("missing audio UI keeps result, history, and retake available", () => {
  const source = readFileSync(new URL("../components/self-introduction/self-introduction-components.tsx", import.meta.url), "utf8");
  assert.match(source, /저장된 결과는 계속 확인할 수 있습니다/);
  assert.match(source, /같은 조건으로 다시 연습/);
  assert.match(source, /AttemptHistory/);
});

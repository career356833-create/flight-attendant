export const ATTEMPT_AUDIO_DB_NAME = "cabin-training-audio";
export const ATTEMPT_AUDIO_DB_VERSION = 2;
export const ATTEMPT_AUDIO_STORE_NAME = "attempt-audio";

export type AttemptAudioStorageErrorCode =
  | "db_open_failed"
  | "write_failed"
  | "read_failed";

export class AttemptAudioStorageError extends Error {
  constructor(readonly code: AttemptAudioStorageErrorCode) {
    super(code);
    this.name = "AttemptAudioStorageError";
  }
}

export type AttemptAudioDbOpenResult = {
  db: IDBDatabase;
  recovery?: "store_missing_recovered";
};

export function openAttemptAudioDb(
  factory: IDBFactory = indexedDB,
): Promise<AttemptAudioDbOpenResult> {
  return new Promise((resolve, reject) => {
    let recovery: AttemptAudioDbOpenResult["recovery"];
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(ATTEMPT_AUDIO_DB_NAME, ATTEMPT_AUDIO_DB_VERSION);
    } catch {
      reject(new AttemptAudioStorageError("db_open_failed"));
      return;
    }
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ATTEMPT_AUDIO_STORE_NAME)) {
        db.createObjectStore(ATTEMPT_AUDIO_STORE_NAME);
        if ((event as IDBVersionChangeEvent).oldVersion > 0) {
          recovery = "store_missing_recovered";
        }
      }
    };
    request.onerror = () => reject(new AttemptAudioStorageError("db_open_failed"));
    request.onblocked = () => reject(new AttemptAudioStorageError("db_open_failed"));
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ATTEMPT_AUDIO_STORE_NAME)) {
        db.close();
        reject(new AttemptAudioStorageError("db_open_failed"));
        return;
      }
      resolve({ db, recovery });
    };
  });
}

export async function writeAttemptAudio(
  attemptId: string,
  blob: Blob,
  factory?: IDBFactory,
) {
  const { db, recovery } = await openAttemptAudioDb(factory);
  try {
    await new Promise<void>((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction = db.transaction(ATTEMPT_AUDIO_STORE_NAME, "readwrite");
        transaction.objectStore(ATTEMPT_AUDIO_STORE_NAME).put(blob, attemptId);
      } catch {
        reject(new AttemptAudioStorageError("write_failed"));
        return;
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new AttemptAudioStorageError("write_failed"));
      transaction.onabort = () => reject(new AttemptAudioStorageError("write_failed"));
    });
    return { status: "saved" as const, recovery };
  } finally {
    db.close();
  }
}

export async function readAttemptAudio(
  attemptId: string,
  factory?: IDBFactory,
): Promise<Blob | null> {
  const { db } = await openAttemptAudioDb(factory);
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      let request: IDBRequest;
      try {
        request = db
          .transaction(ATTEMPT_AUDIO_STORE_NAME, "readonly")
          .objectStore(ATTEMPT_AUDIO_STORE_NAME)
          .get(attemptId);
      } catch {
        reject(new AttemptAudioStorageError("read_failed"));
        return;
      }
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => reject(new AttemptAudioStorageError("read_failed"));
    });
  } finally {
    db.close();
  }
}

export async function removeAttemptAudio(
  attemptId: string,
  factory?: IDBFactory,
) {
  const { db } = await openAttemptAudioDb(factory);
  try {
    await new Promise<void>((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction = db.transaction(ATTEMPT_AUDIO_STORE_NAME, "readwrite");
        transaction.objectStore(ATTEMPT_AUDIO_STORE_NAME).delete(attemptId);
      } catch {
        reject(new AttemptAudioStorageError("write_failed"));
        return;
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new AttemptAudioStorageError("write_failed"));
      transaction.onabort = () => reject(new AttemptAudioStorageError("write_failed"));
    });
  } finally {
    db.close();
  }
}

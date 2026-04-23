/**
 * Web stub for @react-native-async-storage/async-storage
 * Uses localStorage as the backend
 */

function createPromise<T>(
  getValue: () => T,
  callback?: (err?: Error | null, result?: T) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const value = getValue();
      callback?.(null, value);
      resolve(value);
    } catch (err) {
      callback?.(err as Error);
      reject(err);
    }
  });
}

function createPromiseAll<T, R>(
  promises: Promise<T>[],
  callback: ((errors?: (Error | null)[], result?: R | null) => void) | undefined,
  processResult: ((results: T[]) => R) | undefined
): Promise<R | null> {
  return Promise.all(promises).then(
    results => {
      const value = processResult ? processResult(results) : null;
      callback?.(undefined, value);
      return value as R;
    },
    errors => {
      callback?.(errors as Error[]);
      return Promise.reject(errors);
    }
  );
}

function mergeLocalStorageItem(key: string, value: string): void {
  const oldValue = localStorage.getItem(key);
  if (oldValue) {
    const oldObject = JSON.parse(oldValue);
    const newObject = JSON.parse(value);
    const nextValue = JSON.stringify({ ...oldObject, ...newObject });
    localStorage.setItem(key, nextValue);
  } else {
    localStorage.setItem(key, value);
  }
}

const AsyncStorage = {
  getItem: (
    key: string,
    callback?: (err?: Error | null, result?: string | null) => void
  ): Promise<string | null> => {
    return createPromise(() => localStorage.getItem(key), callback);
  },

  setItem: (key: string, value: string, callback?: (err?: Error | null) => void): Promise<void> => {
    return createPromise(() => localStorage.setItem(key, value), callback);
  },

  removeItem: (key: string, callback?: (err?: Error | null) => void): Promise<void> => {
    return createPromise(() => localStorage.removeItem(key), callback);
  },

  mergeItem: (
    key: string,
    value: string,
    callback?: (err?: Error | null) => void
  ): Promise<void> => {
    return createPromise(() => mergeLocalStorageItem(key, value), callback);
  },

  clear: (callback?: (err?: Error | null) => void): Promise<void> => {
    return createPromise(() => localStorage.clear(), callback);
  },

  getAllKeys: (
    callback?: (err?: Error | null, keys?: string[] | null) => void
  ): Promise<string[]> => {
    return createPromise(() => {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
      return keys;
    }, callback);
  },

  flushGetRequests: (): void => {
    // No-op for web
  },

  multiGet: (
    keys: string[],
    callback?: (errors?: (Error | null)[], result?: [string, string | null][] | null) => void
  ): Promise<[string, string | null][]> => {
    const promises = keys.map(key => AsyncStorage.getItem(key) as Promise<string | null>);
    const processResult = (results: (string | null)[]) =>
      results.map((value, i) => [keys[i], value] as [string, string | null]);
    return createPromiseAll(promises, callback, processResult);
  },

  multiSet: (
    keyValuePairs: [string, string][],
    callback?: (errors?: (Error | null)[]) => void
  ): Promise<void> => {
    const promises = keyValuePairs.map(([key, value]) => AsyncStorage.setItem(key, value));
    return createPromiseAll(promises, callback, () => undefined);
  },

  multiRemove: (keys: string[], callback?: (errors?: (Error | null)[]) => void): Promise<void> => {
    const promises = keys.map(key => AsyncStorage.removeItem(key));
    return createPromiseAll(promises, callback, () => undefined);
  },

  multiMerge: (
    keyValuePairs: [string, string][],
    callback?: (errors?: (Error | null)[]) => void
  ): Promise<void> => {
    const promises = keyValuePairs.map(([key, value]) => AsyncStorage.mergeItem(key, value));
    return createPromiseAll(promises, callback, () => undefined);
  },
};

export default AsyncStorage;

/**
 * Runtime environment helpers for browser vs Node.js
 */

export function isBrowser() {
  return (
    typeof globalThis !== "undefined" &&
    typeof globalThis.window !== "undefined" &&
    typeof globalThis.document !== "undefined"
  );
}

export function isNode() {
  return (
    typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null
  );
}

const memoryStorage = new Map();

export function getStorage() {
  if (isBrowser() && typeof localStorage !== "undefined") {
    return localStorage;
  }
  return {
    getItem(key) {
      return memoryStorage.has(key) ? memoryStorage.get(key) : null;
    },
    setItem(key, value) {
      memoryStorage.set(key, String(value));
    },
    removeItem(key) {
      memoryStorage.delete(key);
    },
  };
}

export function bytesToBase64(bytes) {
  if (typeof btoa !== "undefined") {
    return btoa(String.fromCharCode(...bytes));
  }
  return Buffer.from(bytes).toString("base64");
}

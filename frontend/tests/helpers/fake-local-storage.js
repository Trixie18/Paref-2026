// A minimal in-memory stand-in for the browser's localStorage, since
// Node has no native implementation. Good enough for cart.js/auth.js,
// which only ever call getItem/setItem/removeItem.
export function makeFakeLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

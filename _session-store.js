/**
 * Whacka client SDK — _session-store (stub)
 *
 * The implementation runs on the Whacka platform and is provided to your app at
 * runtime; it is intentionally NOT part of this export. This stub only keeps
 * your imports resolving and documents which Whacka APIs your code uses. Your
 * own code (components, pages, hooks) is the real, complete export. See README.
 */

const __wk = (path) =>
  new Proxy(function () {}, {
    get: (_t, prop) =>
      typeof prop === 'symbol' || prop === 'then' ? undefined : __wk(path + '.' + prop),
    apply: () => {
      throw new Error(
        '`' + path + '` runs on the Whacka platform and is not available in exported code.'
      );
    },
  });

export const PREVIEW_SCOPE = __wk('PREVIEW_SCOPE');
export const SCOPED_KEYS = __wk('SCOPED_KEYS');
export const scopeKey = __wk('scopeKey');
export const storeGet = __wk('storeGet');
export const storeSet = __wk('storeSet');
export const storeRemove = __wk('storeRemove');
export const storageDenied = __wk('storageDenied');
export const probeStorage = __wk('probeStorage');
export const _resetSessionStore = __wk('_resetSessionStore');

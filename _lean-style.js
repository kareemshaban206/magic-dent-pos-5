/**
 * Whacka client SDK — _lean-style (stub)
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

export const LEAN_ALWAYS_WRITE = __wk('LEAN_ALWAYS_WRITE');
export const LEAN_WRITE_ALL_TAGS = __wk('LEAN_WRITE_ALL_TAGS');
export const LEAN_HINTED_TABLE = __wk('LEAN_HINTED_TABLE');
export const leanKey = __wk('leanKey');
export const leaveOutValue = __wk('leaveOutValue');
export const releaseLeanSandbox = __wk('releaseLeanSandbox');
export const leanStyleOf = __wk('leanStyleOf');

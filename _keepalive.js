/**
 * Whacka client SDK — _keepalive (stub)
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

export const KEEPALIVE_HEADERS = __wk('KEEPALIVE_HEADERS');
export const isKeepaliveEnvelope = __wk('isKeepaliveEnvelope');
export const unwrapKeepalive = __wk('unwrapKeepalive');
export const DEFAULT_KEEPALIVE_BODY_TIMEOUT_MS = __wk('DEFAULT_KEEPALIVE_BODY_TIMEOUT_MS');
export const readKeepaliveJson = __wk('readKeepaliveJson');
export const throwFromEnvelope = __wk('throwFromEnvelope');

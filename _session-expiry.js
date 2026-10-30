/**
 * Whacka client SDK — _session-expiry (stub)
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

export const SESSION_RENEW_HEADER = __wk('SESSION_RENEW_HEADER');
export const EXPIRY_SKEW_SECONDS = __wk('EXPIRY_SKEW_SECONDS');
export const onSessionExpired = __wk('onSessionExpired');
export const decodeJwtExp = __wk('decodeJwtExp');
export const isJwtExpired = __wk('isJwtExpired');
export const sweepExpiredSession = __wk('sweepExpiredSession');
export const endSessionFor = __wk('endSessionFor');
export const absorbSessionRenewal = __wk('absorbSessionRenewal');

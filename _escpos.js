/**
 * Whacka client SDK — _escpos (stub)
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

export const ESC = __wk('ESC');
export const GS = __wk('GS');
export const PAPER_DOTS = __wk('PAPER_DOTS');
export const DEFAULT_PAPER = __wk('DEFAULT_PAPER');
export const RAWBT_PACKAGE = __wk('RAWBT_PACKAGE');
export const RAWBT_PLAY_URL = __wk('RAWBT_PLAY_URL');
export const DEFAULT_THRESHOLD = __wk('DEFAULT_THRESHOLD');
export const BAND_ROWS = __wk('BAND_ROWS');
export const MAX_JOB_BYTES = __wk('MAX_JOB_BYTES');
export const paperDots = __wk('paperDots');
export const pixelsToBits = __wk('pixelsToBits');
export const escposFromBits = __wk('escposFromBits');
export const bytesToBase64 = __wk('bytesToBase64');
export const rawbtJobUrl = __wk('rawbtJobUrl');
export const decodeEscposRaster = __wk('decodeEscposRaster');

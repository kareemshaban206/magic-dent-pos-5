/**
 * Whacka client SDK — index (stub)
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

export const toSvg = __wk('toSvg');
export const toCanvas = __wk('toCanvas');
export const toPixelData = __wk('toPixelData');
export const toPng = __wk('toPng');
export const toJpeg = __wk('toJpeg');
export const toBlob = __wk('toBlob');
export const getFontEmbedCSS = __wk('getFontEmbedCSS');

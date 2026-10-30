/**
 * Whacka client SDK — svg-charts (stub)
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

export const xesc = __wk('xesc');
export const safeColor = __wk('safeColor');
export const chartSvg = __wk('chartSvg');
export const ganttSvg = __wk('ganttSvg');
export const ganttDomain = __wk('ganttDomain');

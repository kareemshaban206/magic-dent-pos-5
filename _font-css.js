/**
 * Whacka client SDK — _font-css (stub)
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

export const fontFaceBlocks = __wk('fontFaceBlocks');
export const importRefs = __wk('importRefs');
export const normalizeFamily = __wk('normalizeFamily');
export const familyNames = __wk('familyNames');
export const blockFamily = __wk('blockFamily');
export const resolveRef = __wk('resolveRef');
export const blockUrls = __wk('blockUrls');
export const styleClass = __wk('styleClass');
export const weightRange = __wk('weightRange');
export const unicodeRanges = __wk('unicodeRanges');
export const faceKey = __wk('faceKey');
export const blockFaceKey = __wk('blockFaceKey');
export const contentText = __wk('contentText');
export const pickFacesForText = __wk('pickFacesForText');
export const inlineFontFiles = __wk('inlineFontFiles');

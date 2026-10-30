/**
 * Whacka client SDK — _call-shape (stub)
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

export const isPlainObject = __wk('isPlainObject');
export const insertShape = __wk('insertShape');
export const outboxOptions = __wk('outboxOptions');
export const upsertShape = __wk('upsertShape');
export const updateShape = __wk('updateShape');
export const groupIdArg = __wk('groupIdArg');
export const expectArg = __wk('expectArg');
export const batchOpShape = __wk('batchOpShape');
export const readShape = __wk('readShape');
export const groupByAgg = __wk('groupByAgg');

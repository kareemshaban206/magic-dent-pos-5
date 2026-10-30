/**
 * Whacka client SDK — _realtime-share (stub)
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

export const appDataTopic = __wk('appDataTopic');
export const noteChannelStatus = __wk('noteChannelStatus');
export const takeRealtimeDropStat = __wk('takeRealtimeDropStat');
export const onRealtimeResync = __wk('onRealtimeResync');
export const emitResync = __wk('emitResync');
export const createChannelShare = __wk('createChannelShare');
export const makeAppDataListener = __wk('makeAppDataListener');

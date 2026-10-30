/**
 * Whacka client SDK — _live-transport (stub)
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

export const LIVE_EVENT_NAME = __wk('LIVE_EVENT_NAME');
export const readLiveTransport = __wk('readLiveTransport');
export const isSharedTopic = __wk('isSharedTopic');
export const createSeenIds = __wk('createSeenIds');
export const liveEventsToPayloads = __wk('liveEventsToPayloads');
export const diffTopics = __wk('diffTopics');

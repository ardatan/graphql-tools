import { fakeRejectPromise } from '@whatwg-node/promise-helpers';
import { memoize1 } from './memoize.js';

// AbortSignal handler cache to avoid the "possible EventEmitter memory leak detected"
// on Node.js
const getListenersOfAbortSignal = memoize1(function getListenersOfAbortSignal(signal: AbortSignal) {
  const listeners = new Set<EventListener>();
  signal.addEventListener(
    'abort',
    e => {
      for (const listener of listeners) {
        listener(e);
      }
    },
    { once: true },
  );
  return listeners;
});

/**
 * Register an AbortSignal handler for a signal.
 * This helper function mainly exists to work around the
 * "possible EventEmitter memory leak detected. 11 listeners added. Use emitter.setMaxListeners() to increase limit."
 * warning occuring on Node.js
 */
export function registerAbortSignalListener(signal: AbortSignal, listener: () => void) {
  // If the signal is already aborted, call the listener immediately
  if (signal.aborted) {
    listener();
    return;
  }
  getListenersOfAbortSignal(signal).add(listener);
}

export const getAbortPromise = memoize1(function getAbortPromise(signal: AbortSignal) {
  // If the signal is already aborted, return a rejected promise
  if (signal.aborted) {
    return fakeRejectPromise(signal.reason);
  }
  return new Promise<void>((_resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    registerAbortSignalListener(signal, () => {
      reject(signal.reason);
    });
  });
});

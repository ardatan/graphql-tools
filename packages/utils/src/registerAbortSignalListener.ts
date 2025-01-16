import { createDeferred } from './createDeferred.js';
import { fakeRejectPromise } from './fakePromise.js';

const listenersByAbortSignal = new WeakMap<AbortSignal, Set<EventListener>>();
const mainListenerByAbortSignal = new WeakMap<AbortSignal, EventListener>();
const deferredByAbortSignal = new WeakMap<AbortSignal, PromiseWithResolvers<void>>();

function ensureMainListener(signal: AbortSignal) {
  if (mainListenerByAbortSignal.has(signal)) {
    return;
  }
  function mainListener(e: Event) {
    const deferred = deferredByAbortSignal.get(signal);
    deferred?.reject(signal.reason);
    if (deferred) {
      deferredByAbortSignal.delete(signal);
    }
    const listeners = listenersByAbortSignal.get(signal);
    if (listeners != null) {
      for (const listener of listeners) {
        listener(e);
      }
      listenersByAbortSignal.delete(signal);
    }
    mainListenerByAbortSignal.delete(signal);
    signal.removeEventListener('abort', mainListener);
  }
  mainListenerByAbortSignal.set(signal, mainListener);
  signal.addEventListener('abort', mainListener, { once: true });
}

/**
 * Register an AbortSignal handler for a signal.
 * This helper function mainly exists to work around the
 * "possible EventEmitter memory leak detected. 11 listeners added. Use emitter.setMaxListeners() to increase limit."
 * warning occuring on Node.js
 */
export function registerAbortSignalListener(signal: AbortSignal, listener: (e?: Event) => void) {
  // If the signal is already aborted, call the listener immediately
  if (signal.aborted) {
    return listener();
  }
  let listeners = listenersByAbortSignal.get(signal);
  if (listeners == null) {
    listeners = new Set<EventListener>();
    listenersByAbortSignal.set(signal, listeners);
  }
  listeners.add(listener);
}

export function unregisterAbortSignalListener(signal: AbortSignal, listener: (e?: Event) => void) {
  const listeners = listenersByAbortSignal.get(signal);
  if (listeners != null) {
    listeners.delete(listener);
    if (listeners.size === 0) {
      const mainListener = mainListenerByAbortSignal.get(signal);
      if (mainListener != null) {
        signal.removeEventListener('abort', mainListener);
        mainListenerByAbortSignal.delete(signal);
      }
    }
  }
}

export function getAbortPromise(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return fakeRejectPromise(signal.reason);
  }
  ensureMainListener(signal);
  let deferred = deferredByAbortSignal.get(signal);
  if (deferred == null) {
    deferred = createDeferred<void>();
    deferredByAbortSignal.set(signal, deferred);
  }
  return deferred.promise;
}

import debug from 'debug';
import { performance } from 'perf_hooks';

const debugLog = debug('graphql-tools/load');

const times: { [label: string]: number } = {};

/**
 * Starts a timer with a label, similar to `console.time`.
 */
export function time(label: string) {
  times[label] = performance.now();
}

/**
 * Stops a timer with a label then logs to the console, similar to `console.timeEnd`.
 */
export function timeEnd(label: string) {
  if (!times[label]) {
    return;
  }
  const start = times[label];
  const stop = performance.now();
  const duration = stop - start;
  debugLog(`label: ${duration.toFixed(1)}ms`);
  delete times[label];
}

/**
 * Logs an error to the console, if enabled via DEBUG=graphql-tools/load
 */
export function logError(error: string, ...rest: unknown[]) {
  debugLog(`error: ${error}`, ...rest);
}

/**
 * Logs a message to the console, if enabled via DEBUG=graphql-tools/load
 */
export function log(message: string, ...rest: unknown[]) {
  debugLog(message, ...rest);
}

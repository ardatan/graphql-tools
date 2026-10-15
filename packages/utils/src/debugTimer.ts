const debugNamesOngoing = new Set<string>();

/** Cached once: dynamic mid-process `DEBUG` changes are intentionally ignored. */
let cachedDebugEnv: string | undefined;
let debugEnvResolved = false;

function getDebugEnv(): string | undefined {
  if (!debugEnvResolved) {
    cachedDebugEnv = globalThis.process?.env?.['DEBUG'] || (globalThis as any).DEBUG;
    debugEnvResolved = true;
  }
  return cachedDebugEnv;
}

export function debugTimerStart(name: string) {
  const debugEnvVar = getDebugEnv();
  if (debugEnvVar === '1' || debugEnvVar?.includes(name)) {
    debugNamesOngoing.add(name);
    console.time(name);
  }
}

export function debugTimerEnd(name: string) {
  if (debugNamesOngoing.has(name)) {
    console.timeEnd(name);
  }
}

const debugNamesOngoing = new Set<string>();

export function debugTimerStart(name: string) {
  const debugEnvVar = globalThis?.process.env['DEBUG'] || (globalThis as any).DEBUG;
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

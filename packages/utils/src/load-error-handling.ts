import type { Source } from './loaders.js';

export type LoadErrorHandling = 'throw' | 'aggregate' | 'return';

export function toLoadError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function shouldCollectLoadErrors(errorHandling?: LoadErrorHandling): boolean {
  return errorHandling === 'aggregate' || errorHandling === 'return';
}

export function createFailedSource(location: string | undefined, error: unknown): Source {
  return {
    location,
    error: toLoadError(error),
  };
}

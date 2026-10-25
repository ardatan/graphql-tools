export type LoadErrorHandling = 'throw' | 'aggregate' | 'return';

export function toLoadError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function shouldCollectLoadErrors(errorHandling?: LoadErrorHandling): boolean {
  return errorHandling === 'aggregate' || errorHandling === 'return';
}

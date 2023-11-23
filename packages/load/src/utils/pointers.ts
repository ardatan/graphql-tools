import { asArray, debugTimerEnd, debugTimerStart } from '@graphql-tools/utils';
import { UnnormalizedTypeDefPointer } from './../load-typedefs.js';

export function normalizePointers(
  unnormalizedPointerOrPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
) {
  debugTimerStart('@graphql-tools/load: normalizePointers');
  const ignore: string[] = [];
  const pointerOptionMap: Record<string, Record<string, any>> = {};

  const handlePointer = (rawPointer: string, options = {}) => {
    if (rawPointer.startsWith('!')) {
      ignore.push(rawPointer.replace('!', ''));
    } else {
      pointerOptionMap[rawPointer] = options;
    }
  };

  for (const rawPointer of asArray(unnormalizedPointerOrPointers)) {
    debugTimerStart(`@graphql-tools/load: normalizePointers ${rawPointer}`);
    if (typeof rawPointer === 'string') {
      handlePointer(rawPointer);
    } else if (typeof rawPointer === 'object') {
      for (const [path, options] of Object.entries(rawPointer)) {
        handlePointer(path, options);
      }
    } else {
      throw new Error(`Invalid pointer '${rawPointer}'.`);
    }
    debugTimerEnd(`@graphql-tools/load: normalizePointers ${rawPointer}`);
  }
  debugTimerEnd('@graphql-tools/load: normalizePointers');
  return { ignore, pointerOptionMap };
}

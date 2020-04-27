import { asArray } from '@graphql-tools/common';
import { UnnormalizedTypeDefPointer } from './../load-typedefs';

export function normalizePointers(
  unnormalizedPointerOrPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[]
) {
  return asArray(unnormalizedPointerOrPointers).reduce<{ [key: string]: any }>(
    (normalizedPointers, unnormalizedPointer) => {
      if (typeof unnormalizedPointer === 'string') {
        normalizedPointers[unnormalizedPointer] = {};
      } else if (typeof unnormalizedPointer === 'object') {
        Object.assign(normalizedPointers, unnormalizedPointer);
      } else {
        throw new Error(`Invalid pointer ${unnormalizedPointer}`);
      }

      return normalizedPointers;
    },
    {}
  );
}

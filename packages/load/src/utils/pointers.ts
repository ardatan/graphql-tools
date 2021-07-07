import { asArray } from '@graphql-tools/utils';
import { UnnormalizedTypeDefPointer } from './../load-typedefs';

export function normalizePointers(
  unnormalizedPointerOrPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[]
) {
  const ignore: string[] = [];
  const pointerOptionMap = asArray(unnormalizedPointerOrPointers).reduce<{ [key: string]: any }>(
    (normalizedPointers, unnormalizedPointer) => {
      if (typeof unnormalizedPointer === 'string') {
        if (unnormalizedPointer.startsWith('!')) {
          ignore.push(unnormalizedPointer.replace('!', ''));
        } else {
          normalizedPointers[unnormalizedPointer] = {};
        }
      } else if (typeof unnormalizedPointer === 'object') {
        Object.assign(normalizedPointers, unnormalizedPointer);
      } else {
        throw new Error(`Invalid pointer ${unnormalizedPointer}`);
      }

      return normalizedPointers;
    },
    {}
  );
  return { ignore, pointerOptionMap };
}

import { Source, BaseLoaderOptions, Loader, compareStrings, asArray } from '@graphql-tools/utils';
import { normalizePointers } from './utils/pointers.js';
import { applyDefaultOptions } from './load-typedefs/options.js';
import { collectSources, collectSourcesSync } from './load-typedefs/collect-sources.js';
import { parseSource } from './load-typedefs/parse.js';
import { useLimit } from './utils/helpers.js';

const CONCURRENCY_LIMIT = 100;

export type LoadTypedefsOptions<ExtraConfig = { [key: string]: any }> = BaseLoaderOptions &
  ExtraConfig & {
    cache?: { [key: string]: Source[] };
    loaders: Loader[];
    filterKinds?: string[];
    sort?: boolean;
  };

export type UnnormalizedTypeDefPointer = { [key: string]: any } | string;

/**
 * Asynchronously loads any GraphQL documents (i.e. executable documents like
 * operations and fragments as well as type system definitions) from the
 * provided pointers.
 * loadTypedefs does not merge the typeDefs when `#import` is used ( https://github.com/ardatan/graphql-tools/issues/2980#issuecomment-1003692728 )
 * @param pointerOrPointers Pointers to the sources to load the documents from
 * @param options Additional options
 */
export async function loadTypedefs<AdditionalConfig = Record<string, unknown>>(
  pointerOrPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  options: LoadTypedefsOptions<Partial<AdditionalConfig>>
): Promise<Source[]> {
  const { ignore, pointerOptionMap } = normalizePointers(pointerOrPointers);

  options.ignore = asArray(options.ignore || []);
  options.ignore.push(...ignore);

  applyDefaultOptions<AdditionalConfig>(options);

  const sources = await collectSources({
    pointerOptionMap,
    options,
  });

  const validSources: Source[] = [];

  // If we have few k of files it may be an issue
  const limit = useLimit(CONCURRENCY_LIMIT);

  await Promise.all(
    sources.map(partialSource =>
      limit(() =>
        parseSource({
          partialSource,
          options,
          pointerOptionMap,
          addValidSource(source) {
            validSources.push(source);
          },
        })
      )
    )
  );

  return prepareResult({ options, pointerOptionMap, validSources });
}

/**
 * Synchronously loads any GraphQL documents (i.e. executable documents like
 * operations and fragments as well as type system definitions) from the
 * provided pointers.
 * @param pointerOrPointers Pointers to the sources to load the documents from
 * @param options Additional options
 */
export function loadTypedefsSync<AdditionalConfig = Record<string, unknown>>(
  pointerOrPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  options: LoadTypedefsOptions<Partial<AdditionalConfig>>
): Source[] {
  const { ignore, pointerOptionMap } = normalizePointers(pointerOrPointers);

  options.ignore = asArray(options.ignore || []).concat(ignore);

  applyDefaultOptions<AdditionalConfig>(options);

  const sources = collectSourcesSync({
    pointerOptionMap,
    options,
  });

  const validSources: Source[] = [];

  for (const partialSource of sources) {
    parseSource({
      partialSource,
      options,
      pointerOptionMap,
      addValidSource(source) {
        validSources.push(source);
      },
    });
  }

  return prepareResult({ options, pointerOptionMap, validSources });
}

//

function prepareResult({
  options,
  pointerOptionMap,
  validSources,
}: {
  options: any;
  pointerOptionMap: any;
  validSources: Source[];
}) {
  const pointerList = Object.keys(pointerOptionMap);

  if (pointerList.length > 0 && validSources.length === 0) {
    throw new Error(`
      Unable to find any GraphQL type definitions for the following pointers:
        ${pointerList.map(
          p => `
          - ${p}
          `
        )}`);
  }

  return options.sort
    ? validSources.sort((left, right) => compareStrings(left.location, right.location))
    : validSources;
}

import {
  asArray,
  BaseLoaderOptions,
  compareStrings,
  debugTimerEnd,
  debugTimerStart,
  Loader,
  Source,
} from '@graphql-tools/utils';
import { collectSources, collectSourcesSync } from './load-typedefs/collect-sources.js';
import { applyDefaultOptions } from './load-typedefs/options.js';
import { parseSource } from './load-typedefs/parse.js';
import { useLimit } from './utils/helpers.js';
import { normalizePointers } from './utils/pointers.js';

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
  options: LoadTypedefsOptions<Partial<AdditionalConfig>>,
): Promise<Source[]> {
  debugTimerStart('@graphql-tools/load: loadTypedefs');
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
        }),
      ),
    ),
  );

  const result = prepareResult({ options, pointerOptionMap, validSources });

  debugTimerEnd('@graphql-tools/load: loadTypedefs');

  return result;
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
  options: LoadTypedefsOptions<Partial<AdditionalConfig>>,
): Source[] {
  debugTimerStart('@graphql-tools/load: loadTypedefsSync');
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

  const result = prepareResult({ options, pointerOptionMap, validSources });

  debugTimerEnd('@graphql-tools/load: loadTypedefsSync');

  return result;
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
  debugTimerStart('@graphql-tools/load: prepareResult');
  const pointerList = Object.keys(pointerOptionMap);

  if (pointerList.length > 0 && validSources.length === 0) {
    throw new Error(`
      Unable to find any GraphQL type definitions for the following pointers:
        ${pointerList.map(
          p => `
          - ${p}
          `,
        )}`);
  }

  const sortedResult = options.sort
    ? validSources.sort((left, right) => compareStrings(left.location, right.location))
    : validSources;

  debugTimerEnd('@graphql-tools/load: prepareResult');
  return sortedResult;
}

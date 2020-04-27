import { DefinitionNode } from 'graphql';
import { Source, SingleFileOptions, Loader, compareStrings } from '@graphql-tools/utils';
import { normalizePointers } from './utils/pointers';
import { RawModule } from './import-parser';
import { prepareOptions, prepareOptionsSync } from './load-typedefs/options';
import { collectSources, collectSourcesSync } from './load-typedefs/collect-sources';
import { parseSource, parseSourceSync } from './load-typedefs/parse';
import { useLimit } from './utils/helpers';

const CONCURRENCY_LIMIT = 100;

export type LoadTypedefsOptions<ExtraConfig = { [key: string]: any }> = SingleFileOptions &
  ExtraConfig & {
    processedFiles?: Map<string, RawModule[]>;
    cache?: { [key: string]: Source };
    loaders: Loader[];
    filterKinds?: string[];
    ignore?: string | string[];
    sort?: boolean;
    skipGraphQLImport?: boolean;
    forceGraphQLImport?: boolean;
    fs?: typeof import('fs');
    path?: typeof import('path');
    os?: typeof import('os');
  };

export type UnnormalizedTypeDefPointer = { [key: string]: any } | string;

export async function loadTypedefs<AdditionalConfig = {}>(
  pointerOrPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  options: LoadTypedefsOptions<Partial<AdditionalConfig>>
): Promise<Source[]> {
  const pointerOptionMap = normalizePointers(pointerOrPointers);
  const globOptions: any = {};

  await prepareOptions<AdditionalConfig>(options);

  const sources = await collectSources({
    pointerOptionMap,
    options,
  });

  const validSources: Source[] = [];
  const definitionsCacheForImport: DefinitionNode[][] = [];

  // If we have few k of files it may be an issue
  const limit = useLimit(CONCURRENCY_LIMIT);

  await Promise.all(
    sources.map(partialSource =>
      limit(() =>
        parseSource({
          partialSource,
          options,
          globOptions,
          pointerOptionMap,
          addValidSource(source) {
            validSources.push(source);
          },
          cache: definitionsCacheForImport,
        })
      )
    )
  );

  return prepareResult({ options, pointerOptionMap, validSources });
}

export function loadTypedefsSync<AdditionalConfig = {}>(
  pointerOrPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  options: LoadTypedefsOptions<Partial<AdditionalConfig>>
): Source[] {
  const pointerOptionMap = normalizePointers(pointerOrPointers);
  const globOptions: any = {};

  prepareOptionsSync<AdditionalConfig>(options);

  const sources = collectSourcesSync({
    pointerOptionMap,
    options,
  });

  const validSources: Source[] = [];
  const definitionsCacheForImport: DefinitionNode[][] = [];

  sources.forEach(partialSource => {
    parseSourceSync({
      partialSource,
      options,
      globOptions,
      pointerOptionMap,
      addValidSource(source) {
        validSources.push(source);
      },
      cache: definitionsCacheForImport,
    });
  });

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

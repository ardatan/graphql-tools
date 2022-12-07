import {
  Source,
  printSchemaWithDirectives,
  parseGraphQLSDL,
  printWithComments,
  resetComments,
} from '@graphql-tools/utils';
import { filterKind } from '../filter-document-kind.js';
import { time, timeEnd } from '../utils/debug.js';

type Options = any;
type Input = {
  options: Options;
  source: Source;
};
type AddValidSource = (source: Source) => void;
type ParseOptions = {
  partialSource: Source;
  options: any;
  pointerOptionMap: any;
  addValidSource: AddValidSource;
};

export function parseSource({ partialSource, options, pointerOptionMap, addValidSource }: ParseOptions) {
  time(`parseSource ${partialSource.location}`);
  if (partialSource) {
    const input = prepareInput({
      source: partialSource,
      options,
      pointerOptionMap,
    });

    parseSchema(input);
    parseRawSDL(input);

    if (input.source.document) {
      useKindsFilter(input);
      useComments(input);
      collectValidSources(input, addValidSource);
    }
  }
  timeEnd(`parseSource ${partialSource.location}`);
}

//

function prepareInput({
  source,
  options,
  pointerOptionMap,
}: {
  source: Source;
  options: any;
  pointerOptionMap: any;
}): Input {
  let specificOptions = {
    ...options,
  };

  if (source.location) {
    specificOptions = {
      ...specificOptions,
      ...pointerOptionMap[source.location],
    };
  }

  return { source: { ...source }, options: specificOptions };
}

function parseSchema(input: Input) {
  time(`parseSchema ${input.source.location}`);
  if (input.source.schema) {
    input.source.rawSDL = printSchemaWithDirectives(input.source.schema, input.options);
  }
  timeEnd(`parseSchema ${input.source.location}`);
}

function parseRawSDL(input: Input) {
  time(`parseRawSDL ${input.source.location}`);
  if (input.source.rawSDL) {
    input.source.document = parseGraphQLSDL(input.source.location, input.source.rawSDL, input.options).document;
  }
  timeEnd(`parseRawSDL ${input.source.location}`);
}

function useKindsFilter(input: Input) {
  time(`useKindsFilter ${input.source.location}`);
  if (input.options.filterKinds) {
    input.source.document = filterKind(input.source.document, input.options.filterKinds);
  }
}

function useComments(input: Input) {
  time(`useComments ${input.source.location}`);
  if (!input.source.rawSDL && input.source.document) {
    input.source.rawSDL = printWithComments(input.source.document);
    resetComments();
  }
  timeEnd(`useComments ${input.source.location}`);
}

function collectValidSources(input: Input, addValidSource: AddValidSource) {
  time(`collectValidSources ${input.source.location}`);
  if (input.source.document?.definitions && input.source.document.definitions.length > 0) {
    addValidSource(input.source);
  }
  timeEnd(`collectValidSources ${input.source.location}`);
}

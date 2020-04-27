import { Source, printSchemaWithDirectives, fixSchemaAst } from '@graphql-tools/common';
import { printWithComments, resetComments } from '@graphql-tools/schema-merging';
import { Kind, parse, Source as GraphQLSource, DefinitionNode } from 'graphql';
import { isEmptySDL, processImportSyntax, processImportSyntaxSync } from '../import-parser';
import { filterKind } from '../filter-document-kind';

type Options = any;
type Input = {
  options: Options;
  source: Source;
};
type AddValidSource = (source: Source) => void;
type ParseOptions = {
  partialSource: Partial<Source>;
  options: any;
  globOptions: any;
  pointerOptionMap: any;
  addValidSource: AddValidSource;
  cache: DefinitionNode[][];
};

export async function parseSource({
  partialSource,
  options,
  globOptions,
  pointerOptionMap,
  addValidSource,
  cache,
}: ParseOptions) {
  if (partialSource) {
    const input = prepareInput({
      source: partialSource,
      options,
      globOptions,
      pointerOptionMap,
    });

    parseSchema(input);
    parseRawSDL(input);

    if (input.source.document) {
      useKindsFilter(input);
      useComments(input);

      await useGraphQLImport(input, () => processImportSyntax(input.source, input.options, cache));

      collectValidSources(input, addValidSource);
    }
  }
}

export function parseSourceSync({
  partialSource,
  options,
  globOptions,
  pointerOptionMap,
  addValidSource,
  cache,
}: ParseOptions) {
  if (partialSource) {
    const input = prepareInput({
      source: partialSource,
      options,
      globOptions,
      pointerOptionMap,
    });

    parseSchema(input);
    parseRawSDL(input);

    if (input.source.document) {
      useKindsFilter(input);
      useComments(input);

      useGraphQLImport(input, () => processImportSyntaxSync(input.source, input.options, cache));

      collectValidSources(input, addValidSource);
    }
  }
}

//

function prepareInput({
  source,
  options,
  globOptions,
  pointerOptionMap,
}: {
  source: Partial<Source>;
  options: any;
  globOptions: any;
  pointerOptionMap: any;
}): Input {
  const specificOptions = {
    ...options,
    ...(source.location in pointerOptionMap ? globOptions : pointerOptionMap[source.location]),
  };

  return { source: { ...source }, options: specificOptions };
}

function parseSchema(input: Input) {
  if (input.source.schema) {
    input.source.schema = fixSchemaAst(input.source.schema, input.options);
    input.source.rawSDL = printSchemaWithDirectives(input.source.schema, input.options);
  }
}

function parseRawSDL(input: Input) {
  if (input.source.rawSDL) {
    input.source.document = isEmptySDL(input.source.rawSDL)
      ? {
          kind: Kind.DOCUMENT,
          definitions: [],
        }
      : parse(new GraphQLSource(input.source.rawSDL, input.source.location), input.options);
  }
}

function useKindsFilter(input: Input) {
  if (input.options.filterKinds) {
    input.source.document = filterKind(input.source.document, input.options.filterKinds);
  }
}

function useComments(input: Input) {
  if (!input.source.rawSDL) {
    input.source.rawSDL = printWithComments(input.source.document);
    resetComments();
  }
}

function useGraphQLImport(
  input: Input,
  definitionsGetter: () => DefinitionNode[] | Promise<DefinitionNode[]>
): Promise<void> | void {
  if (
    input.options.forceGraphQLImport ||
    (!input.options.skipGraphQLImport && /^\#.*import /i.test(input.source.rawSDL.trimLeft()))
  ) {
    const rewriteDoc = (definitions: DefinitionNode[]) => {
      input.source.document = {
        kind: Kind.DOCUMENT,
        definitions,
      };
    };

    const result = definitionsGetter();

    if (isPromise(result)) {
      return result.then(rewriteDoc);
    }

    rewriteDoc(result);
  }
}

function isPromise<T>(val: T | Promise<T>): val is Promise<T> {
  return val instanceof Promise;
}

function collectValidSources(input: Input, addValidSource: AddValidSource) {
  if (input.source.document.definitions && input.source.document.definitions.length > 0) {
    addValidSource(input.source);
  }
}
